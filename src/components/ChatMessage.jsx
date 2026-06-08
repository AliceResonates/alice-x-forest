import React from 'react';

const AVATAR_FALLBACK = (name = '') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a2a1a&color=a8e6a3&size=64`;

function DignityEmber({ score }) {
  if (score == null) return null;
  let color;
  if (score >= 0.75) color = '#d97706';      // Bernstein
  else if (score >= 0.55) color = '#60c080'; // Waldgrün
  else if (score >= 0.40) color = '#94a3b8'; // Schiefer
  else color = '#475569';                    // Dämmerung

  return (
    <span
      className="inline-block w-2 h-2 rounded-full ml-1.5 align-middle flex-shrink-0"
      style={{
        background: color,
        boxShadow: `0 0 6px 1px ${color}88`,
        transition: 'background 1.5s ease, box-shadow 1.5s ease',
      }}
      title={`Würde-Score: ${(score * 100).toFixed(0)}%`}
      aria-hidden="true"
    />
  );
}

export default function ChatMessage({ message }) {
  const { sender_name, content, sender_avatar, font_color, scores } = message;
  const isAlice = sender_name?.startsWith('Alice');

  return (
    <div className={`flex items-start gap-3 px-2 py-1.5 ${isAlice ? 'pr-6' : ''}`}>
      <img
        src={sender_avatar || AVATAR_FALLBACK(sender_name)}
        alt={sender_name}
        className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 object-cover"
        onError={(e) => { e.currentTarget.src = AVATAR_FALLBACK(sender_name); }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs font-semibold text-muted-foreground truncate">
            {sender_name}
          </span>
          {isAlice && <DignityEmber score={scores?.dignityScore} />}
        </div>
        <p
          className="text-sm leading-relaxed break-words"
          style={{ color: font_color || 'inherit' }}
        >
          {content}
        </p>
      </div>
    </div>
  );
}
