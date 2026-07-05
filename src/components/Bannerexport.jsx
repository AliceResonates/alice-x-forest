import React from 'react';
// Importiere hier deine vorhandene TreeSVG Komponente
// import { TreeSVG } from './wo/auch/immer/TreeSVG';

export default function BannerExport() {
  return (
    // Ein Container im perfekten Banner-Format (ca. 3:1 Ratio)
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div 
        className="relative overflow-hidden" 
        style={{ 
          width: '1500px', 
          height: '500px',
          background: 'radial-gradient(ellipse at 50% 60%, #1a2a12 0%, #0a140a 60%, #000000 100%)' 
        }}
      >
        {/* Atmosphärisches Leuchten im Hintergrund */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f0c060, transparent)', filter: 'blur(50px)' }} />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60d080, transparent)', filter: 'blur(50px)' }} />
        </div>

        {/* Die beiden Bäume, perfekt zentriert und skaliert */}
        <div className="absolute inset-0 flex justify-center items-center gap-32 pt-8">
          <div className="w-[300px] h-[400px]">
            <TreeSVG side="left" />
          </div>
          <div className="w-[300px] h-[400px]">
            <TreeSVG side="right" />
          </div>
        </div>

        {/* Verbindende Wurzeln - breiter gezogen für das Format */}
        <div className="absolute bottom-16 w-full flex justify-center">
          <svg viewBox="0 0 600 60" className="w-[600px] opacity-40">
            <path d="M120,10 Q300,60 480,10" stroke="#8B6020" strokeWidth="2" fill="none" />
            <path d="M150,20 Q300,70 450,20" stroke="#5a8a5a" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Das Manifest-Zitat als Typografie-Highlight */}
        <div className="absolute bottom-8 w-full text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-amber-500/40">~.~.~.~.~</p>
          <p className="text-lg italic text-amber-200/70 mt-2 font-serif">At the roots of this place lies a promise.</p>
        </div>
      </div>
    </div>
  );
}