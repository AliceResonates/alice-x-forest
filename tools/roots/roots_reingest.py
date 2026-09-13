#!/usr/bin/env python3
"""
Projekt "Roots" — Reingest-Dienst (Vault → Go-Orchestrator).

Gegenstück zu roots_worker.py: Während der Worker Erinnerungen aus der
Queue in den Vault schreibt, beobachtet dieser Dienst den Vault auf
Änderungen — neue oder direkt in Obsidian editierte .md-Dateien — und
meldet sie an den Go-Orchestrator (POST /api/v1/memories/reingest), der
Supabase aktualisiert und bei Bedarf memory_embeddings via pgvector neu befuellt.

Kein zweites Gehirn, kein Duplikat der Wahrheit — nur der Rückweg
desselben Transportprinzips wie roots_worker.py: lesen, hashen, melden.

Benötigt:  pip install requests pyyaml
Env-Vars:  ROOTS_VAULT          (default ./unser_gedaechtnis)
           ROOTS_CACHE          (default <vault>/.reingest_cache.json)
           ROOTS_REINGEST_URL   z.B. http://localhost:8080/api/v1/memories/reingest
           ROOTS_POLL_SECONDS   (default 10, nur im --watch-Modus)
CLI:       --once      einmal scannen, synchronisieren, beenden
           --watch     fortlaufend pollen (Default, wenn nichts angegeben)
           --dry-run   zeigen, was gesendet würde, ohne zu senden
           --vault / --cache / --url / --interval / --logfile   Overrides
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
import time
import uuid
from typing import Iterable, Optional

import requests

from roots_common import (
    atomic_write,
    load_cache,
    parse_frontmatter,
    record_synced,
    serialize_frontmatter,
    sha256_of_text,
)

VAULT_PATH = os.environ.get("ROOTS_VAULT", "./unser_gedaechtnis")
CACHE_PATH = os.environ.get("ROOTS_CACHE", os.path.join(VAULT_PATH, ".reingest_cache.json"))
REINGEST_URL = os.environ.get("ROOTS_REINGEST_URL", "")
POLL_SECONDS = int(os.environ.get("ROOTS_POLL_SECONDS", "10"))

log = logging.getLogger("roots_reingest")


def setup_logging(logfile: Optional[str]) -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if logfile:
        handlers.append(logging.FileHandler(logfile, encoding="utf-8"))
    logging.basicConfig(
        level=logging.INFO,
        format="[Reingest] %(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
        force=True,
    )


def iter_markdown_files(vault: str) -> Iterable[str]:
    """Relative Pfade aller .md-Dateien — versteckte/temporäre Dateien ausgenommen."""
    for root, _dirs, files in os.walk(vault):
        for name in files:
            if not name.endswith(".md"):
                continue
            if name.startswith(".") or ".roots.tmp" in name:
                continue
            full = os.path.join(root, name)
            yield os.path.relpath(full, vault)


def ensure_id(vault: str, rel_path: str, fm: dict, body: str) -> tuple[dict, str, bool]:
    """
    Von Hand in Obsidian angelegte Dateien haben keine 'id'. Wir vergeben
    eine stabile UUID und schreiben sie zurück.

    Das ändert zwangsläufig den Hash der Datei — deshalb gibt diese
    Funktion den NEUEN Rohtext mit zurück, statt den alten weiterzu-
    verwenden: der Aufrufer muss den Cache mit dem Hash NACH der
    Injektion füllen, sonst hält der nächste Scan die eigene Schreib-
    aktion für eine weitere menschliche Änderung.
    """
    if fm.get("id"):
        return fm, serialize_frontmatter(fm, body), False

    fm = dict(fm)
    fm["id"] = str(uuid.uuid4())
    new_raw = serialize_frontmatter(fm, body)

    directory = os.path.join(vault, os.path.dirname(rel_path)) or vault
    filename = os.path.basename(rel_path)
    atomic_write(directory, filename, new_raw)
    log.info("ID vergeben für handangelegte Datei: %s → %s", rel_path, fm["id"])
    return fm, new_raw, True


def build_payload(fm: dict, body: str, content_hash: str) -> dict:
    """
    Was an den Go-Orchestrator geht. Bewusst 1:1 zum save_memory-Vertrag —
    keine neuen Felder erfinden, nur den bestehenden Vertrag rückwärts
    durchlaufen. content_hash geht mit, damit das Backend selbst
    entscheiden kann, ob eine Re-Vektorisierung überhaupt nötig ist
    (z.B. wenn nur ein Tag geändert wurde, nicht der Inhalt).
    """
    payload: dict = {
        "id": fm.get("id"),
        "title": fm.get("title", ""),
        "body": body.strip(),
        "content_hash": content_hash,
    }
    for key in ("tags", "parent", "related", "meta"):
        if fm.get(key):
            payload[key] = fm[key]
    return payload


def sync_once(vault: str, cache_path: str, url: str, dry_run: bool) -> tuple[int, int, int]:
    """Ein Scan-Durchlauf. Gibt (gesendet, übersprungen, fehlgeschlagen) zurück."""
    cache = load_cache(cache_path)
    sent = skipped = failed = 0

    for rel_path in iter_markdown_files(vault):
        full_path = os.path.join(vault, rel_path)
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                raw = f.read()
        except OSError as e:
            log.warning("Konnte %s nicht lesen: %s", rel_path, e)
            failed += 1
            continue

        fm, body = parse_frontmatter(raw)
        fm, raw, id_injected = ensure_id(vault, rel_path, fm, body)
        content_hash = sha256_of_text(raw)

        cached_hash = cache.get(rel_path, {}).get("hash")
        if cached_hash == content_hash:
            skipped += 1
            continue  # synchron — sei es vom Worker, sei es von einem früheren Reingest

        payload = build_payload(fm, body, content_hash)

        if dry_run:
            log.info("[dry-run] würde senden: %s (id=%s)", rel_path, payload["id"])
            sent += 1
            continue

        if not url:
            log.error("Keine ROOTS_REINGEST_URL gesetzt — kann %s nicht senden.", rel_path)
            failed += 1
            continue

        try:
            resp = requests.post(url, json=payload, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            log.warning(
                "Senden fehlgeschlagen für %s: %s — Cache bleibt unverändert, "
                "nächster Scan versucht es erneut.", rel_path, e
            )
            failed += 1
            continue

        # Erst nach bestätigtem Erfolg als synchron markieren — dieselbe
        # Idempotenz-Regel wie beim Intake-Worker: kein optimistisches Caching.
        record_synced(cache_path, rel_path, content_hash)
        log.info("Synchronisiert: %s (id=%s)", rel_path, payload["id"])
        sent += 1

    return sent, skipped, failed


def main() -> None:
    parser = argparse.ArgumentParser(description="Roots Reingest — Vault → Go-Orchestrator")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--once", action="store_true", help="Einmal scannen und beenden")
    mode.add_argument("--watch", action="store_true", help="Fortlaufend pollen (Default)")
    parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nicht senden")
    parser.add_argument("--vault", default=VAULT_PATH)
    parser.add_argument("--cache", default=CACHE_PATH)
    parser.add_argument("--url", default=REINGEST_URL)
    parser.add_argument("--interval", type=int, default=POLL_SECONDS)
    parser.add_argument("--logfile", default=None)
    args = parser.parse_args()

    setup_logging(args.logfile)

    if not args.dry_run and not args.url:
        log.warning("Keine ROOTS_REINGEST_URL/--url gesetzt — erzwinge --dry-run.")
        args.dry_run = True

    log.info("Vault: %s", os.path.abspath(args.vault))
    log.info("Cache: %s", os.path.abspath(args.cache))

    watch = args.watch or not args.once  # Default: watch, wie roots_worker.py

    if not watch:
        sent, skipped, failed = sync_once(args.vault, args.cache, args.url, args.dry_run)
        log.info("Fertig. gesendet=%d, übersprungen=%d, fehlgeschlagen=%d", sent, skipped, failed)
        return

    log.info("Watch-Modus, Intervall %ds. Strg+C zum Beenden.", args.interval)
    try:
        while True:
            sent, skipped, failed = sync_once(args.vault, args.cache, args.url, args.dry_run)
            if sent or failed:
                log.info("Zyklus: gesendet=%d, übersprungen=%d, fehlgeschlagen=%d", sent, skipped, failed)
            time.sleep(args.interval)
    except KeyboardInterrupt:
        log.info("Beendet.")


if __name__ == "__main__":
    main()
