import React, { useRef, useState } from 'react';

// Harp notes — pentatonic scale for a magical forest feel
const HARP_NOTES = [
  { name: 'C4', freq: 261.63, label: 'C', color: '#f0e8a0' },
  { name: 'D4', freq: 293.66, label: 'D', color: '#f0c878' },
  { name: 'E4', freq: 329.63, label: 'E', color: '#e8a850' },
  { name: 'G4', freq: 392.0, label: 'G', color: '#c8d890' },
  { name: 'A4', freq: 440.0, label: 'A', color: '#a8e8b0' },
  { name: 'C5', freq: 523.25, label: 'C′', color: '#88d8d0' },
  { name: 'D5', freq: 587.33, label: 'D′', color: '#98b8f0' },
  { name: 'E5', freq: 659.25, label: 'E′', color: '#b898e0' },
  { name: 'G5', freq: 783.99, label: 'G′', color: '#d888c0' },
  { name: 'A5', freq: 880.0, label: 'A′', color: '#f088a0' },
];

function playHarpNote(freq, audioCtx) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Harp-like: triangle wave + fast attack, slow decay
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 2.5);
}

export default function HarpStrings({ onNotePlay }) {
  const audioCtxRef = useRef(null);
  const [activeNote, setActiveNote] = useState(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const handlePlay = (note) => {
    const ctx = getAudioCtx();
    playHarpNote(note.freq, ctx);
    setActiveNote(note.name);
    setTimeout(() => setActiveNote(null), 400);
    onNotePlay(note);
  };

  return (
    <div className="relative flex items-end justify-center gap-1 h-64 w-full max-w-sm mx-auto select-none">
      {/* Harp frame */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        {/* Curved neck */}
        <svg viewBox="0 0 260 240" className="absolute inset-0 w-full h-full opacity-40">
          <path
            d="M30,230 Q30,20 200,10"
            stroke="#c9a96e"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {/* Base */}
          <rect x="15" y="220" width="30" height="14" rx="4" fill="#a07840" />
        </svg>
      </div>

      {/* Strings */}
      {HARP_NOTES.map((note, i) => {
        const isActive = activeNote === note.name;
        const heightPct = 85 - i * 6;
        return (
          <button
            key={note.name}
            onClick={() => handlePlay(note)}
            className="relative flex flex-col items-center justify-end group"
            style={{ height: '100%' }}
          >
            <div
              className="rounded-full transition-all duration-75 cursor-pointer"
              style={{
                width: isActive ? '4px' : '2px',
                height: `${heightPct}%`,
                background: isActive
                  ? `radial-gradient(ellipse, white, ${note.color})`
                  : `linear-gradient(to bottom, ${note.color}88, ${note.color})`,
                boxShadow: isActive ? `0 0 12px 4px ${note.color}` : `0 0 4px ${note.color}44`,
                transform: isActive ? 'scaleX(1.5)' : 'scaleX(1)',
              }}
            />
            <span
              className="mt-1 text-[9px] font-medium transition-opacity"
              style={{ color: note.color, opacity: isActive ? 1 : 0.5 }}
            >
              {note.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
