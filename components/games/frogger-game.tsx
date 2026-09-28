'use client';

import React, { useRef, useEffect, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, Pause, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface FroggerGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

const COLS = 12;
const ROWS = 13;
const TILE_SIZE = 40;
const WIDTH = COLS * TILE_SIZE; // 480
const HEIGHT = ROWS * TILE_SIZE; // 520

interface Vehicle {
  x: number;
  row: number;
  speed: number;
  width: number;
  color: string;
  type: 'car' | 'truck' | 'race' | 'bus';
}

interface LogItem {
  x: number;
  row: number;
  speed: number;
  width: number;
  isTurtle: boolean;
}

export default function FroggerGame({ onScoreUpdate, onGameOver, highScore }: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('IDLE');

  // Frog position
  const frogRef = useRef({
    gridX: 6,
    gridY: 12,
    x: 6 * TILE_SIZE + TILE_SIZE / 2,
    y: 12 * TILE_SIZE + TILE_SIZE / 2,
    facing: 'UP' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  });

  // Goal bays (indices 1, 3, 5, 8, 10 in col coords)
  const GOAL_COLS = [1, 3, 6, 8, 10];
  const filledGoalsRef = useRef<boolean[]>([false, false, false, false, false]);

  const vehiclesRef = useRef<Vehicle[]>([]);
  const logsRef = useRef<LogItem[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const initWorld = () => {
    // Road lanes (rows 7 to 11)
    vehiclesRef.current = [
      // Row 7 (Race cars, fast right)
      { x: 50, row: 7, speed: 2.8, width: 38, color: '#EF4444', type: 'race' },
      { x: 260, row: 7, speed: 2.8, width: 38, color: '#EF4444', type: 'race' },
      // Row 8 (Trucks, slow left)
      { x: 100, row: 8, speed: -1.4, width: 70, color: '#F59E0B', type: 'truck' },
      { x: 340, row: 8, speed: -1.4, width: 70, color: '#F59E0B', type: 'truck' },
      // Row 9 (Yellow cabs, medium right)
      { x: 80, row: 9, speed: 2.1, width: 44, color: '#FACC15', type: 'car' },
      { x: 280, row: 9, speed: 2.1, width: 44, color: '#FACC15', type: 'car' },
      // Row 10 (Tractors, slow left)
      { x: 40, row: 10, speed: -1.2, width: 36, color: '#10B981', type: 'car' },
      { x: 220, row: 10, speed: -1.2, width: 36, color: '#10B981', type: 'car' },
      { x: 380, row: 10, speed: -1.2, width: 36, color: '#10B981', type: 'car' },
      // Row 11 (Convertibles, fast right)
      { x: 20, row: 11, speed: 2.5, width: 42, color: '#EC4899', type: 'car' },
      { x: 240, row: 11, speed: 2.5, width: 42, color: '#EC4899', type: 'car' }
    ];

    // River lanes (rows 1 to 5)
    logsRef.current = [
      // Row 1 (Medium logs, right)
      { x: 40, row: 1, speed: 1.8, width: 110, isTurtle: false },
      { x: 280, row: 1, speed: 1.8, width: 110, isTurtle: false },
      // Row 2 (Turtles, left)
      { x: 60, row: 2, speed: -1.9, width: 85, isTurtle: true },
      { x: 240, row: 2, speed: -1.9, width: 85, isTurtle: true },
      { x: 400, row: 2, speed: -1.9, width: 85, isTurtle: true },
      // Row 3 (Long logs, right)
      { x: 20, row: 3, speed: 2.6, width: 160, isTurtle: false },
      { x: 300, row: 3, speed: 2.6, width: 160, isTurtle: false },
      // Row 4 (Small logs, right)
      { x: 90, row: 4, speed: 1.5, width: 80, isTurtle: false },
      { x: 270, row: 4, speed: 1.5, width: 80, isTurtle: false },
      // Row 5 (Turtle triplets, left)
      { x: 40, row: 5, speed: -1.6, width: 90, isTurtle: true },
      { x: 220, row: 5, speed: -1.6, width: 90, isTurtle: true },
      { x: 390, row: 5, speed: -1.6, width: 90, isTurtle: true }
    ];
  };

  const resetFrog = () => {
    frogRef.current = {
      gridX: 6,
      gridY: 12,
      x: 6 * TILE_SIZE + TILE_SIZE / 2,
      y: 12 * TILE_SIZE + TILE_SIZE / 2,
      facing: 'UP'
    };
    setTimeLeft(30);
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    filledGoalsRef.current = [false, false, false, false, false];
    initWorld();
    resetFrog();
    setGameState('PLAYING');
    retroAudio.coin();
  };

  const moveFrog = (dx: number, dy: number, facing: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameState !== 'PLAYING') return;

    const frog = frogRef.current;
    const nextGridX = Math.max(0, Math.min(COLS - 1, frog.gridX + dx));
    const nextGridY = Math.max(0, Math.min(ROWS - 1, frog.gridY + dy));

    // Check goal bays landing on row 0
    if (nextGridY === 0) {
      const goalIndex = GOAL_COLS.indexOf(nextGridX);
      if (goalIndex === -1 || filledGoalsRef.current[goalIndex]) {
        // Hit grass barrier or already occupied bay
        return;
      }
      // Reached empty bay!
      filledGoalsRef.current[goalIndex] = true;
      const points = 100 + timeLeft * 10;
      setScore(s => {
        const next = s + points;
        onScoreUpdate(next);
        return next;
      });
      retroAudio.bonus();

      // Check if all 5 bays filled
      if (filledGoalsRef.current.every(Boolean)) {
        retroAudio.victory();
        setLevel(lvl => lvl + 1);
        filledGoalsRef.current = [false, false, false, false, false];
        setScore(s => s + 1000);
      }
      resetFrog();
      return;
    }

    frog.gridX = nextGridX;
    frog.gridY = nextGridY;
    frog.x = nextGridX * TILE_SIZE + TILE_SIZE / 2;
    frog.y = nextGridY * TILE_SIZE + TILE_SIZE / 2;
    frog.facing = facing;

    if (dy < 0) {
      // Forward progress score
      setScore(s => s + 10);
    }
    retroAudio.hop();
  };

  const frogDies = (message = 'splat') => {
    retroAudio.hit();
    setLives(l => {
      const remaining = l - 1;
      if (remaining <= 0) {
        retroAudio.gameOver();
        setGameState('GAMEOVER');
        onGameOver(score);
      } else {
        resetFrog();
      }
      return remaining;
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'p', 'P', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('PLAYING');
        return;
      }

      if (gameState === 'IDLE' || gameState === 'GAMEOVER' || gameState === 'VICTORY') {
        if (e.key === ' ' || e.key === 'Enter') {
          restartGame();
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') moveFrog(0, -1, 'UP');
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') moveFrog(0, 1, 'DOWN');
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') moveFrog(-1, 0, 'LEFT');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') moveFrog(1, 0, 'RIGHT');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, timeLeft]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          frogDies('time');
          return 30;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background: River (dark blue), Sidewalks (purple/dark slate), Road (black)
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // River background (rows 1 to 5)
    ctx.fillStyle = '#0369A1';
    ctx.fillRect(0, TILE_SIZE, WIDTH, TILE_SIZE * 5);

    // Goal Bank (row 0, dark green with lily bays)
    ctx.fillStyle = '#14532D';
    ctx.fillRect(0, 0, WIDTH, TILE_SIZE);

    // Lily pad bays
    GOAL_COLS.forEach((col, idx) => {
      const bayX = col * TILE_SIZE;
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(bayX + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);

      if (filledGoalsRef.current[idx]) {
        // Render saved happy frog in the bay
        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.arc(bayX + TILE_SIZE / 2, TILE_SIZE / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(bayX + TILE_SIZE / 2 - 4, TILE_SIZE / 2 - 4, 2, 0, Math.PI * 2);
        ctx.arc(bayX + TILE_SIZE / 2 + 4, TILE_SIZE / 2 - 4, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Median safe zone (row 6)
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 6 * TILE_SIZE, WIDTH, TILE_SIZE);

    // Highway background (rows 7 to 11)
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 7 * TILE_SIZE, WIDTH, TILE_SIZE * 5);

    // Road lane markings (dashed lines)
    ctx.strokeStyle = '#64748B';
    ctx.setLineDash([12, 12]);
    for (let r = 8; r <= 11; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(WIDTH, r * TILE_SIZE);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Starting safe sidewalk (row 12)
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 12 * TILE_SIZE, WIDTH, TILE_SIZE);

    // Draw Logs and Turtles
    logsRef.current.forEach(l => {
      const y = l.row * TILE_SIZE + 4;
      const h = TILE_SIZE - 8;

      if (l.isTurtle) {
        // Draw turtles shell trio
        const shellCount = Math.floor(l.width / 26);
        for (let i = 0; i < shellCount; i++) {
          const tx = l.x + i * 26 + 13;
          ctx.fillStyle = '#DC2626';
          ctx.beginPath();
          ctx.arc(tx, y + h / 2, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // Draw brown wooden log
        ctx.fillStyle = '#854D0E';
        ctx.beginPath();
        ctx.roundRect(l.x, y, l.width, h, 8);
        ctx.fill();
        ctx.fillStyle = '#A16207';
        ctx.fillRect(l.x + 8, y + 4, l.width - 16, h - 8);
      }
    });

    // Draw Vehicles
    vehiclesRef.current.forEach(v => {
      const y = v.row * TILE_SIZE + 6;
      const h = TILE_SIZE - 12;
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.roundRect(v.x, y, v.width, h, 6);
      ctx.fill();

      // Headlights & windows
      ctx.fillStyle = '#FEF08A';
      if (v.speed > 0) {
        ctx.fillRect(v.x + v.width - 4, y + 3, 3, 4);
        ctx.fillRect(v.x + v.width - 4, y + h - 7, 3, 4);
      } else {
        ctx.fillRect(v.x + 1, y + 3, 3, 4);
        ctx.fillRect(v.x + 1, y + h - 7, 3, 4);
      }
    });

    // Draw Frog Player
    const frog = frogRef.current;
    ctx.save();
    ctx.translate(frog.x, frog.y);

    let angle = 0;
    if (frog.facing === 'DOWN') angle = Math.PI;
    else if (frog.facing === 'LEFT') angle = -Math.PI / 2;
    else if (frog.facing === 'RIGHT') angle = Math.PI / 2;
    ctx.rotate(angle);

    // Green frog body
    ctx.fillStyle = '#22C55E';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Frog legs
    ctx.fillStyle = '#16A34A';
    ctx.beginPath();
    ctx.arc(-9, -7, 4.5, 0, Math.PI * 2);
    ctx.arc(9, -7, 4.5, 0, Math.PI * 2);
    ctx.arc(-10, 8, 5, 0, Math.PI * 2);
    ctx.arc(10, 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Frog big eyes
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(-5, -11, 3.5, 0, Math.PI * 2);
    ctx.arc(5, -11, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5, -11, 1.5, 0, Math.PI * 2);
    ctx.arc(5, -11, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      const frog = frogRef.current;

      // 1. Move vehicles
      vehiclesRef.current.forEach(v => {
        v.x += v.speed;
        if (v.speed > 0 && v.x > WIDTH) v.x = -v.width;
        else if (v.speed < 0 && v.x < -v.width) v.x = WIDTH;

        // Collision check with frog on road (rows 7 to 11)
        if (frog.gridY === v.row) {
          const frogLeft = frog.x - 12;
          const frogRight = frog.x + 12;
          const vLeft = v.x;
          const vRight = v.x + v.width;
          if (frogRight > vLeft && frogLeft < vRight) {
            frogDies('car');
          }
        }
      });

      // 2. Move logs and turtles (rows 1 to 5)
      let isOnLogOrTurtle = false;
      let platformSpeed = 0;

      logsRef.current.forEach(l => {
        l.x += l.speed;
        if (l.speed > 0 && l.x > WIDTH) l.x = -l.width;
        else if (l.speed < 0 && l.x < -l.width) l.x = WIDTH;

        if (frog.gridY === l.row) {
          if (frog.x >= l.x && frog.x <= l.x + l.width) {
            isOnLogOrTurtle = true;
            platformSpeed = l.speed;
          }
        }
      });

      // If frog is in river zone (rows 1 to 5)
      if (frog.gridY >= 1 && frog.gridY <= 5) {
        if (isOnLogOrTurtle) {
          // Drift with the platform
          frog.x += platformSpeed;
          frog.gridX = Math.floor(frog.x / TILE_SIZE);
          // River border death
          if (frog.x < 10 || frog.x > WIDTH - 10) {
            frogDies('water');
          }
        } else {
          // Drowned in the river!
          frogDies('water');
        }
      }

      // 3. Render
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    initWorld();
    renderCanvas();
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div>
          <span className="text-slate-400">PONTOS: </span>
          <span className="text-amber-400 font-bold tabular-nums text-sm">{score}</span>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-400">TEMPO: </span>
            <span
              className={`font-bold tabular-nums ${
                timeLeft < 8 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {timeLeft}s
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">SAPOS: </span>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${
                    i < lives ? 'bg-emerald-400' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="text-slate-400">RECORDE: </span>
          <span className="text-emerald-400 font-bold tabular-nums text-sm">
            {Math.max(highScore, score)}
          </span>
        </div>
      </div>

      {/* Screen Frame */}
      <div className="relative border-x-4 border-b-4 border-slate-800 bg-black flex justify-center items-center shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="max-w-full h-auto block"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'IDLE' && (
              <>
                <h3 className="text-2xl font-black text-emerald-400 tracking-wider font-mono mb-2">
                  FROGGER 1981
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Cruze a rodovia movimentada sem ser atingido e navegue pelo rio perigoso em toras e tartarugas até alcançar as 5 baías!
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Atravessar Agora</span>
                </button>
              </>
            )}

            {gameState === 'PAUSED' && (
              <>
                <h3 className="text-2xl font-black text-emerald-400 tracking-wider font-mono mb-4">
                  PAUSADO
                </h3>
                <button
                  onClick={() => setGameState('PLAYING')}
                  className="px-6 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Continuar</span>
                </button>
              </>
            )}

            {gameState === 'GAMEOVER' && (
              <>
                <h3 className="text-2xl font-black text-rose-500 tracking-wider font-mono mb-2">
                  FIM DE JOGO
                </h3>
                <p className="text-xs text-slate-400 mb-1 font-mono">Pontuação Final:</p>
                <p className="text-3xl font-black text-white font-mono tabular-nums mb-6">
                  {score}
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Nova Partida</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Touch Direction Controls */}
      <div className="w-full mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => moveFrog(0, -1, 'UP')}
          className="w-14 h-12 bg-slate-800 active:bg-emerald-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => moveFrog(-1, 0, 'LEFT')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => moveFrog(0, 1, 'DOWN')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => moveFrog(1, 0, 'RIGHT')}
            className="w-14 h-12 bg-slate-800 active:bg-emerald-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
