import React, { useRef } from 'react';

function playSequence(notes, audioCtxRef) {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  const ctx = audioCtxRef.current;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.35);
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.35);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.35 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.35 + 2);
    osc.start(ctx.currentTime + i * 0.35);
    osc.stop(ctx.currentTime + i * 0.35 + 2);
  });
}

export default function MemoryBubble({ memory }) {
  const audioCtxRef = useRef(null);
  const color = memory.color || '#a8e6a3';

  return (
    <button
      onClick={() => playSequence(memory.notes, audioCtxRef)}
      className="group flex flex-col items-center gap-1 transition-transform hover:scale-110"
      title={`${memory.title || 'Unnamed melody'} — click to play`}
    >
      {/* Bubble */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 transition-all group-hover:shadow-lg"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${color}55, ${color}15)`,
          boxShadow: `0 0 16px ${color}44`,
        }}
      >
        <span className="text-base">🎵</span>
      </div>
      {/* Author */}
      {memory.author_name && (
        <span className="text-[8px] text-center leading-tight" style={{ color: `${color}99` }}>
          {memory.author_name}
        </span>
      )}
    </button>
  );
}
