'use client';

import React, { useState } from 'react';
import { GameId, GAMES_CATALOG } from '@/lib/game-types';
import { Trophy, RotateCcw, Award, Flame, Crown, Sparkles } from 'lucide-react';
import { retroAudio } from '@/lib/sound';

interface ScoreBoardProps {
  highScores: Record<GameId, number>;
  onResetScores: () => void;
}

export default function ScoreBoard({ highScores, onResetScores }: ScoreBoardProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'played'>('all');
  const totalScore = Object.values(highScores).reduce((a, b) => a + b, 0);
  const gamesWithScore = GAMES_CATALOG.filter(g => (highScores[g.id] || 0) > 0).length;

  const handleReset = () => {
    if (typeof window !== 'undefined' && window.confirm('Deseja realmente zerar todos os seus recordes locais?')) {
      retroAudio.hit();
      onResetScores();
    }
  };

  // Sort games by score descending
  const sortedGames = [...GAMES_CATALOG].sort((a, b) => {
    const scoreA = highScores[a.id] || 0;
    const scoreB = highScores[b.id] || 0;
    return scoreB - scoreA;
  });

  const displayGames = filterMode === 'played'
    ? sortedGames.filter(g => (highScores[g.id] || 0) > 0)
    : sortedGames;

  return (
    <section id="recordes" className="w-full scroll-mt-20 py-16 border-t border-slate-800/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Retro Header Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 p-6 sm:p-8 mb-8 overflow-hidden shadow-2xl">
          {/* Ambient Amber Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1 tracking-wider uppercase">
                <Crown className="w-3.5 h-3.5" />
                <span>HALL DA FAMA DOS FLIPERAMAS</span>
                <span aria-hidden="true">·</span>
                <span>PLACAR ELETRÔNICO</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-heading">
                Quadro Geral de Recordes
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Pontuações salvas localmente no seu navegador a cada partida concluída.
              </p>
            </div>

            {/* Total Score & Quick Reset */}
            <div className="flex items-center gap-4 bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/30 shadow-lg">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block uppercase">PONTUAÇÃO TOTAL</span>
                <span className="text-2xl font-mono font-black text-amber-400 tabular-nums">
                  {totalScore.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 block">
                  {gamesWithScore} de 17 Jogos Disputados
                </span>
              </div>

              <div className="pl-4 border-l border-slate-800">
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900 border border-rose-800/80 rounded-lg transition-colors flex items-center gap-1.5 active:scale-95"
                  title="Zerar pontuações salvas"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Zerar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Arcade CRT Scoreboard Table */}
        <div className="rounded-2xl bg-black border-2 border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden font-mono">
          {/* Top Marquee Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-bold">TOP PLAYERS RANKING</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  retroAudio.microswitchClick(600);
                  setFilterMode('all');
                }}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${filterMode === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Todos (17)
              </button>
              <button
                onClick={() => {
                  retroAudio.microswitchClick(600);
                  setFilterMode('played');
                }}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${filterMode === 'played' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Com Recorde ({gamesWithScore})
              </button>
            </div>
          </div>

          {/* Leaderboard Table Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayGames.map((game, index) => {
              const score = highScores[game.id] || 0;
              const isTopThree = index < 3 && score > 0;

              return (
                <div
                  key={game.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    score > 0
                      ? 'bg-slate-950/90 border-slate-800 hover:border-amber-500/50'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black tabular-nums border ${
                        index === 0 && score > 0
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_10px_#F59E0B]'
                          : index === 1 && score > 0
                          ? 'bg-slate-300 text-slate-950 border-white'
                          : index === 2 && score > 0
                          ? 'bg-amber-800 text-amber-100 border-amber-600'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {index + 1}
                    </span>

                    <div>
                      <div className="font-bold text-white text-xs truncate max-w-[140px] font-heading">
                        {game.title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {game.year} · {game.category.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 block">RECORDE</span>
                    <span
                      className={`text-base font-black tabular-nums ${
                        score > 0 ? 'text-amber-400' : 'text-slate-600'
                      }`}
                    >
                      {score > 0 ? score.toLocaleString('pt-BR') : '----'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
