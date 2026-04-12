import React, { useState, useEffect } from 'react';
import { base44 } from '../../api/base44Client';

const MOOD_COLORS = {
  positiv:    { bar: '#4ade80', label: 'text-green-400' },
  neutral:    { bar: '#a3a3a3', label: 'text-zinc-400' },
  nachdenklich: { bar: '#60a5fa', label: 'text-blue-400' },
  melancholisch: { bar: '#818cf8', label: 'text-indigo-400' },
  aufgeregt:  { bar: '#fb923c', label: 'text-orange-400' },
  traurig:    { bar: '#94a3b8', label: 'text-slate-400' },
  wütend:     { bar: '#f87171', label: 'text-red-400' },
  humorvoll:  { bar: '#facc15', label: 'text-yellow-400' },
};

// intensity 1–10 → bar width 20%–95%
function intensityToWidth(intensity) {
  const clamped = Math.max(1, Math.min(10, intensity || 5));
  return 20 + clamped * 7.5;
}

function localAnalyse(text) {
  const t = (text || '').toLowerCase();
  const positives = ['gut','gutem','glücklich','happy','love','love','awesome','toll','super'];
  const negatives = ['schlecht','traurig','wütend','hate','angry','sad','upset'];
  let score = 0;
  positives.forEach(w => { if (t.includes(w)) score += 1; });
  negatives.forEach(w => { if (t.includes(w)) score -= 1; });
  const mood = score > 1 ? 'positiv' : score < -1 ? 'traurig' : 'neutral';
  const intensity = Math.min(10, Math.max(1, Math.abs(score) + 3));
  const label = mood === 'positiv' ? 'Positiv gestimmt' : mood === 'traurig' ? 'Traurig' : 'Neutral'
  return { mood, intensity, label };
}

export default function MoodBarometer({ text, autoStart = false, prompt = null, responseSchema = null, onlyPremium = false, isPremium = false }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | done
  const [result, setResult] = useState(null);
  const [animWidth, setAnimWidth] = useState(0);

  useEffect(() => {
    if (autoStart && text) {
      analyse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const analyse = async () => {
    setPhase('loading');
    setAnimWidth(0);
    setResult(null);

    // Try to call LLM via base44 integration if available
    let res = null;
    try {
      if (base44.integrations && base44.integrations.Core && typeof base44.integrations.Core.InvokeLLM === 'function') {
        const usedPrompt = prompt || `Analysiere die Stimmung dieses Textes kurz und präzise.\nText: "${text}"\n\nAntworte NUR mit JSON, kein Kommentar:\n{\n  "mood": "<eine dieser Optionen: positiv, neutral, nachdenklich, melancholisch, aufgeregt, traurig, wütend, humorvoll>",\n  "intensity": <Zahl 1-10, wie emotional ist der Text>,\n  "label": "<2-4 Wörter deutsche Beschreibung>"\n}`;
        const usedSchema = responseSchema || {
          type: 'object',
          properties: { mood: { type: 'string' }, intensity: { type: 'number' }, label: { type: 'string' } }
        };

        res = await base44.integrations.Core.InvokeLLM({
          prompt: usedPrompt,
          response_json_schema: usedSchema,
        });
      }
    } catch (e) {
      res = null;
    }

    if (!res) {
      res = localAnalyse(text);
    }

    setResult(res);
    setPhase('done');
    // animate bar to final width
    const target = intensityToWidth(res.intensity);
    let w = 0;
    const step = () => {
      w += 2;
      if (w >= target) { setAnimWidth(target); return; }
      setAnimWidth(w);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (phase === 'idle') return null;

  const color = result ? (MOOD_COLORS[result.mood] || MOOD_COLORS.neutral) : null;
  const targetWidth = result ? intensityToWidth(result.intensity) : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Track */}
      <div className="relative flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        {phase === 'loading' && (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/60 animate-pulse"
            style={{
              width: '40%',
              animation: 'barometer-scan 1.4s ease-in-out infinite alternate',
            }}
          />
        )}
        {phase === 'done' && color && (
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${animWidth}%`, backgroundColor: color.bar }}
          />
        )}
      </div>

      {/* Label */}
      <span
        className={`text-[10px] font-medium whitespace-nowrap transition-opacity duration-500 ${
          phase === 'done' ? 'opacity-100' : 'opacity-0'
        } ${color?.label || ''}`}
      >
        {result?.label || ''}
      </span>

      <style>{`
        @keyframes barometer-scan {
          0%   { left: 0%; width: 35%; }
          100% { left: 65%; width: 35%; }
        }
      `}</style>
    </div>
  );
}
