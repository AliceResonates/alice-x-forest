import React, { useState, useEffect } from "react";
import EchoLayer from "./EchoLayer";
import Logo from "../layout/Logo";
import SeasonBadge from "../layout/SeasonBadge";

interface ForestEntryProps {
  onSessionReady: (sessionId: string) => void;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3000";

export default function ForestEntry({ onSessionReady }: ForestEntryProps) {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [appeared, setAppeared] = useState(false);

  // Sanftes Einblenden beim ersten Render
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 80);
    return () => clearTimeout(t);
  }, []);

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleStart();
  }

  const ready = zip.length === 5 && !loading;

  return (
    <div
      className="relative flex flex-col min-h-[72vh] rounded-2xl overflow-hidden border border-border/40 bg-card"
      style={{
        opacity: appeared ? 1 : 0,
        transform: appeared ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}
    >
      {/* Waldhintergrund */}
      <EchoLayer />

      {/* Jahreszeit-Badge */}
      <div className="absolute top-4 right-4 z-10">
        <SeasonBadge />
      </div>

      {/* Zentrierter Inhalt */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-8 py-16 gap-8">

        {/* Logo */}
        <div
          style={{
            filter: "drop-shadow(0 0 24px hsl(145 40% 42% / 0.35))",
            transition: "filter 1.5s ease",
          }}
        >
          <Logo size="xl" />
        </div>

{/* Title & Tagline */}
<div className="text-center space-y-2">
  <h1 className="text-2xl font-semibold tracking-wide text-foreground/90">
    Alice&thinsp;×&thinsp;Forest
  </h1>
  <p className="text-sm text-muted-foreground/80 italic max-w-xs leading-relaxed">
    A quiet companion.&ensp;Always close.
  </p>
</div>

{/* Location Input */}
<div className="flex flex-col items-center gap-2 w-full max-w-[13rem]">
  <label
    htmlFor="zip-input"
    className="text-[11px] uppercase tracking-widest text-muted-foreground/60 select-none"
  >
    Your Location
  </label>
  <input
    id="zip-input"
    type="text"
    inputMode="numeric"
    maxLength={5}
    placeholder="12345"
    value={zip}
    onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
    onKeyDown={handleKeyDown}
    autoFocus
    className="w-full bg-transparent border-b border-border/60 focus:border-primary/70 text-center text-2xl tracking-[0.4em] text-foreground/90 placeholder:text-muted-foreground/25 focus:outline-none transition-colors duration-500 pb-1"
  />
</div>

{/* CTA */}
<button
  onClick={handleStart}
  disabled={!ready}
  className="group relative px-8 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-500 bg-primary/20 border border-primary/30 text-primary/80 hover:bg-primary/35 hover:border-primary/60 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary/40"
  style={ready ? { boxShadow: "0 0 20px hsl(145 40% 42% / 0.2)" } : undefined}
>
  <span className={loading ? "opacity-0" : ""}>
    Enter the Forest&ensp;↗
  </span>
  {loading && (
    <span className="absolute inset-0 flex items-center justify-center text-primary/60 animate-pulse">
      Seeking path …
    </span>
  )}
</button>

        {/* Drei Punkte — Orientierungshilfe */}
        <p className="text-[10px] text-muted-foreground/35 tracking-widest select-none">
          · · ·
        </p>
      </div>
    </div>
  );
}
