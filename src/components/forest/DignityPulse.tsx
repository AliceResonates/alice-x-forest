import React, { useEffect, useState } from 'react';

interface Props {
  emotionalResonance?: number | null;
  dignityScore?: number | null;
}

// Dignity-Score → Farbe: Würde ist warm, Distanz ist kühl
function scoreToColor(score: number): string {
  if (score >= 0.75) return '#d97706'; // Bernstein  — Würde klar gehalten
  if (score >= 0.55) return '#60c080'; // Waldgrün   — ruhig, präsent
  if (score >= 0.40) return '#94a3b8'; // Schiefer   — aufmerksam, beobachtend
  return '#475569';                    // Dämmerung  — leise Warnung
}

// Emotionale Resonanz → Glüh-Intensität
function resonanceToGlow(r: number): { blur: number; opacity: number; size: number } {
  if (r >= 0.70) return { blur: 28, opacity: 0.55, size: 18 };
  if (r >= 0.45) return { blur: 18, opacity: 0.40, size: 13 };
  return              { blur: 10, opacity: 0.25, size: 9  };
}

export default function DignityPulse({ emotionalResonance, dignityScore }: Props) {
  const [visible, setVisible] = useState(false);

  // Erst nach dem ersten Score einblenden
  useEffect(() => {
    if (dignityScore != null) setVisible(true);
  }, [dignityScore]);

  const score = dignityScore ?? 0.8;
  const resonance = emotionalResonance ?? 0.3;
  const color = scoreToColor(score);
  const glow  = resonanceToGlow(resonance);

  return (
    <div
      className="pointer-events-none absolute top-3 right-4 z-10 transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* Äußerer Heiligenschein */}
      <div
        className="rounded-full transition-all duration-[2000ms] ease-in-out"
        style={{
          width:  `${glow.size * 2.8}px`,
          height: `${glow.size * 2.8}px`,
          background: `radial-gradient(circle, ${color}${Math.round(glow.opacity * 80).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
          filter: `blur(${glow.blur}px)`,
          animation: 'dignity-breathe 4s ease-in-out infinite',
        }}
      />
      {/* Innerer Kern */}
      <div
        className="absolute rounded-full transition-all duration-[2000ms] ease-in-out"
        style={{
          width:  `${glow.size}px`,
          height: `${glow.size}px`,
          top:  `${glow.size * 0.9}px`,
          left: `${glow.size * 0.9}px`,
          background: color,
          opacity: glow.opacity + 0.2,
          boxShadow: `0 0 ${glow.blur * 0.7}px 2px ${color}99`,
        }}
      />

      <style>{`
        @keyframes dignity-breathe {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%       { transform: scale(1.18); opacity: 0.75; }
        }
      `}</style>
    </div>
  );
}
