import React, { useState } from "react";

interface ForestEntryProps {
  onSessionReady: (sessionId: string) => void;
}

export default function ForestEntry({ onSessionReady }: ForestEntryProps) {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3000";

  async function handleStart() {
    if (!/^\d{5}$/.test(zip)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_zip: zip }),
      });
      const { session_id } = res.ok ? await res.json() : { session_id: "" };
      onSessionReady(session_id ?? "");
    } catch {
      onSessionReady("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder="PLZ eingeben"
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
        className="border rounded px-3 py-2 w-40 text-center text-lg"
      />
      <button
        onClick={handleStart}
        disabled={loading || zip.length !== 5}
        className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "…" : "Chat starten"}
      </button>
    </div>
  );
}
