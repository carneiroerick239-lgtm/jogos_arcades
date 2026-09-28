'use client';

import React, { useEffect, useRef, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  hits: number;
  maxHits: number;
  powerup?: 'EXPAND' | 'SLOW' | 'MULTIBALL' | 'LASER';
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface FallingPowerup {
  x: number;
  y: number;
  vy: number;
  type: 'EXPAND' | 'SLOW' | 'MULTIBALL' | 'LASER';
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

interface LaserBullet {
  x: number;
  y: number;
  vy: number;
}

interface BreakoutGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function BreakoutGame({ onScoreUpdate, onGameOver, highScore }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('IDLE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [activePowerup, setActivePowerup] = useState<string | null>(null);

  const CANVAS_WIDTH = 500;
  const CANVAS_HEIGHT = 440;

  // Refs for animation
  const paddleRef = useRef<{ x: number; y: number; w: number; h: number; baseW: number }>({
    x: 210,
    y: 410,
    w: 80,
    h: 12,
    baseW: 80
  });
  const ballsRef = useRef<Ball[]>([]);
  const bricksRef = useRef<Brick[]>([]);
  const powerupsRef = useRef<FallingPowerup[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lasersRef = useRef<LaserBullet[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationFrameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const laserTimerRef = useRef<number>(0);

  const createLevelBricks = (lvl: number): Brick[] => {
    const bricks: Brick[] = [];
    const rows = 5 + Math.min(2, lvl - 1);
    const cols = 9;
    const padding = 6;
    const brickW = (CANVAS_WIDTH - (cols + 1) * padding) / cols;
    const brickH = 16;
    const startY = 40;

    const rowColors = [
      { color: '#EF4444', pts: 50 },
      { color: '#F97316', pts: 40 },
      { color: '#EAB308', pts: 30 },
      { color: '#10B981', pts: 20 },
      { color: '#38BDF8', pts: 10 },
      { color: '#A855F7', pts: 60 },
      { color: '#EC4899', pts: 70 }
    ];

    const powerTypes: Array<'EXPAND' | 'SLOW' | 'MULTIBALL' | 'LASER'> = ['EXPAND', 'SLOW', 'MULTIBALL', 'LASER'];

    for (let r = 0; r < rows; r++) {
      const info = rowColors[r % rowColors.length];
      for (let c = 0; c < cols; c++) {
        const hasPowerup = Math.random() < 0.18;
        const powerup = hasPowerup ? powerTypes[Math.floor(Math.random() * powerTypes.length)] : undefined;
        const maxHits = lvl > 1 && r === 0 ? 2 : 1;

        bricks.push({
          x: padding + c * (brickW + padding),
          y: startY + r * (brickH + padding),
          w: brickW,
          h: brickH,
          color: info.color,
          points: info.pts * lvl,
          hits: 0,
          maxHits,
          powerup
        });
      }
    }
    return bricks;
  };

  const createParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: Math.random() * 15 + 10
      });
    }
  };

  const resetPaddleAndBall = () => {
    paddleRef.current = {
      x: (CANVAS_WIDTH - 80) / 2,
      y: 410,
      w: 80,
      h: 12,
      baseW: 80
    };
    ballsRef.current = [
      {
        x: CANVAS_WIDTH / 2,
        y: 395,
        vx: (Math.random() > 0.5 ? 1 : -1) * 3.5,
        vy: -4,
        radius: 5
      }
    ];
    powerupsRef.current = [];
    lasersRef.current = [];
    setActivePowerup(null);
  };

  const startGame = () => {
    retroAudio.coin();
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setLevel(1);
    bricksRef.current = createLevelBricks(1);
    particlesRef.current = [];
    resetPaddleAndBall();
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

  // Keyboard and mouse listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }

      keysRef.current[e.key.toLowerCase()] = true;

      if (gameState !== 'PLAYING' && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || gameState !== 'PLAYING') return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - paddleRef.current.w, mouseX - paddleRef.current.w / 2));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [gameState]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = () => {
      if (!isRunning) return;

      if (gameState === 'PLAYING') {
        const keys = keysRef.current;
        const paddleSpeed = 7;
        const paddle = paddleRef.current;

        // Move paddle via keyboard
        if (keys['arrowleft'] || keys['a']) {
          paddle.x = Math.max(0, paddle.x - paddleSpeed);
        }
        if (keys['arrowright'] || keys['d']) {
          paddle.x = Math.min(CANVAS_WIDTH - paddle.w, paddle.x + paddleSpeed);
        }

        // Fire laser if active
        if (activePowerup === 'LASER' && (keys[' '] || Date.now() - laserTimerRef.current > 350)) {
          laserTimerRef.current = Date.now();
          lasersRef.current.push({ x: paddle.x + 8, y: paddle.y - 4, vy: -7 });
          lasersRef.current.push({ x: paddle.x + paddle.w - 8, y: paddle.y - 4, vy: -7 });
          retroAudio.laser();
        }

        // Update lasers
        for (let i = lasersRef.current.length - 1; i >= 0; i--) {
          const l = lasersRef.current[i];
          l.y += l.vy;
          if (l.y < 0) {
            lasersRef.current.splice(i, 1);
            continue;
          }

          // Check hit brick
          for (let bIdx = bricksRef.current.length - 1; bIdx >= 0; bIdx--) {
            const brick = bricksRef.current[bIdx];
            if (l.x >= brick.x && l.x <= brick.x + brick.w && l.y >= brick.y && l.y <= brick.y + brick.h) {
              lasersRef.current.splice(i, 1);
              brick.hits += 1;
              if (brick.hits >= brick.maxHits) {
                retroAudio.hit();
                createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 8);
                scoreRef.current += brick.points;
                setScore(scoreRef.current);
                bricksRef.current.splice(bIdx, 1);
              }
              break;
            }
          }
        }

        // Update falling powerups
        for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
          const p = powerupsRef.current[i];
          p.y += p.vy;

          // Check paddle catch
          if (
            p.y >= paddle.y &&
            p.y <= paddle.y + paddle.h &&
            p.x >= paddle.x &&
            p.x <= paddle.x + paddle.w
          ) {
            retroAudio.bonus();
            applyPowerup(p.type);
            powerupsRef.current.splice(i, 1);
            continue;
          }

          // Offscreen
          if (p.y > CANVAS_HEIGHT) {
            powerupsRef.current.splice(i, 1);
          }
        }

        // Update Balls
        for (let bIndex = ballsRef.current.length - 1; bIndex >= 0; bIndex--) {
          const ball = ballsRef.current[bIndex];
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall bounces
          if (ball.x <= ball.radius) {
            ball.x = ball.radius;
            ball.vx = Math.abs(ball.vx);
            retroAudio.bounce(360);
          } else if (ball.x >= CANVAS_WIDTH - ball.radius) {
            ball.x = CANVAS_WIDTH - ball.radius;
            ball.vx = -Math.abs(ball.vx);
            retroAudio.bounce(360);
          }

          if (ball.y <= ball.radius) {
            ball.y = ball.radius;
            ball.vy = Math.abs(ball.vy);
            retroAudio.bounce(360);
          }

          // Paddle bounce
          if (
            ball.y + ball.radius >= paddle.y &&
            ball.y - ball.radius <= paddle.y + paddle.h &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.w &&
            ball.vy > 0
          ) {
            // Angle variation based on paddle hit point
            const hitPoint = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const maxAngle = (Math.PI / 3); // 60 deg
            const angle = hitPoint * maxAngle;
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;
            ball.y = paddle.y - ball.radius;
            retroAudio.bounce(480);
          }

          // Brick collision
          for (let i = bricksRef.current.length - 1; i >= 0; i--) {
            const brick = bricksRef.current[i];
            if (
              ball.x + ball.radius >= brick.x &&
              ball.x - ball.radius <= brick.x + brick.w &&
              ball.y + ball.radius >= brick.y &&
              ball.y - ball.radius <= brick.y + brick.h
            ) {
              brick.hits += 1;
              ball.vy = -ball.vy;
              retroAudio.hit();
              createParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

              if (brick.hits >= brick.maxHits) {
                // Drop powerup?
                if (brick.powerup) {
                  powerupsRef.current.push({
                    x: brick.x + brick.w / 2,
                    y: brick.y + brick.h / 2,
                    vy: 2.2,
                    type: brick.powerup
                  });
                }
                scoreRef.current += brick.points;
                setScore(scoreRef.current);
                if (onScoreUpdate) onScoreUpdate(scoreRef.current);
                bricksRef.current.splice(i, 1);
              }
              break;
            }
          }

          // Ball drops below bottom
          if (ball.y - ball.radius > CANVAS_HEIGHT) {
            ballsRef.current.splice(bIndex, 1);
          }
        }

        // Check if all balls lost
        if (ballsRef.current.length === 0) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          retroAudio.hit();

          if (livesRef.current <= 0) {
            // Game Over
            retroAudio.gameOver();
            setGameState('GAMEOVER');
            saveHighScore('breakout', scoreRef.current);
            if (onGameOver) onGameOver(scoreRef.current);
          } else {
            resetPaddleAndBall();
          }
        }

        // Check level cleared
        if (bricksRef.current.length === 0) {
          retroAudio.victory();
          setLevel(prev => {
            const nextLvl = prev + 1;
            bricksRef.current = createLevelBricks(nextLvl);
            resetPaddleAndBall();
            return nextLvl;
          });
        }
      }

      // Render
      render(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const applyPowerup = (type: 'EXPAND' | 'SLOW' | 'MULTIBALL' | 'LASER') => {
      setActivePowerup(type);
      if (type === 'EXPAND') {
        paddleRef.current.w = 120;
      } else if (type === 'SLOW') {
        ballsRef.current.forEach(b => {
          b.vx *= 0.75;
          b.vy *= 0.75;
        });
      } else if (type === 'MULTIBALL') {
        if (ballsRef.current.length > 0) {
          const main = ballsRef.current[0];
          ballsRef.current.push({
            x: main.x,
            y: main.y,
            vx: -3,
            vy: -4,
            radius: main.radius
          });
          ballsRef.current.push({
            x: main.x,
            y: main.y,
            vx: 3.5,
            vy: -3.5,
            radius: main.radius
          });
        }
      }
    };

    const render = (context: CanvasRenderingContext2D) => {
      // Dark slate arcade space
      context.fillStyle = '#0a0d14';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Border
      context.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      context.lineWidth = 3;
      context.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

      // Render Bricks
      bricksRef.current.forEach(b => {
        context.save();
        context.fillStyle = b.color;
        context.shadowColor = b.color;
        context.shadowBlur = 4;
        context.beginPath();
        context.roundRect(b.x, b.y, b.w, b.h, 2);
        context.fill();

        // Brick 3D bevel shine
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.fillRect(b.x, b.y, b.w, 3);
        context.restore();

        // Powerup marker
        if (b.powerup) {
          context.fillStyle = '#FFF';
          context.font = 'bold 9px monospace';
          context.textAlign = 'center';
          context.fillText('★', b.x + b.w / 2, b.y + b.h - 4);
        }
      });

      // Render Falling Powerups
      powerupsRef.current.forEach(p => {
        context.save();
        context.fillStyle = '#F59E0B';
        context.shadowColor = '#D97706';
        context.shadowBlur = 8;
        context.beginPath();
        context.roundRect(p.x - 12, p.y - 6, 24, 14, 4);
        context.fill();

        context.fillStyle = '#000';
        context.font = 'bold 8px monospace';
        context.textAlign = 'center';
        context.fillText(p.type === 'EXPAND' ? 'EXP' : p.type === 'SLOW' ? 'SLO' : p.type === 'MULTIBALL' ? 'MUL' : 'LAS', p.x, p.y + 4);
        context.restore();
      });

      // Render Lasers
      lasersRef.current.forEach(l => {
        context.save();
        context.fillStyle = '#EF4444';
        context.shadowColor = '#DC2626';
        context.shadowBlur = 6;
        context.fillRect(l.x - 1.5, l.y, 3, 10);
        context.restore();
      });

      // Render Paddle
      const paddle = paddleRef.current;
      context.save();
      context.fillStyle = activePowerup === 'LASER' ? '#EF4444' : '#F59E0B';
      context.shadowColor = '#D97706';
      context.shadowBlur = 8;
      context.beginPath();
      context.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
      context.fill();

      // Top paddle highlight
      context.fillStyle = 'rgba(255, 255, 255, 0.4)';
      context.fillRect(paddle.x + 4, paddle.y, paddle.w - 8, 3);
      context.restore();

      // Render Balls
      ballsRef.current.forEach(ball => {
        context.save();
        context.fillStyle = '#FFF';
        context.shadowColor = '#F59E0B';
        context.shadowBlur = 10;
        context.beginPath();
        context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      // Render Particles
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

      // Overlay messages
      if (gameState === 'IDLE') {
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#F59E0B';
        context.font = 'bold 24px monospace';
        context.fillText('QUEBRA-BLOCOS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        context.fillStyle = '#E2E8F0';
        context.font = '14px monospace';
        context.fillText('Pressione Iniciar ou ESPAÇO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        context.fillStyle = '#94A3B8';
        context.font = '12px monospace';
        context.fillText('Mova o mouse ou Setas/AD para rebater', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      } else if (gameState === 'PAUSED') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#F59E0B';
        context.font = 'bold 24px monospace';
        context.fillText('JOGO PAUSADO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        context.fillStyle = '#E2E8F0';
        context.font = '13px monospace';
        context.fillText('Pressione P para continuar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      } else if (gameState === 'GAMEOVER') {
        context.fillStyle = 'rgba(15, 23, 42, 0.85)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#EF4444';
        context.font = 'bold 26px monospace';
        context.fillText('FIM DE JOGO!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        context.fillStyle = '#F8FAFC';
        context.font = '16px monospace';
        context.fillText(`Pontuação Final: ${scoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        if (scoreRef.current >= highScore && scoreRef.current > 0) {
          context.fillStyle = '#FBBF24';
          context.font = 'bold 13px monospace';
          context.fillText('★ NOVO RECORDE PESSOAL! ★', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
        }

        context.fillStyle = '#94A3B8';
        context.font = '13px monospace';
        context.fillText('Pressione Iniciar para jogar de novo', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, activePowerup, highScore, onGameOver, onScoreUpdate]);

  // Touch move for mobile
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    paddleRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - paddleRef.current.w, touchX - paddleRef.current.w / 2));
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>PONTOS: <strong className="text-amber-400 tabular-nums text-sm">{score}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>FASE: <strong className="text-sky-400 tabular-nums text-sm">{level}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            VIDAS: {'❤️'.repeat(Math.max(0, lives))}
          </span>
        </div>
        <div>
          <span>RECORDE: <strong className="text-amber-400 tabular-nums text-sm">{Math.max(score, highScore)}</strong></span>
        </div>
      </div>

      {/* Breakout Canvas */}
      <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden bg-black shadow-2xl w-full aspect-[500/440] max-w-[500px]">
        <canvas
          ref={canvasRef}
          width={500}
          height={440}
          onTouchMove={handleTouchMove}
          className="w-full h-full block cursor-none"
        />
      </div>

      {/* Action bar */}
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
              className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:scale-95 transition-transform rounded shadow"
            >
              {gameState === 'GAMEOVER' ? 'Jogar de Novo' : 'Iniciar Jogo'}
            </button>
          )}

          {activePowerup && (
            <span className="text-xs text-amber-300 font-mono">
              BÔNUS ATIVO: {activePowerup}
            </span>
          )}
        </div>

        <div className="text-slate-400 text-xs font-mono">
          Controle: Arraste o mouse ou use Setas / AD
        </div>
      </div>

      {/* Mobile buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex justify-center gap-4 sm:hidden">
        <button
          onClick={() => {
            paddleRef.current.x = Math.max(0, paddleRef.current.x - 30);
          }}
          className="w-16 h-12 bg-slate-800 active:bg-amber-600 text-white rounded-lg flex items-center justify-center font-bold text-xl border border-slate-700"
        >
          ◀
        </button>
        <button
          onClick={() => {
            paddleRef.current.x = Math.min(CANVAS_WIDTH - paddleRef.current.w, paddleRef.current.x + 30);
          }}
          className="w-16 h-12 bg-slate-800 active:bg-amber-600 text-white rounded-lg flex items-center justify-center font-bold text-xl border border-slate-700"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
