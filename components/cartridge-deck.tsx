'use client';

import React, { useState } from 'react';
import { GameId, GameInfo, GAMES_CATALOG } from '@/lib/game-types';
import { Search, Dices, Trophy, Sparkles, Gamepad2, ArrowRight } from 'lucide-react';
import { retroAudio } from '@/lib/sound';

interface CartridgeDeckProps {
  activeGameId: GameId;
  onSelectGame: (gameId: GameId) => void;
  highScores: Record<GameId, number>;
}

type DeckFilter = 'todos' | 'arcade' | 'corrida' | 'esporte' | 'raciocinio' | 'multijogador';

export default function CartridgeDeck({
  activeGameId,
  onSelectGame,
  highScores
}: CartridgeDeckProps) {
  const [filter, setFilter] = useState<DeckFilter>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);

  // Filter games based on category and search query
  const filteredGames = GAMES_CATALOG.filter(game => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.originalTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.developer.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'todos') return true;
    if (filter === 'arcade') return game.category === 'arcade';
    if (filter === 'corrida') return game.id === 'racing' || game.id === 'kart';
    if (filter === 'esporte') return game.id === 'soccer' || game.id === 'pong';
    if (filter === 'raciocinio')
      return (
        game.category === 'raciocinio' ||
        game.id === 'tetris' ||
        game.id === 'memory' ||
        game.id === 'hangman' ||
        game.id === 'minesweeper'
      );
    if (filter === 'multijogador') return game.category === 'multijogador';
    return true;
  });

  // Random game roulette spinner
  const handleRandomSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    retroAudio.coin();

    let counter = 0;
    const totalTicks = 16;
    const intervalTime = 70;

    const interval = setInterval(() => {
      counter++;
      const randomIdx = Math.floor(Math.random() * GAMES_CATALOG.length);
      const picked = GAMES_CATALOG[randomIdx];
      onSelectGame(picked.id);
      retroAudio.rouletteTick(450 + counter * 35);

      if (counter >= totalTicks) {
        clearInterval(interval);
        setIsSpinning(false);
        retroAudio.bonus();
        const arenaEl = document.getElementById('arena');
        if (arenaEl) {
          arenaEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, intervalTime);
  };

  const handleSelect = (id: GameId) => {
    retroAudio.blip(500);
    onSelectGame(id);
    const arenaEl = document.getElementById('arena');
    if (arenaEl) {
      arenaEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full mb-8">
      {/* Top Deck Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
          {(
            [
              { id: 'todos', label: 'Todos', count: 17 },
              { id: 'arcade', label: 'Fliperama', count: 6 },
              { id: 'corrida', label: 'Corrida', count: 2 },
              { id: 'esporte', label: 'Esportes', count: 2 },
              { id: 'raciocinio', label: 'Raciocínio', count: 5 },
              { id: 'multijogador', label: '2 Jogadores', count: 2 }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                retroAudio.microswitchClick(680);
                setFilter(tab.id);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filter === tab.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded ${filter === tab.id ? 'bg-amber-500/40 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Right side: Search & Roulette */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar clássico..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Random Roulette Button */}
          <button
            onClick={handleRandomSpin}
            disabled={isSpinning}
            className={`px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap active:scale-95 disabled:opacity-50 ${
              isSpinning ? 'animate-pulse' : ''
            }`}
            title="Sortear um jogo aleatório na roleta do fliperama!"
          >
            <Dices className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Sorteando...' : 'Sortear Jogo!'}</span>
          </button>
        </div>
      </div>

      {/* Cartridge Carousel Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
        {filteredGames.map(game => {
          const isActive = game.id === activeGameId;
          const score = highScores[game.id] || 0;

          return (
            <button
              key={game.id}
              onClick={() => handleSelect(game.id)}
              className={`group relative text-left rounded-xl p-2.5 transition-all flex flex-col justify-between overflow-hidden border ${
                isActive
                  ? 'bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 ring-2 ring-amber-400/30 shadow-lg -translate-y-0.5'
                  : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
              }`}
            >
              {/* Top Cartridge Notch & Color Stripe */}
              <div
                className="w-full h-1 rounded-full mb-2 opacity-80"
                style={{ backgroundColor: game.accentColor }}
              />

              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-slate-400 mb-1">
                  <span>{game.year}</span>
                  {score > 0 && (
                    <span className="text-amber-400 font-bold flex items-center gap-0.5">
                      <Trophy className="w-2.5 h-2.5" />
                      {score}
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                  {game.title}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 font-mono">
                  {game.originalTitle}
                </div>
              </div>

              {/* Status / Active Indicator */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[9px] font-mono uppercase text-slate-500">
                  {game.category}
                </span>

                {isActive ? (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    NO AR
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400 transition-colors">
                    Inserir →
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
