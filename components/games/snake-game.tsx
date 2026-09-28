'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SnakeGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function SnakeGame({ onScoreUpdate, onGameOver, highScore }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game states
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [applesEaten, setApplesEaten] = useState(0);
  const [difficulty, setDifficulty] = useState<'NORMAL' | 'RAPIDO' | 'INSANO'>('NORMAL');
  const [wrapWalls, setWrapWalls] = useState(false);

  // References for game loop
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]);
  const directionRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirectionRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const bonusFoodRef = useRef<{ point: Point; timeLeft: number } | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTickRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const currentScoreRef = useRef<number>(0);

  const GRID_SIZE = 22;

  const getTickInterval = () => {
    switch (difficulty) {
      case 'RAPIDO': return 85;
      case 'INSANO': return 60;
      default: return 110;
    }
  };

  const spawnFood = useCallback((snake: Point[]): Point => {
    let newFood: Point;
    let collision = true;
    while (collision) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      collision = snake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
    }
    return newFood!;
  }, [GRID_SIZE]);

  const createParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x: x * 20 + 10,
        y: y * 20 + 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: Math.random() * 15 + 15
      });
    }
  };

  const startGame = () => {
    retroAudio.coin();
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    snakeRef.current = initialSnake;
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    foodRef.current = spawnFood(initialSnake);
    bonusFoodRef.current = null;
    particlesRef.current = [];
    currentScoreRef.current = 0;
    setScore(0);
    setApplesEaten(0);
    setGameState('PLAYING');
    if (onScoreUpdate) onScoreUpdate(0);
  };

  const togglePause = () => {
    if (gameState === 'PLAYING') {
      retroAudio.blip(180);
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      retroAudio.blip(280);
      setGameState('PLAYING');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }

      if (gameState !== 'PLAYING') {
        if (e.key === ' ' || e.key === 'Enter') {
          if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
            startGame();
          }
        }
        return;
      }

      const cur = directionRef.current;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && cur.y === 0) {
        nextDirectionRef.current = { x: 0, y: -1 };
        retroAudio.blip(320);
      } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && cur.y === 0) {
        nextDirectionRef.current = { x: 0, y: 1 };
        retroAudio.blip(320);
      } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && cur.x === 0) {
        nextDirectionRef.current = { x: -1, y: 0 };
        retroAudio.blip(320);
      } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && cur.x === 0) {
        nextDirectionRef.current = { x: 1, y: 0 };
        retroAudio.blip(320);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Main game tick and render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      // Handle step execution
      if (gameState === 'PLAYING') {
        if (!lastTickRef.current) lastTickRef.current = timestamp;
        const delta = timestamp - lastTickRef.current;
        const tickInterval = getTickInterval();

        if (delta >= tickInterval) {
          lastTickRef.current = timestamp;

          // Apply buffered direction
          directionRef.current = nextDirectionRef.current;
          const head = snakeRef.current[0];
          const newHead: Point = {
            x: head.x + directionRef.current.x,
            y: head.y + directionRef.current.y
          };

          // Wall collision check
          if (wrapWalls) {
            if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
            if (newHead.x >= GRID_SIZE) newHead.x = 0;
            if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
            if (newHead.y >= GRID_SIZE) newHead.y = 0;
          } else {
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
              // Hit wall
              retroAudio.gameOver();
              setGameState('GAMEOVER');
              saveHighScore('snake', currentScoreRef.current);
              if (onGameOver) onGameOver(currentScoreRef.current);
              return;
            }
          }

          // Self collision check
          const hitSelf = snakeRef.current.some(seg => seg.x === newHead.x && seg.y === newHead.y);
          if (hitSelf) {
            retroAudio.gameOver();
            setGameState('GAMEOVER');
            saveHighScore('snake', currentScoreRef.current);
            if (onGameOver) onGameOver(currentScoreRef.current);
            return;
          }

          // Move snake
          const newSnake = [newHead, ...snakeRef.current];

          // Check normal food
          if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
            retroAudio.eat();
            createParticles(newHead.x, newHead.y, '#EF4444', 10);
            const addedScore = 10;
            currentScoreRef.current += addedScore;
            setScore(currentScoreRef.current);
            setApplesEaten(prev => {
              const nextVal = prev + 1;
              // Spawn rare golden apple every 5 apples
              if (nextVal % 5 === 0 && !bonusFoodRef.current) {
                bonusFoodRef.current = {
                  point: spawnFood(newSnake),
                  timeLeft: 80 // ticks
                };
              }
              return nextVal;
            });
            foodRef.current = spawnFood(newSnake);
            if (onScoreUpdate) onScoreUpdate(currentScoreRef.current);
          } else if (
            bonusFoodRef.current &&
            newHead.x === bonusFoodRef.current.point.x &&
            newHead.y === bonusFoodRef.current.point.y
          ) {
            // Ate golden bonus apple
            retroAudio.bonus();
            createParticles(newHead.x, newHead.y, '#FBBF24', 20);
            currentScoreRef.current += 50;
            setScore(currentScoreRef.current);
            bonusFoodRef.current = null;
            if (onScoreUpdate) onScoreUpdate(currentScoreRef.current);
          } else {
            // Remove tail
            newSnake.pop();
          }

          snakeRef.current = newSnake;

          // Decrement bonus food timer
          if (bonusFoodRef.current) {
            bonusFoodRef.current.timeLeft -= 1;
            if (bonusFoodRef.current.timeLeft <= 0) {
              bonusFoodRef.current = null;
            }
          }
        }
      }

      // Render frame
      render(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const render = (context: CanvasRenderingContext2D) => {
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // Dark CRT background with subtle green grid
      context.fillStyle = '#08140e';
      context.fillRect(0, 0, width, height);

      // Grid lines
      context.strokeStyle = 'rgba(16, 185, 129, 0.05)';
      context.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        context.beginPath();
        context.moveTo(i * cellSize, 0);
        context.lineTo(i * cellSize, height);
        context.stroke();

        context.beginPath();
        context.moveTo(0, i * cellSize);
        context.lineTo(width, i * cellSize);
        context.stroke();
      }

      // Border outline
      context.strokeStyle = wrapWalls ? 'rgba(56, 189, 248, 0.4)' : 'rgba(16, 185, 129, 0.5)';
      context.lineWidth = 3;
      context.strokeRect(1, 1, width - 2, height - 2);

      // Render regular Food (Apple)
      const food = foodRef.current;
      const fx = food.x * cellSize + cellSize / 2;
      const fy = food.y * cellSize + cellSize / 2;
      const fRadius = cellSize * 0.42;

      context.save();
      context.shadowColor = '#EF4444';
      context.shadowBlur = 10;
      context.fillStyle = '#EF4444';
      context.beginPath();
      context.arc(fx, fy, fRadius, 0, Math.PI * 2);
      context.fill();

      // Apple leaf
      context.fillStyle = '#10B981';
      context.beginPath();
      context.ellipse(fx + 2, fy - fRadius, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      context.fill();
      context.restore();

      // Render Bonus Golden Apple if present
      if (bonusFoodRef.current) {
        const b = bonusFoodRef.current.point;
        const bx = b.x * cellSize + cellSize / 2;
        const by = b.y * cellSize + cellSize / 2;
        const pulse = Math.sin(Date.now() / 150) * 2;

        context.save();
        context.shadowColor = '#F59E0B';
        context.shadowBlur = 15;
        context.fillStyle = '#F59E0B';
        context.beginPath();
        context.arc(bx, by, cellSize * 0.45 + pulse, 0, Math.PI * 2);
        context.fill();

        // Star sparkle inside
        context.fillStyle = '#FFF';
        context.fillRect(bx - 2, by - 2, 4, 4);
        context.restore();
      }

      // Render Snake Body
      const snake = snakeRef.current;
      snake.forEach((segment, index) => {
        const sx = segment.x * cellSize;
        const sy = segment.y * cellSize;
        const isHead = index === 0;

        context.save();
        if (isHead) {
          context.fillStyle = '#34D399';
          context.shadowColor = '#10B981';
          context.shadowBlur = 8;
          context.beginPath();
          context.roundRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2, 5);
          context.fill();

          // Snake Eyes
          context.fillStyle = '#064E3B';
          const dir = directionRef.current;
          let eye1 = { x: sx + 4, y: sy + 4 };
          let eye2 = { x: sx + cellSize - 6, y: sy + 4 };

          if (dir.x === 1) {
            eye1 = { x: sx + cellSize - 5, y: sy + 4 };
            eye2 = { x: sx + cellSize - 5, y: sy + cellSize - 6 };
          } else if (dir.x === -1) {
            eye1 = { x: sx + 3, y: sy + 4 };
            eye2 = { x: sx + 3, y: sy + cellSize - 6 };
          } else if (dir.y === 1) {
            eye1 = { x: sx + 4, y: sy + cellSize - 5 };
            eye2 = { x: sx + cellSize - 6, y: sy + cellSize - 5 };
          }

          context.fillRect(eye1.x, eye1.y, 3, 3);
          context.fillRect(eye2.x, eye2.y, 3, 3);
        } else {
          // Body segment with gradient tapering
          const ratio = (snake.length - index) / snake.length;
          context.fillStyle = `rgba(16, 185, 129, ${0.4 + ratio * 0.5})`;
          context.beginPath();
          context.roundRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4, 3);
          context.fill();
        }
        context.restore();
      });

      // Update & Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;

        const progress = p.life / p.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
        } else {
          context.save();
          context.globalAlpha = 1 - progress;
          context.fillStyle = p.color;
          context.fillRect(p.x - 2, p.y - 2, 4, 4);
          context.restore();
        }
      }

      // Overlays when not playing
      if (gameState === 'IDLE') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#34D399';
        context.font = 'bold 22px monospace';
        context.fillText('COBRINHA CLÁSSICA', width / 2, height / 2 - 30);

        context.fillStyle = '#E2E8F0';
        context.font = '14px monospace';
        context.fillText('Pressione ESPAÇO ou Iniciar', width / 2, height / 2 + 10);
        context.fillStyle = '#94A3B8';
        context.font = '12px monospace';
        context.fillText('Setas ou WASD para movimentar', width / 2, height / 2 + 35);
      } else if (gameState === 'PAUSED') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#F59E0B';
        context.font = 'bold 24px monospace';
        context.fillText('JOGO PAUSADO', width / 2, height / 2 - 10);

        context.fillStyle = '#E2E8F0';
        context.font = '13px monospace';
        context.fillText('Pressione P para continuar', width / 2, height / 2 + 25);
      } else if (gameState === 'GAMEOVER') {
        context.fillStyle = 'rgba(15, 23, 42, 0.85)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#EF4444';
        context.font = 'bold 26px monospace';
        context.fillText('FIM DE JOGO!', width / 2, height / 2 - 35);

        context.fillStyle = '#F8FAFC';
        context.font = '16px monospace';
        context.fillText(`Pontuação Final: ${currentScoreRef.current}`, width / 2, height / 2 + 5);

        if (currentScoreRef.current >= highScore && currentScoreRef.current > 0) {
          context.fillStyle = '#FBBF24';
          context.font = 'bold 13px monospace';
          context.fillText('★ NOVO RECORDE PESSOAL! ★', width / 2, height / 2 + 30);
        }

        context.fillStyle = '#94A3B8';
        context.font = '13px monospace';
        context.fillText('Pressione Iniciar para jogar de novo', width / 2, height / 2 + 65);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, difficulty, wrapWalls, highScore, onGameOver, onScoreUpdate, spawnFood]);

  // Touch pad handlers
  const handleDirection = (dir: Point) => {
    if (gameState !== 'PLAYING') return;
    const cur = directionRef.current;
    if (dir.x !== 0 && cur.x === 0) {
      nextDirectionRef.current = dir;
      retroAudio.blip(300);
    } else if (dir.y !== 0 && cur.y === 0) {
      nextDirectionRef.current = dir;
      retroAudio.blip(300);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Top HUD with non-pill tabular figures */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>PONTOS: <strong className="text-emerald-400 tabular-nums text-sm">{score}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>MAÇÃS: <strong className="text-red-400 tabular-nums text-sm">{applesEaten}</strong></span>
        </div>
        <div>
          <span>RECORDE: <strong className="text-amber-400 tabular-nums text-sm">{Math.max(score, highScore)}</strong></span>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden bg-black shadow-2xl w-full aspect-square max-w-[440px]">
        <canvas
          ref={canvasRef}
          width={440}
          height={440}
          className="w-full h-full block"
        />
      </div>

      {/* Game Controls Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-2">
          {gameState === 'PLAYING' || gameState === 'PAUSED' ? (
            <button
              onClick={togglePause}
              className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded border border-slate-600"
            >
              {gameState === 'PAUSED' ? 'Continuar' : 'Pausar (P)'}
            </button>
          ) : (
            <button
              onClick={startGame}
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform rounded shadow"
            >
              {gameState === 'GAMEOVER' ? 'Jogar Novamente' : 'Iniciar Jogo'}
            </button>
          )}

          <button
            onClick={() => setWrapWalls(!wrapWalls)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
              wrapWalls
                ? 'bg-sky-950 border-sky-600 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Paredes: {wrapWalls ? 'Passagem Livre' : 'Sólidas'}
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs">
          <span className="text-slate-400 text-[11px] px-1.5">Velocidade:</span>
          {(['NORMAL', 'RAPIDO', 'INSANO'] as const).map(diff => (
            <button
              key={diff}
              onClick={() => setDifficulty(diff)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                difficulty === diff
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {diff === 'NORMAL' ? 'Normal' : diff === 'RAPIDO' ? 'Rápido' : 'Insano'}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Touch Direction Pad */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex flex-col items-center sm:hidden">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Controles Touch</span>
        <div className="grid grid-cols-3 gap-2 w-44">
          <div />
          <button
            onClick={() => handleDirection({ x: 0, y: -1 })}
            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-600 shadow"
            aria-label="Cima"
          >
            ▲
          </button>
          <div />
          <button
            onClick={() => handleDirection({ x: -1, y: 0 })}
            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-600 shadow"
            aria-label="Esquerda"
          >
            ◀
          </button>
          <button
            onClick={() => handleDirection({ x: 0, y: 1 })}
            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-600 shadow"
            aria-label="Baixo"
          >
            ▼
          </button>
          <button
            onClick={() => handleDirection({ x: 1, y: 0 })}
            className="w-12 h-12 bg-slate-800 hover:bg-slate-700 active:bg-emerald-700 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-600 shadow"
            aria-label="Direita"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
