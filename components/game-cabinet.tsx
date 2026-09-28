'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameId, GameInfo, GAMES_CATALOG } from '@/lib/game-types';
import SnakeGame from './games/snake-game';
import PongGame from './games/pong-game';
import BreakoutGame from './games/breakout-game';
import InvadersGame from './games/invaders-game';
import TetrisGame from './games/tetris-game';
import MinesweeperGame from './games/minesweeper-game';
import PacmanGame from './games/pacman-game';
import AsteroidsGame from './games/asteroids-game';
import FroggerGame from './games/frogger-game';
import FlappyGame from './games/flappy-game';
import LanderGame from './games/lander-game';
import Connect4Game from './games/connect4-game';
import SoccerGame from './games/soccer-game';
import RacingGame from './games/racing-game';
import KartGame from './games/kart-game';
import MemoryGame from './games/memory-game';
import HangmanGame from './games/hangman-game';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  HelpCircle,
  Coins,
  Tv,
  Sparkles,
  Dices,
  CircleDot,
  Volume2
} from 'lucide-react';
import { retroAudio } from '@/lib/sound';

interface GameCabinetProps {
  activeGameId: GameId;
  onSelectGame: (gameId: GameId) => void;
  highScores: Record<GameId, number>;
  onScoreSaved: () => void;
}

type CabinetTheme = 'cyber' | 'neogeo' | 'candy' | 'woodgrain';
type JoystickDir = 'CENTER' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'UP-LEFT' | 'UP-RIGHT' | 'DOWN-LEFT' | 'DOWN-RIGHT';

export default function GameCabinet({
  activeGameId,
  onSelectGame,
  highScores,
  onScoreSaved
}: GameCabinetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [theme, setTheme] = useState<CabinetTheme>('cyber');
  const [credits, setCredits] = useState<number>(3);
  const [coinAnimating, setCoinAnimating] = useState(false);
  const [joystickDir, setJoystickDir] = useState<JoystickDir>('CENTER');
  const [isSpinningRoulette, setIsSpinningRoulette] = useState(false);
  const [activeButtonPressed, setActiveButtonPressed] = useState<string | null>(null);

  const activeGame = GAMES_CATALOG.find(g => g.id === activeGameId) || GAMES_CATALOG[0];

  // Key tracking for interactive joystick tilt
  useEffect(() => {
    const activeKeys = new Set<string>();

    const updateDirection = () => {
      const up = activeKeys.has('ArrowUp') || activeKeys.has('KeyW') || activeKeys.has('w');
      const down = activeKeys.has('ArrowDown') || activeKeys.has('KeyS') || activeKeys.has('s');
      const left = activeKeys.has('ArrowLeft') || activeKeys.has('KeyA') || activeKeys.has('a');
      const right = activeKeys.has('ArrowRight') || activeKeys.has('KeyD') || activeKeys.has('d');

      if (up && left) setJoystickDir('UP-LEFT');
      else if (up && right) setJoystickDir('UP-RIGHT');
      else if (down && left) setJoystickDir('DOWN-LEFT');
      else if (down && right) setJoystickDir('DOWN-RIGHT');
      else if (up) setJoystickDir('UP');
      else if (down) setJoystickDir('DOWN');
      else if (left) setJoystickDir('LEFT');
      else if (right) setJoystickDir('RIGHT');
      else setJoystickDir('CENTER');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'w', 's', 'a', 'd'].includes(e.code || e.key)) {
        activeKeys.add(e.code || e.key);
        updateDirection();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code || e.key);
      activeKeys.delete(e.key);
      updateDirection();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleResetGame = () => {
    retroAudio.coin();
    setResetKey(prev => prev + 1);
  };

  const handleScoreUpdate = (_score: number) => {
    // Score update hook
  };

  const handleGameOver = (_finalScore: number) => {
    onScoreSaved();
  };

  // Insert Coin tactile interaction
  const handleInsertCoin = () => {
    retroAudio.coin();
    setCoinAnimating(true);
    setCredits(prev => Math.min(prev + 1, 99));
    setTimeout(() => {
      setCoinAnimating(false);
    }, 700);
  };

  // Dispatch virtual key events when physical buttons on the control panel are clicked
  const simulateKey = (key: string, code: string, keyCode: number, buttonName: string) => {
    retroAudio.microswitchClick(720);
    setActiveButtonPressed(buttonName);
    setTimeout(() => setActiveButtonPressed(null), 120);

    const eventDown = new KeyboardEvent('keydown', {
      key,
      code,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(eventDown);

    setTimeout(() => {
      const eventUp = new KeyboardEvent('keyup', {
        key,
        code,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(eventUp);
    }, 80);
  };

  // Joystick manual touch direction
  const handleJoystickPress = (dir: JoystickDir, key: string, code: string) => {
    setJoystickDir(dir);
    simulateKey(key, code, 0, dir);
    setTimeout(() => setJoystickDir('CENTER'), 200);
  };

  // Roulette spinner
  const handleRoulette = () => {
    if (isSpinningRoulette) return;
    setIsSpinningRoulette(true);
    retroAudio.coin();

    let count = 0;
    const total = 14;
    const interval = setInterval(() => {
      count++;
      const randomIdx = Math.floor(Math.random() * GAMES_CATALOG.length);
      const picked = GAMES_CATALOG[randomIdx];
      onSelectGame(picked.id);
      retroAudio.rouletteTick(480 + count * 30);

      if (count >= total) {
        clearInterval(interval);
        setIsSpinningRoulette(false);
        retroAudio.bonus();
      }
    }, 75);
  };

  // Theme configuration styles
  const themeStyles = {
    cyber: {
      outerBorder: 'border-purple-600/70 shadow-[0_0_50px_rgba(168,85,247,0.25)]',
      cabinetBg: 'bg-[#090b14]',
      marqueeBg: 'bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 border-purple-500/60',
      marqueeGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
      accentColor: '#A855F7',
      bezelBg: 'bg-slate-950',
      panelBg: 'bg-[#0c101e] border-indigo-900/60'
    },
    neogeo: {
      outerBorder: 'border-amber-600/70 shadow-[0_0_50px_rgba(245,158,11,0.25)]',
      cabinetBg: 'bg-[#0a0a0b]',
      marqueeBg: 'bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-amber-500/60',
      marqueeGlow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
      accentColor: '#F59E0B',
      bezelBg: 'bg-stone-950',
      panelBg: 'bg-[#14120e] border-amber-900/60'
    },
    candy: {
      outerBorder: 'border-rose-600/70 shadow-[0_0_50px_rgba(225,29,72,0.25)]',
      cabinetBg: 'bg-[#0f1117]',
      marqueeBg: 'bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-rose-500/60',
      marqueeGlow: 'shadow-[0_0_25px_rgba(225,29,72,0.35)]',
      accentColor: '#E11D48',
      bezelBg: 'bg-slate-950',
      panelBg: 'bg-[#160d12] border-rose-900/60'
    },
    woodgrain: {
      outerBorder: 'border-amber-800/90 shadow-[0_0_50px_rgba(180,83,9,0.35)]',
      cabinetBg: 'bg-[#181109]',
      marqueeBg: 'bg-gradient-to-r from-amber-950 via-yellow-950 to-amber-950 border-amber-600/70',
      marqueeGlow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
      accentColor: '#D97706',
      bezelBg: 'bg-stone-950',
      panelBg: 'bg-[#23150d] border-amber-800/80'
    }
  }[theme];

  // Joystick tilt transform
  const getJoystickTransform = () => {
    switch (joystickDir) {
      case 'UP': return 'translate-y-[-10px] rotate-x-[25deg]';
      case 'DOWN': return 'translate-y-[10px] rotate-x-[-25deg]';
      case 'LEFT': return 'translate-x-[-10px] rotate-y-[-25deg]';
      case 'RIGHT': return 'translate-x-[10px] rotate-y-[25deg]';
      case 'UP-LEFT': return 'translate-y-[-7px] translate-x-[-7px]';
      case 'UP-RIGHT': return 'translate-y-[-7px] translate-x-[7px]';
      case 'DOWN-LEFT': return 'translate-y-[7px] translate-x-[-7px]';
      case 'DOWN-RIGHT': return 'translate-y-[7px] translate-x-[7px]';
      default: return 'translate-x-0 translate-y-0';
    }
  };

  return (
    <section id="arena" className="w-full scroll-mt-20 py-4">
      {/* Arcade Machine Cabinet Wrapper */}
      <div
        className={`mx-auto rounded-3xl border-4 ${themeStyles.outerBorder} ${themeStyles.cabinetBg} p-3 sm:p-5 shadow-2xl transition-all duration-300 ${
          isExpanded ? 'max-w-6xl' : 'max-w-4xl'
        }`}
      >
        {/* ======================================================== */}
        {/* 1. TOP MARQUEE (Illuminated Backlit Sign)                 */}
        {/* ======================================================== */}
        <div
          className={`relative rounded-2xl border-2 ${themeStyles.marqueeBg} ${themeStyles.marqueeGlow} p-4 mb-4 overflow-hidden`}
        >
          {/* Subtle Marquee Corner Screws / Bolts */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-600 border border-slate-400" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-600 border border-slate-400" />
          <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-600 border border-slate-400" />
          <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-600 border border-slate-400" />

          {/* Marquee Header Content */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: Speaker Grille + Title */}
            <div className="flex items-center gap-3">
              {/* Stereo Speaker Vent Simulation */}
              <div className="hidden sm:flex flex-col gap-1 text-[8px] font-mono text-slate-500 select-none">
                <span>::::::</span>
                <span>::::::</span>
                <span>::::::</span>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-amber-400 tracking-wider">
                  <span className="font-bold uppercase">{activeGame.developer}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeGame.year}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 font-normal">{activeGame.originalTitle}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3 font-heading">
                  <span>{activeGame.title}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-amber-500/50 text-amber-400 shadow">
                    RECORDE: {highScores[activeGameId] || 0}
                  </span>
                </h2>
              </div>
            </div>

            {/* Right: Quick Controls & Theme Selector */}
            <div className="flex items-center gap-2">
              {/* Theme Pill Picker */}
              <div className="hidden md:flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg text-[10px] font-mono">
                <button
                  onClick={() => {
                    retroAudio.microswitchClick(600);
                    setTheme('cyber');
                  }}
                  className={`px-2 py-1 rounded transition-colors ${theme === 'cyber' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Tema Cyberpunk Neon"
                >
                  Neon
                </button>
                <button
                  onClick={() => {
                    retroAudio.microswitchClick(600);
                    setTheme('neogeo');
                  }}
                  className={`px-2 py-1 rounded transition-colors ${theme === 'neogeo' ? 'bg-amber-600 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Tema Neo-Geo Dourado"
                >
                  Neo-Geo
                </button>
                <button
                  onClick={() => {
                    retroAudio.microswitchClick(600);
                    setTheme('candy');
                  }}
                  className={`px-2 py-1 rounded transition-colors ${theme === 'candy' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Tema Candy Cab Clássico"
                >
                  Candy
                </button>
                <button
                  onClick={() => {
                    retroAudio.microswitchClick(600);
                    setTheme('woodgrain');
                  }}
                  className={`px-2 py-1 rounded transition-colors ${theme === 'woodgrain' ? 'bg-amber-800 text-amber-200 font-bold' : 'text-slate-400 hover:text-white'}`}
                  title="Tema Gabinete de Madeira 1982"
                >
                  Madeira
                </button>
              </div>

              {/* Instructions Help Toggle */}
              <button
                onClick={() => {
                  retroAudio.microswitchClick(700);
                  setShowHelp(!showHelp);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  showHelp
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="Regras e Controles do Jogo"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{showHelp ? 'Fechar Ajuda' : 'Como Jogar'}</span>
              </button>

              {/* Reset Game */}
              <button
                onClick={handleResetGame}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5 active:scale-95"
                title="Reiniciar Gabinete (Ficha)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>

              {/* Expand / Minimize Theater Mode */}
              <button
                onClick={() => {
                  retroAudio.microswitchClick(650);
                  setIsExpanded(!isExpanded);
                }}
                className="hidden sm:flex px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 transition-colors items-center gap-1.5 active:scale-95"
                title={isExpanded ? 'Tela Padrão' : 'Modo Teatro Expandido'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden lg:inline">{isExpanded ? 'Padrão' : 'Expandir'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Instructions Drawer */}
        {showHelp && (
          <div className="mb-4 p-4 rounded-xl bg-slate-900/95 border border-amber-500/40 text-slate-300 text-xs shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
              <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
                <span>Instruções: {activeGame.title}</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">{activeGame.tags.join(' · ')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 mb-4">
              {activeGame.instructions.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ul>

            <h5 className="font-bold text-slate-200 text-xs mb-2">Comandos do Teclado:</h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-[11px]">
              {activeGame.controls.map((ctrl, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-950 p-1.5 rounded border border-slate-800">
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                    {ctrl.key}
                  </span>
                  <span className="text-slate-400 truncate">{ctrl.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. CRT MONITOR BEZEL & SCREEN AREA                       */}
        {/* ======================================================== */}
        <div className={`relative rounded-2xl p-2 sm:p-4 border-4 border-slate-900 ${themeStyles.bezelBg} shadow-inner`}>
          {/* Top Bezel Status Stripe */}
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-950 rounded-lg border border-slate-900 text-[10px] font-mono">
            {/* Status LEDs */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10B981]" />
                <span className="text-emerald-400 font-bold">POWER ON</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#F59E0B]" />
                <span className="text-amber-400 font-bold">1P ACTIVE</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06B6D4]" />
                <span>HI-FI 8-BIT</span>
              </div>
            </div>

            {/* Spec Decal */}
            <div className="text-slate-500 hidden sm:block">
              COLOR CRT · 15KHz RGB · 60 FPS
            </div>
          </div>

          {/* Active Game Screen Container */}
          <div className="relative overflow-hidden rounded-xl bg-black border-2 border-slate-800 flex justify-center items-center py-2 sm:py-4">
            {/* Screen Glass Glare Shimmer Overlay */}
            <div className="absolute top-0 right-0 w-full h-1/3 bg-gradient-to-b from-white/5 via-white/[0.02] to-transparent pointer-events-none z-10" />

            <div key={`${activeGameId}-${resetKey}`} className="w-full flex justify-center">
              {activeGameId === 'snake' && (
                <SnakeGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.snake || 0}
                />
              )}
              {activeGameId === 'pong' && (
                <PongGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.pong || 0}
                />
              )}
              {activeGameId === 'breakout' && (
                <BreakoutGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.breakout || 0}
                />
              )}
              {activeGameId === 'invaders' && (
                <InvadersGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.invaders || 0}
                />
              )}
              {activeGameId === 'tetris' && (
                <TetrisGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.tetris || 0}
                />
              )}
              {activeGameId === 'minesweeper' && (
                <MinesweeperGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.minesweeper || 0}
                />
              )}
              {activeGameId === 'pacman' && (
                <PacmanGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.pacman || 0}
                />
              )}
              {activeGameId === 'asteroids' && (
                <AsteroidsGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.asteroids || 0}
                />
              )}
              {activeGameId === 'frogger' && (
                <FroggerGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.frogger || 0}
                />
              )}
              {activeGameId === 'flappy' && (
                <FlappyGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.flappy || 0}
                />
              )}
              {activeGameId === 'lander' && (
                <LanderGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.lander || 0}
                />
              )}
              {activeGameId === 'connect4' && (
                <Connect4Game
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.connect4 || 0}
                />
              )}
              {activeGameId === 'soccer' && (
                <SoccerGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.soccer || 0}
                />
              )}
              {activeGameId === 'racing' && (
                <RacingGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.racing || 0}
                />
              )}
              {activeGameId === 'kart' && (
                <KartGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.kart || 0}
                />
              )}
              {activeGameId === 'memory' && (
                <MemoryGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.memory || 0}
                />
              )}
              {activeGameId === 'hangman' && (
                <HangmanGame
                  onScoreUpdate={handleScoreUpdate}
                  onGameOver={handleGameOver}
                  highScore={highScores.hangman || 0}
                />
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. ARCADE CONTROL PANEL DECK (Tactile Joy & Buttons)     */}
        {/* ======================================================== */}
        <div
          className={`mt-4 rounded-2xl border-2 ${themeStyles.panelBg} p-4 sm:p-5 shadow-inner relative overflow-hidden`}
        >
          {/* Control Deck Surface Texture */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Zone A: Realistic Ball-top Joystick with Directional Buttons */}
            <div className="flex items-center gap-5">
              {/* Physical Ball-top Joystick Graphic */}
              <div className="relative w-24 h-24 flex items-center justify-center select-none">
                {/* Circular Mounting Bezel Plate */}
                <div className="absolute w-20 h-20 rounded-full bg-slate-900 border-2 border-slate-700 shadow-inner" />
                {/* Joystick Dust Washer */}
                <div className="absolute w-12 h-12 rounded-full bg-slate-950 border border-slate-800 shadow" />
                {/* Joystick Ball Top */}
                <div
                  className={`relative w-10 h-10 rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-950 border-2 border-red-500 shadow-lg cursor-pointer transition-transform duration-100 flex items-center justify-center ${getJoystickTransform()}`}
                  title="Joystick Arcade (Use Teclas Direcionais / WASD)"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white/40 absolute top-1.5 left-1.5" />
                </div>
              </div>

              {/* D-Pad Buttons for quick touch / click on mobile */}
              <div className="flex flex-col items-center gap-1 font-mono">
                <button
                  onClick={() => handleJoystickPress('UP', 'ArrowUp', 'ArrowUp')}
                  className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-600 text-xs font-bold text-slate-300 flex items-center justify-center transition-colors shadow"
                  title="Mover Cima (↑ / W)"
                >
                  ▲
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleJoystickPress('LEFT', 'ArrowLeft', 'ArrowLeft')}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-600 text-xs font-bold text-slate-300 flex items-center justify-center transition-colors shadow"
                    title="Mover Esquerda (← / A)"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => handleJoystickPress('DOWN', 'ArrowDown', 'ArrowDown')}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-600 text-xs font-bold text-slate-300 flex items-center justify-center transition-colors shadow"
                    title="Mover Baixo (↓ / S)"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => handleJoystickPress('RIGHT', 'ArrowRight', 'ArrowRight')}
                    className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 border border-slate-600 text-xs font-bold text-slate-300 flex items-center justify-center transition-colors shadow"
                    title="Mover Direita (→ / D)"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            {/* Zone B: Coin Door & Token Counter (Interactive!) */}
            <div className="flex flex-col items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 shadow">
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 uppercase">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Caixa de Fichas</span>
              </div>

              {/* Digital LED Display */}
              <div className="font-mono font-black text-amber-400 text-lg bg-black px-3 py-1 rounded border border-amber-900/60 shadow-inner flex items-baseline gap-2">
                <span className="text-[11px] text-amber-500 font-normal">CRÉDITOS:</span>
                <span className="tabular-nums tracking-widest">{String(credits).padStart(2, '0')}</span>
              </div>

              {/* Interactive Coin Slot */}
              <button
                onClick={handleInsertCoin}
                className={`relative px-3.5 py-1.5 rounded-lg border text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                  coinAnimating
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-105'
                    : 'bg-amber-950/60 hover:bg-amber-900 border-amber-600/80 text-amber-300 active:scale-95'
                }`}
                title="Clique para inserir uma ficha e ouvir o som metálico clássico!"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping inline-block" />
                <span>INSERIR FICHA (25¢)</span>
              </button>
            </div>

            {/* Zone C: Push-Buttons (Red, Blue, Yellow, Green, 1P Start) */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              {/* Start Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => simulateKey('1', 'Digit1', 49, '1P')}
                  className="px-3 py-1 bg-slate-200 hover:bg-white text-slate-950 text-[10px] font-black rounded uppercase shadow border border-slate-400 active:translate-y-0.5"
                  title="Player 1 Start"
                >
                  1P START
                </button>
                <button
                  onClick={() => simulateKey('2', 'Digit2', 50, '2P')}
                  className="px-3 py-1 bg-slate-300 hover:bg-white text-slate-950 text-[10px] font-black rounded uppercase shadow border border-slate-400 active:translate-y-0.5"
                  title="Player 2 Start"
                >
                  2P START
                </button>

                {/* Roulette Random Game on Deck */}
                <button
                  onClick={handleRoulette}
                  disabled={isSpinningRoulette}
                  className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black rounded uppercase shadow hover:from-amber-400 hover:to-yellow-300 active:translate-y-0.5 flex items-center gap-1 disabled:opacity-50"
                  title="Sortear outro jogo"
                >
                  <Dices className={`w-3 h-3 ${isSpinningRoulette ? 'animate-spin' : ''}`} />
                  <span>SORTEAR</span>
                </button>
              </div>

              {/* 4 Colored Convex Action Push-Buttons */}
              <div className="flex items-center gap-3">
                {/* Button A: Space / Action */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => simulateKey(' ', 'Space', 32, 'A')}
                    className={`w-11 h-11 rounded-full arcade-btn-red flex items-center justify-center font-black text-white text-xs border border-red-400 select-none ${
                      activeButtonPressed === 'A' ? 'translate-y-1 shadow-none' : ''
                    }`}
                    title="Botão A: Ação Primária / Chute / Pulo / Tiro (Barra de Espaço)"
                  >
                    A
                  </button>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">ESPAÇO</span>
                </div>

                {/* Button B: Enter / Secondary */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => simulateKey('Enter', 'Enter', 13, 'B')}
                    className={`w-11 h-11 rounded-full arcade-btn-blue flex items-center justify-center font-black text-white text-xs border border-sky-400 select-none ${
                      activeButtonPressed === 'B' ? 'translate-y-1 shadow-none' : ''
                    }`}
                    title="Botão B: Ação Secundária / Confirmar / Freio (Enter)"
                  >
                    B
                  </button>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">ENTER</span>
                </div>

                {/* Button C: Shift / Turbo / Special */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => simulateKey('Shift', 'ShiftLeft', 16, 'C')}
                    className={`w-11 h-11 rounded-full arcade-btn-yellow flex items-center justify-center font-black text-slate-950 text-xs border border-yellow-300 select-none ${
                      activeButtonPressed === 'C' ? 'translate-y-1 shadow-none' : ''
                    }`}
                    title="Botão C: Turbo Nitro / Poder / Item Especial (Shift / Q)"
                  >
                    C
                  </button>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">SHIFT</span>
                </div>

                {/* Button D: Pause */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => simulateKey('p', 'KeyP', 80, 'D')}
                    className={`w-11 h-11 rounded-full arcade-btn-green flex items-center justify-center font-black text-white text-xs border border-emerald-400 select-none ${
                      activeButtonPressed === 'D' ? 'translate-y-1 shadow-none' : ''
                    }`}
                    title="Botão D: Pausar / Despausar Partida (Tecla P)"
                  >
                    D
                  </button>
                  <span className="text-[9px] font-mono text-slate-400 font-bold">PAUSA</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cabinet Bottom Footprint Badge */}
        <div className="mt-3 pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>SISTEMA RETRÔ MULTI-JOGOS</span>
            <span aria-hidden="true">·</span>
            <span>LICENÇA DE PRESERVAÇÃO</span>
          </div>
          <div className="text-slate-400">
            USE O TECLADO OU OS BOTÕES TÁTEIS DO GABINETE
          </div>
        </div>
      </div>
    </section>
  );
}
