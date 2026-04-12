import React from 'react';
import { Megaphone } from 'lucide-react';

export default function AdBanner({ slot = 'feed' }) {
  return (
    <div className="border border-border/50 rounded-xl bg-secondary/30 p-4 flex items-center justify-center gap-2 text-muted-foreground text-xs">
      <Megaphone className="w-4 h-4" />
      <span>Anzeigenplatz — {slot}</span>
      {/* Ad plugin integration point */}
      <div id={`ad-slot-${slot}`} className="hidden" />
    </div>
  );
}
