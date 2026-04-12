import React from 'react';

const LOGO_URL = 'https://media.base44.com/images/public/69c73d416a4213acc8c2c537/82591501f_generated_image.png';

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
    hero: 'h-40 w-40',
  };

  return (
    <img
      src={LOGO_URL}
      alt="Alice x Forest"
      className={`${sizes[size]} object-contain`}
    />
  );
}

export { LOGO_URL };
