'use client';

import React from 'react';
import { retroAudio, useAudioMuted } from '@/lib/sound';
import { Volume2, VolumeX, Tv, Sparkles } from 'lucide-react';

interface ArcadeHeaderProps {
  crtEnabled: boolean;
  onToggleCrt: () => void;
}

export default function ArcadeHeader({ crtEnabled, onToggleCrt }: ArcadeHeaderProps) {
  const isMuted = useAudioMuted();

  const handleToggleSound = () => {
    const nextState = retroAudio.toggleMute();
    if (!nextState) {
      retroAudio.blip(520);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Zone 1: Single text element wordmark in characterful display face */}
        <a href="#" className="text-xl font-black tracking-wider text-white flex items-center gap-2 font-heading">
          <span className="text-emerald-400">ARCADE</span>
          <span className="text-amber-400">CLÁSSICOS</span>
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#arena" className="hover:text-amber-400 transition-colors">
            Gabinete
          </a>
          <a href="#catalogo" className="hover:text-amber-400 transition-colors">
            Cartuchos (17)
          </a>
          <a href="#som" className="hover:text-amber-400 transition-colors">
            Mesa de Som
          </a>
          <a href="#recordes" className="hover:text-amber-400 transition-colors">
            Recordes
          </a>
          <a href="#historia" className="hover:text-amber-400 transition-colors">
            História
          </a>
          <a href="#controles" className="hover:text-amber-400 transition-colors">
            Controles
          </a>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          {/* Quick Coin Drop Button */}
          <button
            onClick={() => {
              retroAudio.coin();
            }}
            className="hidden sm:flex px-2.5 py-1.5 text-xs font-bold font-mono rounded-lg border border-amber-500/60 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 shadow-sm items-center gap-1.5 active:scale-95 transition-all"
            title="Inserir Ficha (Tocar som de moeda do Fliperama!)"
          >
            <span>🪙</span>
            <span>+1 Ficha</span>
          </button>

          {/* CRT scanline toggle */}
          <button
            onClick={() => {
              retroAudio.microswitchClick(650);
              onToggleCrt();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
              crtEnabled
                ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ligar/Desligar efeito de tubo CRT e linhas de varredura"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Modo CRT</span>
          </button>

          {/* Sound Mute/Unmute */}
          <button
            onClick={handleToggleSound}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
              isMuted
                ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
            }`}
            title={isMuted ? 'Ativar Efeitos Sonoros 8-Bit' : 'Mutar Áudio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMuted ? 'Mudo' : 'Som 8-Bit'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
