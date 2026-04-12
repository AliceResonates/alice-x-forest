import React from 'react';
import { Bot, User } from 'lucide-react';

export default function AvatarDisplay({ src, name, type = 'human', size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const cls = `${sizes[size] || sizes.md} rounded-full overflow-hidden flex items-center justify-center bg-gray-100 text-gray-700`;

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  if (src) {
    return <img src={src} alt={name} className={cls} />;
  }

  return (
    <div className={cls}>
      {type === 'ai_agent' ? <Bot className="w-5 h-5 text-gray-600" /> : <span className="font-medium">{initials}</span>}
    </div>
  );
}
