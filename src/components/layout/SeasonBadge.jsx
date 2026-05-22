import React, { useState } from 'react';
import { getCurrentSeason, SEASONS } from '@/lib/seasonTheme';

export default function SeasonBadge() {
  const [visible, setVisible] = useState(false);
  const season = getCurrentSeason();
  const theme = SEASONS[season];

  return (
    <div className="relative">
      <button
        onClick={() => setVisible(v => !v)}
        className="text-lg transition-transform hover:scale-110"
        title={`${theme.label} — ${theme.description}`}
        aria-label="Current season"
      >
        {theme.emoji}
      </button>

      {visible && (
        <div
          className="absolute right-0 top-8 z-50 rounded-xl border border-border/60 p-3 w-44 space-y-1 shadow-lg text-xs"
          style={{ background: 'hsl(var(--card))' }}
        >
          <p className="font-semibold text-foreground">{theme.emoji} {theme.label}</p>
          <p className="text-muted-foreground leading-snug italic">{theme.description}</p>
          <div
            className="mt-2 h-1 w-full rounded-full"
            style={{ background: `hsl(var(--primary))`, opacity: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}
