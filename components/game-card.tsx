'use client';

import React from 'react';
import Image from 'next/image';
import { GameInfo, GameId } from '@/lib/game-types';
import { Play, Trophy, Sparkles, Disc, Flame } from 'lucide-react';
import { retroAudio } from '@/lib/sound';

interface GameCardProps {
  game: GameInfo;
  isActive: boolean;
  highScore: number;
  onSelect: (id: GameId) => void;
}

export default function GameCard({ game, isActive, highScore, onSelect }: GameCardProps) {
  const handlePlayClick = () => {
    retroAudio.coin();
    onSelect(game.id);
    const arenaEl = document.getElementById('arena');
    if (arenaEl) {
      arenaEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`group relative bg-[#0f1422] border-2 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-xl ${
        isActive
          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] -translate-y-1'
          : 'border-slate-800 hover:border-slate-600 hover:shadow-2xl hover:-translate-y-1'
      }`}
    >
      {/* Top Cartridge Grip Ribs */}
      <div className="w-full h-3 bg-slate-900 border-b border-slate-800 cartridge-ribs flex items-center justify-center">
        <div className="w-16 h-1 bg-slate-700/60 rounded-full" />
      </div>

      {/* Cartridge Cover Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
        <Image
          src={game.image}
          alt={`Capa original do jogo ${game.title}`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Ambient Dark Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1422] via-[#0f1422]/40 to-transparent" />

        {/* Category Badge Sticker */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded-md border border-slate-700 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider shadow">
          {game.category}
        </div>

        {/* High Score Gold Badge */}
        {highScore > 0 && (
          <div className="absolute top-3 right-3 bg-amber-950/90 backdrop-blur border border-amber-500/60 px-2.5 py-1 rounded-md text-[11px] font-mono font-black text-amber-300 flex items-center gap-1.5 shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{highScore} pts</span>
          </div>
        )}

        {/* Active In-Use Banner */}
        {isActive && (
          <div className="absolute bottom-2 left-3 bg-amber-400 text-slate-950 text-[10px] font-mono font-black px-2 py-0.5 rounded shadow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
            <span>RODANDO NO GABINETE</span>
          </div>
        )}
      </div>

      {/* Cartridge Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata line: Year · Developer · Original Title */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-2">
            <span className="text-amber-400 font-semibold">{game.year}</span>
            <span aria-hidden="true">·</span>
            <span>{game.developer}</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">{game.originalTitle}</span>
          </div>

          {/* Game Title */}
          <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors tracking-tight font-heading">
            {game.title}
          </h3>

          {/* Description */}
          <p className="mt-2 text-xs text-slate-300 leading-relaxed line-clamp-3">
            {game.shortDesc}
          </p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {game.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Footer Area: Bottom PCB Connector Pins & Play Action */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          {/* Fake Gold Connector Pins Graphic */}
          <div className="hidden sm:flex items-center gap-0.5 text-amber-500/40 text-[9px] font-mono select-none" title="Pinos de conexão do cartucho">
            ||||||||||||||||
          </div>

          <button
            onClick={handlePlayClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md active:scale-95 ${
              isActive
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 font-black'
                : 'bg-slate-800 hover:bg-amber-400 text-white hover:text-slate-950 border border-slate-700 hover:border-amber-400'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isActive ? 'Jogando Agora' : 'Carregar Cartucho'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
