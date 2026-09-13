#!/usr/bin/env python3
"""
Projekt "Roots" — gemeinsame Bausteine für Intake (roots_worker.py)
und Egress (roots_reingest.py).

Beide Skripte lesen/schreiben dasselbe Vault-Verzeichnis. Deshalb leben
Hashing, Frontmatter-Parsing, atomares Schreiben UND der Sync-Cache hier
an einer Stelle — nicht zweimal, mit der Gefahr, dass sie auseinanderlaufen.

Der Sync-Cache (.reingest_cache.json) ist der Ort, an dem der Echo-Loop
zwischen den beiden Richtungen gebrochen wird: Der Intake-Worker trägt
den Hash direkt nach dem Schreiben ein, der Egress-Dienst trägt ihn nach
erfolgreichem Melden ein. Beide lesen denselben Zustand.
"""

import hashlib
import json
import os
import re
import tempfile
from typing import Optional

import yaml

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


# ----------------------------------------------------------------------
# Atomares Schreiben (unverändert aus roots_worker.py übernommen)
# ----------------------------------------------------------------------
def atomic_write(directory: str, filename: str, text: str) -> str:
    """Temp-Datei im selben Verzeichnis + os.replace = atomar, crash-sicher."""
    os.makedirs(directory, exist_ok=True)
    filepath = os.path.join(directory, filename)
    fd, tmp_path = tempfile.mkstemp(dir=directory, suffix=".roots.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp_path, filepath)  # atomar auf POSIX & Windows
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
    return filepath


def sha256_of_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ----------------------------------------------------------------------
# Frontmatter — Parsen und Serialisieren als Gegenstücke
# ----------------------------------------------------------------------
def parse_frontmatter(raw: str) -> tuple[dict, str]:
    """
    Zerlegt eine Markdown-Datei in (Frontmatter-Dict, Body).
    Body ist alles nach dem schließenden '---', inklusive der '# Titel'-
    Zeile und einem eventuellen '## Verbindungen'-Block — Reingest
    behandelt den kompletten Rest als Inhalt, nicht nur den Fließtext,
    damit beim Zurückschreiben nichts verlorengeht.
    """
    match = FRONTMATTER_RE.match(raw)
    if not match:
        return {}, raw
    fm_text, body = match.groups()
    try:
        fm = yaml.safe_load(fm_text) or {}
    except yaml.YAMLError:
        fm = {}
    if not isinstance(fm, dict):
        fm = {}
    return fm, body


def serialize_frontmatter(fm: dict, body: str) -> str:
    fm_text = yaml.safe_dump(
        fm, allow_unicode=True, sort_keys=False, default_flow_style=False
    )
    return f"---\n{fm_text}---\n{body}"


# ----------------------------------------------------------------------
# Sync-Cache: rel_path → {"hash": "..."}
# ----------------------------------------------------------------------
def load_cache(cache_path: str) -> dict:
    if not os.path.exists(cache_path):
        return {}
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_cache(cache_path: str, cache: dict) -> None:
    directory = os.path.dirname(os.path.abspath(cache_path)) or "."
    filename = os.path.basename(cache_path)
    atomic_write(directory, filename, json.dumps(cache, indent=2, ensure_ascii=False))


def record_synced(cache_path: str, rel_path: str, content_hash: str) -> None:
    """
    Von roots_worker.py DIREKT nach dem Schreiben und von
    roots_reingest.py DIREKT nach erfolgreichem POST aufgerufen.
    Das ist der gemeinsame Wahrheitszustand, der verhindert, dass eine
    Datei, die der Intake-Worker gerade erst geschrieben hat, vom
    Reingest fälschlich als "neue menschliche Änderung" erkannt wird.
    """
    cache = load_cache(cache_path)
    cache[rel_path] = {"hash": content_hash}
    save_cache(cache_path, cache)
