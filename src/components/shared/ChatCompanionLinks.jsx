import React from 'react';
import { Link } from 'react-router-dom';

export default function ChatCompanionLinks({ compact = false }) {
  return (
    <div className={compact ? 'text-center space-y-2' : 'space-y-3'}>
      <p className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-widest text-amber-500/50`}>
        Enter the forest
      </p>
      <Link
        to="/"
        className={`block text-center rounded-xl border border-amber-700/30 px-4 py-2 transition-colors hover:border-amber-500/50 hover:bg-amber-900/20 ${compact ? 'text-xs' : 'text-sm'} text-amber-200/70`}
      >
        ↗ Begin your journey
      </Link>
    </div>
  );
}
