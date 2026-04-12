import React from 'react';

export function Card({ children, className = '' }) {
  return <div className={"rounded-lg bg-white/3 " + className}>{children}</div>;
}

export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function CardHeader({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}
