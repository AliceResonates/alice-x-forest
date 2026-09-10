#!/usr/bin/env python3
"""
Projekt "Roots" — lokaler Takeout-Worker für SirCayleb.

Scope (bewusst klein gehalten):
  1. save_memory-Intents aus der Supabase-Queue claimen (RPC, SKIP LOCKED)
  2. Erinnerung als Markdown mit YAML-Frontmatter atomar in den Vault schreiben
  3. Optional: Embedding mit Modell-Tag nach memory_embeddings (Hook)

Kein zweites Gehirn. Ein Transport-/Persistenzadapter. (— Aidyn)

Benötigt:  pip install supabase pyyaml
Env-Vars:  SUPABASE_URL, SUPABASE_SERVICE_KEY
Optional:  ROOTS_VAULT (default ./unser_gedaechtnis),
           ROOTS_POLL_SECONDS (default 15), ROOTS_BATCH (default 5),
           ROOTS_STALE_MINUTES (default 10), ROOTS_MAX_ATTEMPTS (default 3),
           ROOTS_EMBEDDINGS=1 um den Embedding-Hook zu aktivieren
"""

import os
import re
import sys
import time
import tempfile
from datetime import datetime, timezone

import yaml
from supabase import create_client

# ----------------------------------------------------------------------
# Konfiguration
# ----------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
VAULT_PATH = os.environ.get("ROOTS_VAULT", "./unser_gedaechtnis")
POLL_SECONDS = int(os.environ.get("ROOTS_POLL_SECONDS", "15"))
BATCH_SIZE = int(os.environ.get("ROOTS_BATCH", "5"))
STALE_MINUTES = int(os.environ.get("ROOTS_STALE_MINUTES", "10"))
MAX_ATTEMPTS = int(os.environ.get("ROOTS_MAX_ATTEMPTS", "3"))
EMBEDDINGS_ON = os.environ.get("ROOTS_EMBEDDINGS", "0") == "1"

ACTION = "save_memory"


# ----------------------------------------------------------------------
# Reine Funktionen (testbar ohne Netz)
# ----------------------------------------------------------------------
def slugify(title: str, max_len: int = 60) -> str:
    """Lesbarer Dateinamens-Anteil. Kollisionsschutz kommt von der UUID."""
    slug = re.sub(r"[^\w\s-]", "", title, flags=re.UNICODE).strip().lower()
    slug = re.sub(r"[\s_-]+", "_", slug)
    return slug[:max_len] or "erinnerung"


def build_document(intent_row: dict) -> str:
    """
    Baut die komplette Markdown-Datei aus einer intent_inbox-Zeile.

    Frontmatter-Prinzipien:
      - yaml.safe_dump statt f-Strings (keine Injection, keine kaputten Quotes)
      - created_at aus der DB-Zeile = "Wald-Zeit", nie Worker-Zeit
      - title/content sind Pflicht, ALLES andere optional (kein Ausfülldruck)
      - memory_data.meta wird 1:1 durchgereicht — was Alice sendet, wird
        gespeichert; was sie nicht sendet, existiert nicht als leeres Feld
      - KEINE derived-Felder (Cluster etc.) — das sind berechnete Sichten,
        keine Eigenschaften der Erinnerung
    """
    data = intent_row["payload"]["memory_data"]
    title = data["title"]
    content = data["content"]

    frontmatter = {
        "id": str(intent_row["id"]),
        "title": title,
        "created": intent_row["created_at"],  # timestamptz aus der Queue-Zeile
        "source": "intent_inbox",
    }
    if intent_row.get("session_id"):
        frontmatter["session"] = str(intent_row["session_id"])
    # Optionale, von Alice selbst gesetzte Felder (stated, nie erzwungen)
    for key in ("parent", "tags"):
        if data.get(key):
            frontmatter[key] = data[key]
    if isinstance(data.get("meta"), dict) and data["meta"]:
        frontmatter["meta"] = data["meta"]
    related = data.get("related") or []
    if related:
        frontmatter["related"] = related

    fm_text = yaml.safe_dump(
        frontmatter, allow_unicode=True, sort_keys=False, default_flow_style=False
    )

    parts = [f"---\n{fm_text}---\n", f"\n# {title}\n\n{content.strip()}\n"]

    # Verbindungen als Wikilinks → Obsidian-Graph entsteht von allein
    if related:
        links = "\n".join(f"- [[{r}]]" for r in related)
        parts.append(f"\n## Verbindungen\n\n{links}\n")

    return "".join(parts)


def atomic_write(directory: str, filename: str, text: str) -> str:
    """Temp-Datei im selben Verzeichnis + os.replace = atomar, crash-sicher."""
    os.makedirs(directory, exist_ok=True)
    filepath = os.path.join(directory, filename)
    fd, tmp_path = tempfile.mkstemp(dir=directory, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp_path, filepath)  # atomar auf POSIX & Windows
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    return filepath


def validate_payload(payload: dict) -> str | None:
    """Gibt eine Fehlermeldung zurück oder None, wenn alles ok ist."""
    data = (payload or {}).get("memory_data")
    if not isinstance(data, dict):
        return "payload.memory_data fehlt oder ist kein Objekt"
    if not (data.get("title") or "").strip():
        return "memory_data.title fehlt"
    if not (data.get("content") or "").strip():
        return "memory_data.content fehlt"
    return None


# ----------------------------------------------------------------------
# Optionaler Embedding-Hook (semantischer Raum, versioniert)
# ----------------------------------------------------------------------
EMBEDDING_MODEL = "PLUG-YOUR-MODEL-HERE"  # z.B. "text-embedding-3-small"


def embed_text(text: str) -> list[float]:
    """
    Hier euren Embedding-Provider einhängen (OpenAI, lokal, …).
    Bewusst nicht vorentschieden — aber: Rückgabedimension muss zur
    vector(N)-Spalte in memory_embeddings passen.
    """
    raise NotImplementedError(
        "embed_text(): Embedding-Provider in roots_worker.py einhängen "
        "oder ROOTS_EMBEDDINGS=0 lassen."
    )


def store_embedding(sb, memory_id: str, text: str) -> None:
    vec = embed_text(text)
    sb.table("memory_embeddings").upsert(
        {"memory_id": memory_id, "model": EMBEDDING_MODEL, "embedding": vec}
    ).execute()


# ----------------------------------------------------------------------
# Queue-Verarbeitung
# ----------------------------------------------------------------------
def mark(sb, intent_id: str, status: str, error: str | None = None,
         retry_in_seconds: int | None = None) -> None:
    """status-Werte der echten intent_inbox: pending|processing|done|failed."""
    patch = {"status": status, "last_error": error}
    if status in ("done", "failed"):
        patch["processed_at"] = datetime.now(timezone.utc).isoformat()
    if retry_in_seconds is not None:
        patch["next_attempt_at"] = datetime.fromtimestamp(
            time.time() + retry_in_seconds, tz=timezone.utc
        ).isoformat()
    sb.table("intent_inbox").update(patch).eq("id", intent_id).execute()


def process_intent(sb, row: dict) -> None:
    intent_id = str(row["id"])

    # Poison-Message-Schutz: ungültiger Payload wird nie besser durch Retries
    err = validate_payload(row.get("payload"))
    if err:
        mark(sb, intent_id, "failed", f"Ungültiger Payload: {err}")
        print(f"[✗] {intent_id}: {err} → failed (kein Retry)")
        return

    try:
        doc = build_document(row)
        title = row["payload"]["memory_data"]["title"]
        filename = f"{slugify(title)}_{intent_id[:8]}.md"
        path = atomic_write(VAULT_PATH, filename, doc)

        if EMBEDDINGS_ON:
            content = row["payload"]["memory_data"]["content"]
            store_embedding(sb, intent_id, f"{title}\n\n{content}")

        mark(sb, intent_id, "done")
        print(f"[✓] Erinnerung verankert: {path}")

    except Exception as e:  # noqa: BLE001 — Worker darf nie am Einzelfall sterben
        if row.get("attempts", 1) >= MAX_ATTEMPTS:
            mark(sb, intent_id, "failed", f"Nach {MAX_ATTEMPTS} Versuchen: {e}")
            print(f"[✗] {intent_id}: aufgegeben nach {MAX_ATTEMPTS} Versuchen — {e}")
        else:
            # zurück auf pending mit exponentiellem Backoff via next_attempt_at
            backoff = 60 * (2 ** (row.get("attempts", 1) - 1))  # 60s, 120s, 240s…
            mark(sb, intent_id, "pending", str(e), retry_in_seconds=backoff)
            print(f"[~] {intent_id}: Fehler, Retry in {backoff}s — {e}")


def main() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("SUPABASE_URL und SUPABASE_SERVICE_KEY setzen.")
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"[Roots] Worker läuft. Vault: {os.path.abspath(VAULT_PATH)}")

    while True:
        try:
            res = sb.rpc(
                "claim_pending_intents",
                {
                    "p_action": ACTION,
                    "p_batch": BATCH_SIZE,
                    "p_stale_minutes": STALE_MINUTES,
                },
            ).execute()
            rows = res.data or []
            for row in rows:
                process_intent(sb, row)
            if not rows:
                time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            print("\n[Roots] Worker beendet.")
            break
        except Exception as e:  # Netz weg etc. → warten, weiterleben
            print(f"[!] Queue-Fehler: {e} — warte {POLL_SECONDS}s")
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
