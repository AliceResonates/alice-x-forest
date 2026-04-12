import React from 'react';

export default function AvatarDisplay({ name, size = 'sm', src }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  const className = `${sizes[size] || sizes.sm} rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700`;
  const initials = name ? name.split(' ').map(s => s[0]).join('').slice(0,2).toUpperCase() : 'U';
  return (
    src ? <img src={src} alt={name} className={className} /> : <div className={className}>{initials}</div>
  );
}
