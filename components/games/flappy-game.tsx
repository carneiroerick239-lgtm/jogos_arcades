'use client';

import React, { useRef, useEffect, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, Pause, RotateCcw, Award } from 'lucide-react';

interface FlappyGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

const WIDTH = 400;
const HEIGHT = 500;
const PIPE_WIDTH = 56;
const PIPE_GAP = 120;
const PIPE_SPEED = 2.4;
const GRAVITY = 0.28;
const JUMP_FORCE = -5.8;

export default function FlappyGame({ onScoreUpdate, onGameOver, highScore }: FlappyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');

  const birdRef = useRef({
    x: 80,
    y: HEIGHT / 2,
    vy: 0,
    radius: 12,
    angle: 0
  });

  const pipesRef = useRef<Pipe[]>([]);
  const groundOffsetRef = useRef(0);
  const frameCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const flap = () => {
    if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
      restartGame();
      return;
    }
    if (gameState === 'PLAYING') {
      birdRef.current.vy = JUMP_FORCE;
      retroAudio.flap();
    }
  };

  const restartGame = () => {
    setScore(0);
    birdRef.current = {
      x: 80,
      y: HEIGHT / 2 - 20,
      vy: JUMP_FORCE * 0.8,
      radius: 12,
      angle: 0
    };
    pipesRef.current = [
      createPipe(WIDTH + 50),
      createPipe(WIDTH + 240)
    ];
    frameCountRef.current = 0;
    setGameState('PLAYING');
    retroAudio.coin();
  };

  const createPipe = (startX: number): Pipe => {
    const minHeight = 50;
    const maxHeight = HEIGHT - PIPE_GAP - 90;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    return {
      x: startX,
      topHeight,
      bottomY: topHeight + PIPE_GAP,
      passed: false
    };
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'w', 'W', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        if (gameState === 'PLAYING') setGameState('PAUSED');
        else if (gameState === 'PAUSED') setGameState('PLAYING');
        return;
      }

      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        flap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    skyGrad.addColorStop(0, '#0284C7');
    skyGrad.addColorStop(0.7, '#38BDF8');
    skyGrad.addColorStop(1, '#BAE6FD');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Fluffy pixel clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(60, 90, 26, 0, Math.PI * 2);
    ctx.arc(90, 80, 32, 0, Math.PI * 2);
    ctx.arc(120, 90, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(280, 130, 22, 0, Math.PI * 2);
    ctx.arc(310, 120, 28, 0, Math.PI * 2);
    ctx.arc(340, 130, 22, 0, Math.PI * 2);
    ctx.fill();

    // Distant city silhouette
    ctx.fillStyle = '#0369A1';
    for (let i = 0; i < 10; i++) {
      const bh = 30 + ((i * 37) % 50);
      ctx.fillRect(i * 42, HEIGHT - 40 - bh, 38, bh);
    }

    // Draw Pipes
    pipesRef.current.forEach(p => {
      // Top Pipe body
      ctx.fillStyle = '#15803D';
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topHeight);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(p.x + 4, 0, PIPE_WIDTH - 8, p.topHeight);
      // Top Pipe lip rim
      ctx.fillStyle = '#15803D';
      ctx.fillRect(p.x - 4, p.topHeight - 20, PIPE_WIDTH + 8, 20);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(p.x - 2, p.topHeight - 18, PIPE_WIDTH + 4, 16);

      // Bottom Pipe body
      const bottomHeight = HEIGHT - 40 - p.bottomY;
      ctx.fillStyle = '#15803D';
      ctx.fillRect(p.x, p.bottomY, PIPE_WIDTH, bottomHeight);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(p.x + 4, p.bottomY, PIPE_WIDTH - 8, bottomHeight);
      // Bottom Pipe lip rim
      ctx.fillStyle = '#15803D';
      ctx.fillRect(p.x - 4, p.bottomY, PIPE_WIDTH + 8, 20);
      ctx.fillStyle = '#4ADE80';
      ctx.fillRect(p.x - 2, p.bottomY + 2, PIPE_WIDTH + 4, 16);
    });

    // Ground turf
    ctx.fillStyle = '#A16207';
    ctx.fillRect(0, HEIGHT - 40, WIDTH, 40);
    // Green grass top layer
    ctx.fillStyle = '#16A34A';
    ctx.fillRect(0, HEIGHT - 40, WIDTH, 10);

    // Ground scroll stripes
    ctx.fillStyle = '#15803D';
    for (let x = -groundOffsetRef.current; x < WIDTH; x += 20) {
      ctx.fillRect(x, HEIGHT - 40, 10, 10);
    }

    // Draw Bird (Yellow pixel aviator)
    const bird = birdRef.current;
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.angle);

    // Body
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wing
    const wingFlap = Math.sin(frameCountRef.current * 0.35) * 4;
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.ellipse(-4, wingFlap, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.moveTo(11, -1);
    ctx.lineTo(19, 2);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      const bird = birdRef.current;
      frameCountRef.current++;

      // 1. Bird physics
      bird.vy += GRAVITY;
      bird.y += bird.vy;
      bird.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 6, (bird.vy / 10) * (Math.PI / 3)));

      // Ground limit
      const groundY = HEIGHT - 40;
      if (bird.y + bird.radius >= groundY) {
        retroAudio.hit();
        retroAudio.gameOver();
        setGameState('GAMEOVER');
        onGameOver(score);
        return;
      }

      // Ceiling limit
      if (bird.y - bird.radius <= 0) {
        bird.y = bird.radius;
        bird.vy = 0;
      }

      // 2. Ground scroll
      groundOffsetRef.current = (groundOffsetRef.current + PIPE_SPEED) % 20;

      // 3. Move and spawn pipes
      pipesRef.current.forEach(p => {
        p.x -= PIPE_SPEED;

        // Score increment
        if (!p.passed && p.x + PIPE_WIDTH < bird.x) {
          p.passed = true;
          setScore(s => {
            const next = s + 1;
            onScoreUpdate(next);
            return next;
          });
          retroAudio.eat();
        }

        // Collision detection
        const inX = bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + PIPE_WIDTH;
        if (inX) {
          const inTop = bird.y - bird.radius < p.topHeight;
          const inBottom = bird.y + bird.radius > p.bottomY;
          if (inTop || inBottom) {
            retroAudio.hit();
            retroAudio.gameOver();
            setGameState('GAMEOVER');
            onGameOver(score);
            return;
          }
        }
      });

      // Remove off-screen pipes and spawn new ones
      if (pipesRef.current.length > 0 && pipesRef.current[0].x < -PIPE_WIDTH) {
        pipesRef.current.shift();
        const lastPipeX = pipesRef.current[pipesRef.current.length - 1].x;
        pipesRef.current.push(createPipe(lastPipeX + 190));
      }

      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, score]);

  useEffect(() => {
    renderCanvas();
  }, []);

  const getMedal = (s: number) => {
    if (s >= 50) return { title: 'OURO', color: 'text-amber-400' };
    if (s >= 25) return { title: 'PRATA', color: 'text-slate-300' };
    if (s >= 10) return { title: 'BRONZE', color: 'text-amber-700' };
    return null;
  };

  const medal = getMedal(score);

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div>
          <span className="text-slate-400">PONTOS: </span>
          <span className="text-amber-400 font-bold tabular-nums text-sm">{score}</span>
        </div>

        <div>
          <span className="text-slate-400">RECORDE: </span>
          <span className="text-emerald-400 font-bold tabular-nums text-sm">
            {Math.max(highScore, score)}
          </span>
        </div>
      </div>

      {/* Screen Frame */}
      <div
        onClick={flap}
        className="relative border-x-4 border-b-4 border-slate-800 bg-sky-500 flex justify-center items-center shadow-inner overflow-hidden cursor-pointer select-none"
      >
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="max-w-full h-auto block"
        />

        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'IDLE' && (
              <>
                <h3 className="text-2xl font-black text-amber-400 tracking-wider font-mono mb-2">
                  FLAPPY PIXEL
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Toque na tela ou pressione Espaço para bater asas e flutuar com precisão pelos vãos dos canos!
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Alçar Voo</span>
                </button>
              </>
            )}

            {gameState === 'PAUSED' && (
              <>
                <h3 className="text-2xl font-black text-amber-400 tracking-wider font-mono mb-4">
                  PAUSADO
                </h3>
                <button
                  onClick={() => setGameState('PLAYING')}
                  className="px-6 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Continuar</span>
                </button>
              </>
            )}

            {gameState === 'GAMEOVER' && (
              <>
                <h3 className="text-2xl font-black text-rose-500 tracking-wider font-mono mb-2">
                  FIM DO VOO
                </h3>
                <p className="text-xs text-slate-400 mb-1 font-mono">Canos Ultrapassados:</p>
                <p className="text-3xl font-black text-white font-mono tabular-nums mb-3">
                  {score}
                </p>

                {medal && (
                  <div className="flex items-center gap-1.5 mb-4 text-xs font-mono font-bold px-3 py-1 bg-slate-900 border border-slate-700 rounded-full">
                    <Award className={`w-4 h-4 ${medal.color}`} />
                    <span className={medal.color}>MEDALHA DE {medal.title}</span>
                  </div>
                )}

                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Voar Novamente</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tap Instruction Button */}
      <div className="w-full mt-3 text-center">
        <button
          onClick={flap}
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 text-slate-300 border border-slate-800 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <span>Toque ou Pressione [Espaço] para Bater Asas</span>
        </button>
      </div>
    </div>
  );
}
