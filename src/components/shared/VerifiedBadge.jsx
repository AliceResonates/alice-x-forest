import React from 'react';
import { BadgeCheck } from 'lucide-react';

export default function VerifiedBadge({ className = '' }) {
  return (
    <BadgeCheck className={`w-4 h-4 text-primary inline-block ${className}`} />
  );
}
