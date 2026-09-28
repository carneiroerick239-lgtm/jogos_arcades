'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import ArcadeHeader from '@/components/arcade-header';
import ArcadeTicker from '@/components/arcade-ticker';
import GameCabinet from '@/components/game-cabinet';
import CartridgeDeck from '@/components/cartridge-deck';
import GameCard from '@/components/game-card';
import SoundBoard from '@/components/sound-board';
import RetroHistory from '@/components/retro-history';
import ScoreBoard from '@/components/score-board';
import ControlsGuide from '@/components/controls-guide';
import { GameId, GameCategory, GAMES_CATALOG, useHighScores, resetHighScores } from '@/lib/game-types';
import { Play, Sparkles, Trophy, Gamepad2, Dices, ArrowDown, Flame, Zap } from 'lucide-react';
import { retroAudio } from '@/lib/sound';

export default function HomePage() {
  const [activeGameId, setActiveGameId] = useState<GameId>('snake');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const highScores = useHighScores();
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);

  const handleResetScores = () => {
    resetHighScores();
  };

  // Filter games for the catalog section
  const filteredGames = selectedCategory === 'todos'
    ? GAMES_CATALOG
    : selectedCategory === 'arcade'
    ? GAMES_CATALOG.filter(g => g.category === 'arcade')
    : selectedCategory === 'corrida'
    ? GAMES_CATALOG.filter(g => g.id === 'racing' || g.id === 'kart' || g.category === 'acao')
    : selectedCategory === 'raciocinio'
    ? GAMES_CATALOG.filter(g => g.category === 'raciocinio' || g.id === 'tetris' || g.id === 'minesweeper' || g.id === 'memory' || g.id === 'hangman')
    : selectedCategory === 'multijogador'
    ? GAMES_CATALOG.filter(g => g.category === 'multijogador' || g.id === 'pong' || g.id === 'connect4')
    : GAMES_CATALOG;

  const handlePlayNowHero = () => {
    retroAudio.coin();
    const arenaEl = document.getElementById('arena');
    if (arenaEl) {
      arenaEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRandomHero = () => {
    retroAudio.coin();
    const randomIdx = Math.floor(Math.random() * GAMES_CATALOG.length);
    setActiveGameId(GAMES_CATALOG[randomIdx].id);
    const arenaEl = document.getElementById('arena');
    if (arenaEl) {
      arenaEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen bg-[#06080e] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 ${crtEnabled ? 'crt-scanlines' : ''}`}>
      {/* Top Bar Header */}
      <ArcadeHeader
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(prev => !prev)}
      />

      {/* Running LED Marquee Ticker */}
      <ArcadeTicker />

      <main className="flex-1 w-full flex flex-col items-center">
        {/* ======================================================== */}
        {/* ARCADE STAGE & CENTERPIECE PLAYABLE CABINET              */}
        {/* ======================================================== */}
        <section className="relative w-full overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-[#0a0d18] via-[#080a12] to-[#06080e] pt-6 pb-12">
          {/* Background Arcade Panorama with Overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <Image
              src="/images/arcade_neon_hall_1790632983182.jpg"
              alt="Salão de Fliperamas Retrô dos Anos 80"
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-15 mix-blend-screen scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06080e] via-[#06080e]/80 to-[#0a0d18]/90" />
          </div>

          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Stage Title Marquee Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-mono text-amber-400 mb-1 tracking-widest uppercase">
                  <span>SALÃO DE JOGOS RETRÔ 198X</span>
                  <span aria-hidden="true">·</span>
                  <span>17 CARTUCHOS CLÁSSICOS</span>
                  <span aria-hidden="true">·</span>
                  <span>SINTETIZADOR 8-BIT</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-heading">
                  Arena de Fliperama <span className="text-amber-400 neon-amber">Ao Vivo</span>
                </h1>
              </div>

              {/* Quick Jump Bar */}
              <div className="flex items-center flex-wrap justify-center gap-2.5 text-xs font-mono">
                <button
                  onClick={handleRandomHero}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Sortear Jogo Aleatório</span>
                </button>
                <a
                  href="#catalogo"
                  className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Coleção de Cartuchos (17)</span>
                  <span>↓</span>
                </a>
                <a
                  href="#som"
                  className="px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span>Mesa de Som</span>
                  <span>🎵</span>
                </a>
              </div>
            </div>

            {/* Quick Cartridge Jukebox Deck */}
            <CartridgeDeck
              activeGameId={activeGameId}
              onSelectGame={setActiveGameId}
              highScores={highScores}
            />

            {/* Real Arcade Cabinet */}
            <GameCabinet
              activeGameId={activeGameId}
              onSelectGame={setActiveGameId}
              highScores={highScores}
              onScoreSaved={() => {}}
            />
          </div>
        </section>

        {/* ======================================================== */}
        {/* COMPLETE COLLECTIBLE CARTRIDGE CATALOG SECTION           */}
        {/* ======================================================== */}
        <section id="catalogo" className="w-full max-w-7xl px-4 sm:px-6 py-16 scroll-mt-20 border-t border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="text-xs font-mono text-amber-400 mb-1">COLEÇÃO COMPLETA DE 16-BIT & ARCADE</div>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-heading">
                Todos os 17 Cartuchos Clássicos
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Selecione qualquer cartucho para carregá-lo instantaneamente no gabinete de fliperama acima.
              </p>
            </div>

            {/* Filter Tabs (Interactive filter buttons) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
              {(
                [
                  { id: 'todos', label: 'Todos (17)' },
                  { id: 'arcade', label: 'Fliperama' },
                  { id: 'corrida', label: 'Corrida & Ação' },
                  { id: 'raciocinio', label: 'Raciocínio' },
                  { id: 'multijogador', label: '2 Jogadores' }
                ] as const
              ).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    retroAudio.microswitchClick(680);
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                isActive={game.id === activeGameId}
                highScore={highScores[game.id] || 0}
                onSelect={id => {
                  setActiveGameId(id);
                }}
              />
            ))}
          </div>
        </section>

        {/* Interactive Soundboard Section */}
        <SoundBoard />

        {/* High Scores Section */}
        <ScoreBoard
          highScores={highScores}
          onResetScores={handleResetScores}
        />

        {/* Retro History Section */}
        <RetroHistory />

        {/* Controls Guide Section */}
        <ControlsGuide />
      </main>

      {/* Footer conforming strictly to Anti-Slop (clean copyright, zero fake telemetry) */}
      <footer className="w-full bg-[#06080e] border-t border-slate-900 py-8 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            Arcade Clássicos 198X © {new Date().getFullYear()} · Preservação Histórica dos Jogos Eletrônicos
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#arena" className="hover:text-amber-400 transition-colors">Gabinete</a>
            <span aria-hidden="true">·</span>
            <a href="#catalogo" className="hover:text-amber-400 transition-colors">Cartuchos</a>
            <span aria-hidden="true">·</span>
            <a href="#som" className="hover:text-amber-400 transition-colors">Mesa de Som</a>
            <span aria-hidden="true">·</span>
            <a href="#recordes" className="hover:text-amber-400 transition-colors">Recordes</a>
            <span aria-hidden="true">·</span>
            <a href="#controles" className="hover:text-amber-400 transition-colors">Controles</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
