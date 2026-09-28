'use client';

import React from 'react';
import { GAMES_CATALOG } from '@/lib/game-types';

export default function ControlsGuide() {
  return (
    <section id="controles" className="w-full scroll-mt-20 py-12 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="text-xs font-mono text-amber-400 mb-1">MANUAL DO JOGADOR</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Guia de Controles e Atalhos
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            Todos os jogos contam com suporte completo a teclado, mouse e telas sensíveis ao toque (smartphones e tablets).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAMES_CATALOG.map(game => (
            <div
              key={game.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                <h4 className="font-bold text-white text-sm">{game.title}</h4>
                <span className="text-[11px] font-mono text-slate-400">{game.year}</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {game.controls.map((ctrl, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-slate-400">{ctrl.action}</span>
                    <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-amber-300 font-bold">
                      {ctrl.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
