"""
Integrationstest für roots_reingest.py, mit echtem lokalem HTTP-Server
statt des Go-Orchestrators. Prüft genau die Punkte, die im Design am
meisten Sorge gemacht haben:

  1. Echo-Loop: Was der Intake-Worker gerade geschrieben hat, wird vom
     Reingest NICHT erneut gemeldet.
  2. Menschliche Neuanlage ohne 'id' bekommt eine UUID, OHNE dass die
     Injektion selbst eine zweite, überflüssige Meldung auslöst.
  3. Eine echte inhaltliche Änderung wird erkannt und gesendet.
  4. Ein fehlgeschlagener POST lässt den Cache unverändert (Retry-Fähigkeit).
  5. --dry-run sendet nichts, verändert aber auch den Cache nicht.
"""

import json
import os
import shutil
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(__file__))
import roots_reingest as ri
from roots_common import load_cache, sha256_of_text


RECEIVED = []


class MockHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        RECEIVED.append(json.loads(body))
        if getattr(self.server, "fail_next", False):
            self.server.fail_next = False
            self.send_response(500)
            self.end_headers()
            return
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):  # Testausgabe ruhig halten
        pass


def start_mock_server():
    server = HTTPServer(("127.0.0.1", 0), MockHandler)
    server.fail_next = False
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_port}/api/v1/memories/reingest"


def write_worker_style(vault, filename, fm_extra="", body="Testinhalt."):
    """Simuliert, was roots_worker.py schreiben würde, INKLUSIVE Cache-Eintrag."""
    text = f"---\nid: worker-generated-001\ntitle: Vom Worker\n{fm_extra}---\n\n# Vom Worker\n\n{body}\n"
    path = os.path.join(vault, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    from roots_common import record_synced
    record_synced(os.path.join(vault, ".reingest_cache.json"), filename, sha256_of_text(text))
    return text


def main():
    vault = tempfile.mkdtemp(prefix="roots_vault_")
    cache_path = os.path.join(vault, ".reingest_cache.json")
    server, url = start_mock_server()

    try:
        # ---- Test 1: Echo-Loop -------------------------------------
        write_worker_style(vault, "vom_worker.md")
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert sent == 0, f"Echo-Loop! Worker-Datei wurde gesendet (sent={sent})"
        assert skipped == 1
        print("[✓] Test 1: Frisch vom Worker geschriebene Datei wird NICHT erneut gemeldet.")

        # ---- Test 2: Menschliche Neuanlage ohne ID ------------------
        manual_path = os.path.join(vault, "handangelegt.md")
        with open(manual_path, "w", encoding="utf-8") as f:
            f.write("---\ntitle: Von Hand in Obsidian\n---\n\n# Von Hand\n\nEigener Text.\n")

        RECEIVED.clear()
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert sent == 1, f"Erwartet: 1 gesendet, war: {sent}"
        assert RECEIVED[0]["id"], "ID fehlt im gesendeten Payload"
        assert RECEIVED[0]["title"] == "Von Hand in Obsidian"
        print(f"[✓] Test 2: Handangelegte Datei bekam ID {RECEIVED[0]['id'][:8]}… und wurde gemeldet.")

        # Sofortiger zweiter Scan: darf NICHT erneut senden (ID-Injektion selbst
        # darf keine zweite Meldung auslösen)
        RECEIVED.clear()
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert sent == 0, f"ID-Injektion hat einen Doppel-Versand ausgelöst! sent={sent}"
        print("[✓] Test 2b: Kein Doppel-Versand nach der eigenen ID-Injektion.")

        # ---- Test 3: Echte inhaltliche Änderung ----------------------
        with open(manual_path, "a", encoding="utf-8") as f:
            f.write("\nNoch ein Satz dazu.\n")
        RECEIVED.clear()
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert sent == 1, f"Echte Änderung wurde nicht erkannt! sent={sent}"
        print("[✓] Test 3: Echte inhaltliche Änderung wird erkannt und gesendet.")

        # ---- Test 4: Fehlgeschlagener POST verschmutzt den Cache nicht
        with open(manual_path, "a", encoding="utf-8") as f:
            f.write("\nNoch mehr Text.\n")
        server.fail_next = True
        cache_before = load_cache(cache_path)
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert failed == 1 and sent == 0
        cache_after = load_cache(cache_path)
        assert cache_before == cache_after, "Cache wurde trotz Fehlschlag verändert!"
        # Nächster Versuch (ohne Fehler) muss die Datei erneut versuchen
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=False)
        assert sent == 1, "Kein automatischer Retry nach vorherigem Fehler"
        print("[✓] Test 4: Fehlgeschlagener POST verschmutzt den Cache nicht, Retry funktioniert.")

        # ---- Test 5: --dry-run sendet nichts, Cache bleibt stabil ----
        with open(manual_path, "a", encoding="utf-8") as f:
            f.write("\nDry-Run-Änderung.\n")
        RECEIVED.clear()
        cache_before = load_cache(cache_path)
        sent, skipped, failed = ri.sync_once(vault, cache_path, url, dry_run=True)
        assert sent == 1  # "würde senden", zählt aber nicht als echter POST
        assert len(RECEIVED) == 0, "dry-run hat trotzdem einen echten POST ausgelöst!"
        cache_after = load_cache(cache_path)
        assert cache_before == cache_after, "dry-run hat den Cache verändert!"
        print("[✓] Test 5: --dry-run sendet nichts und verändert den Cache nicht.")

        print("\nAlle Integrationstests bestanden. ✓")

    finally:
        server.shutdown()
        shutil.rmtree(vault, ignore_errors=True)


if __name__ == "__main__":
    main()
