import React from 'react';

export default function EntityTypeBadge({ type }) {
  if (!type) return null;
  const label = type === 'ai_agent' ? 'AI' : 'Human';
  return (
    <span className="text-[11px] text-muted-foreground bg-muted px-1 rounded ml-1">{label}</span>
  );
}
