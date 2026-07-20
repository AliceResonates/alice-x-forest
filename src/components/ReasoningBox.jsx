import React, { useState } from 'react';

const MODEL_LABELS = {
  deepseek: 'DeepSeek · Architekt',
  qwen: 'Qwen · Erzählerin',
  gemma: 'Gemma · Flinker Helfer',
};

export function ReasoningBox({ thoughts }) {
  const [open, setOpen] = useState(false);

  if (!thoughts || thoughts.length === 0) return null;

  return (
    <div className="border border-[#221c35] bg-[#0a0912]/80 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-[#c9b8f0] uppercase tracking-widest hover:bg-[#12101a] transition-colors"
      >
        <span>Der Rat spricht ({thoughts.length})</span>
        <span className="text-[#404040]">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-3 border-t border-[#221c35]">
          {thoughts.map((t, i) => (
            <div key={t.model || i} className="pt-3">
              <p className="text-[10px] text-[#7a6a9a] uppercase tracking-wider mb-1">
                {MODEL_LABELS[t.model] || t.model}
              </p>
              <p className="text-[#b8b8b8] leading-relaxed whitespace-pre-wrap">
                {t.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReasoningBox;
