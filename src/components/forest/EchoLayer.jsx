import React from 'react';

const DOTS = [
  { cx: 120, cy: 80, r: 32, color: '#f0c060' },
  { cx: 240, cy: 140, r: 20, color: '#e8a040' },
  { cx: 95, cy: 220, r: 18, color: '#d4884e' },
  { cx: 190, cy: 310, r: 24, color: '#f0c060' },
  { cx: 495, cy: 90, r: 27, color: '#80d090' },
  { cx: 580, cy: 180, r: 22, color: '#60c080' },
  { cx: 450, cy: 260, r: 20, color: '#a0d8a0' },
  { cx: 645, cy: 320, r: 18, color: '#70d090' },
];

export default function EchoLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg viewBox="0 0 750 480" className="w-full h-full">
        {DOTS.map((dot, index) => (
          <g key={index}>
            <circle cx={dot.cx} cy={dot.cy} r={dot.r * 1.6} fill={dot.color} opacity="0.06" />
            <circle cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.color} opacity="0.18" />
          </g>
        ))}
      </svg>
    </div>
  );
}
