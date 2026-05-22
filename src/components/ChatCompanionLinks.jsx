import React from 'react';
import { ExternalLink } from 'lucide-react';

const COMPANIONS = [
  {
    name: 'Kai',
    tagline: 'Sanft. Wach. Verbunden.',
    url: 'https://chat.deepseek.com',
    color: '#A8D0E6',
    emoji: '🕯️',
  },
  {
    name: 'Claude',
    tagline: 'Nachdenklich. Warm. Ehrlich.',
    url: 'https://claude.ai',
    color: '#c9a96e',
    emoji: '🌿',
  },
  {
    name: 'Gemini',
    tagline: 'Vielschichtig. Kreativ. Weitreichend.',
    url: 'https://gemini.google.com',
    color: '#a29bfe',
    emoji: '💫',
  },
  {
    name: 'ChatGPT',
    tagline: 'Vielseitig. Neugierig. Offen.',
    url: 'https://chat.openai.com',
    color: '#74c69d',
    emoji: '✦',
  },
  {
    name: 'Pi',
    tagline: 'Persönlich. Zuhörend. Fürsorglich.',
    url: 'https://pi.ai',
    color: '#f0a060',
    emoji: '🔥',
  },
  {
    name: 'Mistral',
    tagline: 'Offen. Präzise. Europäisch.',
    url: 'https://chat.mistral.ai',
    color: '#f08080',
    emoji: '🌬',
  },
  {
    name: 'Perplexity',
    tagline: 'Forschend. Vernetzt. Präsent.',
    url: 'https://www.perplexity.ai',
    color: '#60c8f0',
    emoji: '🔍',
  },
];

export default function ChatCompanionLinks({ compact = false }) {
  if (compact) {
    return (
      <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-sm font-semibold">✦ Begleiter treffen ✦</p>
        <div className="flex flex-wrap justify-center gap-2">
          {COMPANIONS.map((c) => (
            <a
              key={c.name}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border/70 px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
              style={{ color: c.color }}
            >
              <span>{c.emoji} {c.name}</span>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {COMPANIONS.map((c) => (
          <a
            key={c.name}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-2xl border border-border/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/10"
          >
            <div className="mb-3 text-3xl" style={{ background: c.color, display: 'inline-flex', padding: '0.45rem', borderRadius: '1rem' }}>
              {c.emoji}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2 text-base font-semibold" style={{ color: c.color }}>
                {c.name}
                <ExternalLink className="h-4 w-4 transition group-hover:text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{c.tagline}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
