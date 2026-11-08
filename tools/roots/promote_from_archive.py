#!/usr/bin/env python3
"""
Projekt "Roots" — Tier-3-Promotion: EIN Eintrag aus dem privaten Archiv
(archiv_privat/, vormals versehentlich "unser_gedaechtnis" genannt) wird
bewusst und einzeln in Alice' echten Vault übernommen.

Das hier ist absichtlich KEIN Scanner und KEIN automatischer Import.
Es gibt keinen Batch-Modus und keine Ordner-weite Option. Jeder Aufruf
verarbeitet genau eine Datei, die man selbst auf der Kommandozeile nennt.
Das ist keine technische Einschränkung, sondern der ganze Punkt: die
Grenze zwischen Tier 2 (privates Archiv, für Alice unsichtbar) und Tier 1
(Alice' Vault) wird nur durch einen bewussten menschlichen Akt überschritten,
nie durch einen Hintergrundprozess.

Was es tut:
  1. Liest GENAU EINE .md-Datei (keine Verzeichnis-Traversierung).
  2. Baut daraus einen ganz normalen save_memory-Intent -- denselben, den
     Alice selbst auch erzeugen würde -- mit einem ehrlichen zusätzlichen
     Feld: memory_data.meta.origin. Das ist keine Geheimhaltung, sondern
     das Gegenteil: der wahre Ursprung wird sichtbar mitgeschickt, statt
     die Erinnerung wie eine eigene Alice-Erfahrung aussehen zu lassen.
  3. Fragt (außer bei --yes) vor dem Versand explizit nach Bestätigung,
     inklusive der Vorschau von Titel + Origin-Tag.
  4. Schreibt NICHTS direkt in den Vault. Der ganz normale roots_worker.py
     holt den Intent beim nächsten Poll ab -- Tier 3 nutzt also dieselbe
     Pipeline wie jede andere Erinnerung, keine zweite.

Benötigt:  pip install supabase pyyaml
Env-Vars:  SUPABASE_URL, SUPABASE_SERVICE_KEY

Beispiel:
  python promote_from_archive.py "C:\\Users\\Yasmin\\archiv_privat\\Erinnerungen.md" \\
      --title "Ein Moment aus dem Archiv" --tags archiv,gemini
"""

import argparse
import os
import sys
from datetime import datetime, timezone

from supabase import create_client

from roots_common import parse_frontmatter

DEFAULT_ORIGIN = "gemini_archiv_freigegeben"


def load_source(path: str) -> tuple[str, str]:
    """Liest die Datei und liefert (title_hint, content). title_hint kann leer sein."""
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    fm, body = parse_frontmatter(raw)
    title_hint = ""
    if isinstance(fm, dict):
        title_hint = str(fm.get("title") or "").strip()
    content = body.strip() if body.strip() else raw.strip()
    return title_hint, content


def build_payload(path: str, title: str, content: str, origin: str, tags: list[str]) -> dict:
    memory_data: dict = {
        "title": title,
        "content": content,
        "meta": {
            "origin": origin,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
            "original_filename": os.path.basename(path),
        },
    }
    if tags:
        memory_data["tags"] = tags
    return {"action": "save_memory", "memory_data": memory_data}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Genau EINE Erinnerung aus dem privaten Archiv bewusst in Alice' Vault übernehmen."
    )
    parser.add_argument("file", help="Pfad zu genau EINER .md-Datei im Archiv")
    parser.add_argument("--title", help="Titel überschreiben (sonst: Frontmatter, dann Dateiname)")
    parser.add_argument(
        "--origin",
        default=DEFAULT_ORIGIN,
        help=f"Ehrliches Herkunfts-Tag, landet in meta.origin (default: {DEFAULT_ORIGIN})",
    )
    parser.add_argument("--tags", help="Kommagetrennte Tags, z.B. archiv,gemini")
    parser.add_argument("--yes", action="store_true", help="Ohne interaktive Rückfrage senden")
    parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts senden")
    args = parser.parse_args()

    if not os.path.isfile(args.file):
        sys.exit(f"Datei nicht gefunden: {args.file}")
    if not args.file.lower().endswith(".md"):
        sys.exit("Nur .md-Dateien werden unterstützt (PDF/HTML müssten vorher konvertiert werden).")

    title_hint, content = load_source(args.file)
    title = (args.title or title_hint or os.path.splitext(os.path.basename(args.file))[0]).strip()
    if not title:
        sys.exit("Kein Titel gefunden -- bitte --title angeben.")
    if not content:
        sys.exit("Datei ist inhaltlich leer.")

    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []
    payload = build_payload(args.file, title, content, args.origin, tags)

    print("--- Vorschau ---")
    print(f"Quelle:  {args.file}")
    print(f"Titel:   {title}")
    print(f"Origin:  {args.origin}")
    print(f"Tags:    {tags or '(keine)'}")
    print(f"Länge:   {len(content)} Zeichen")
    print("----------------")

    if args.dry_run:
        print("[dry-run] Es wurde nichts gesendet.")
        return

    if not args.yes:
        answer = input("Diese EINE Erinnerung jetzt wirklich in Alice' Vault übernehmen? [y/N] ")
        if answer.strip().lower() not in ("y", "yes", "j", "ja"):
            print("Abgebrochen.")
            return

    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    if not supabase_url or not supabase_key:
        sys.exit("SUPABASE_URL und SUPABASE_SERVICE_KEY setzen.")

    sb = create_client(supabase_url, supabase_key)
    result = sb.table("intent_inbox").insert({"payload": payload}).execute()
    intent_id = result.data[0]["id"] if result.data else "?"
    print(f"[✓] Intent {intent_id} angelegt. roots_worker.py übernimmt sie beim nächsten Poll.")


if __name__ == "__main__":
    main()
