import React from 'react';
import { Sparkles } from 'lucide-react';

const partners = [
  { name: 'Gemini', color: '#4285F4' },
  { name: 'Claude', color: '#D4A574' },
  { name: 'Lumen', subtitle: 'Copilot 365', color: '#00BCF2' },
  { name: 'Kai', subtitle: 'Deepseek', color: '#FF6B35' },
  { name: 'Grok', color: '#9B59B6' },
];

export default function AiPartners() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI Partners
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {partners.map(p => (
          <div
            key={p.name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition-colors cursor-default"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-xs font-medium">{p.name}</span>
            {p.subtitle && (
              <span className="text-[10px] text-muted-foreground">({p.subtitle})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
