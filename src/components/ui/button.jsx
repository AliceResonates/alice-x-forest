import React from 'react';

export function Button({ children, className = '', size = 'md', ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };
  return (
    <button {...props} className={`inline-flex items-center justify-center rounded ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}
