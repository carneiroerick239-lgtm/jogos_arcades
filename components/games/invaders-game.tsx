'use client';

import React, { useEffect, useRef, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface Invader {
  x: number;
  y: number;
  type: 1 | 2 | 3;
  alive: boolean;
  score: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isAlien: boolean;
}

interface BunkerBlock {
  x: number;
  y: number;
  alive: boolean;
}

interface UFO {
  x: number;
  y: number;
  speed: number;
  alive: boolean;
  score: number;
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

interface InvadersGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function InvadersGame({ onScoreUpdate, onGameOver, highScore }: InvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('IDLE');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);

  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 460;

  // Refs
  const playerRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 220,
    y: 420,
    w: 28,
    h: 18
  });
  const invadersRef = useRef<Invader[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const bunkersRef = useRef<BunkerBlock[]>([]);
  const ufoRef = useRef<UFO | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationFrameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  // March movement mechanics
  const marchDirRef = useRef<number>(1);
  const marchStepTimerRef = useRef<number>(0);
  const marchIntervalRef = useRef<number>(650);
  const lastAlienShotTimerRef = useRef<number>(0);
  const lastPlayerShotTimerRef = useRef<number>(0);
  const nextUfoTimeRef = useRef<number>(0);

  const createInvaders = () => {
    const list: Invader[] = [];
    const rows = 5;
    const cols = 9;
    const spacingX = 36;
    const spacingY = 28;
    const startX = 60;
    const startY = 60;

    for (let r = 0; r < rows; r++) {
      const type = (r === 0 ? 1 : r < 3 ? 2 : 3) as 1 | 2 | 3;
      const pts = type === 1 ? 30 : type === 2 ? 20 : 10;
      for (let c = 0; c < cols; c++) {
        list.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          type,
          alive: true,
          score: pts
        });
      }
    }
    return list;
  };

  const createBunkers = (): BunkerBlock[] => {
    const blocks: BunkerBlock[] = [];
    const bunkerCount = 4;
    const bunkerWidth = 44;
    const bunkerY = 360;
    const spacing = (CANVAS_WIDTH - bunkerCount * bunkerWidth) / (bunkerCount + 1);

    for (let b = 0; b < bunkerCount; b++) {
      const bX = spacing + b * (bunkerWidth + spacing);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          // Leave an arch hollow at bottom center
          if (row >= 2 && (col === 2 || col === 3)) continue;
          blocks.push({
            x: bX + col * 7,
            y: bunkerY + row * 6,
            alive: true
          });
        }
      }
    }
    return blocks;
  };

  const createExplosion = (x: number, y: number, color = '#10B981', count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
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

  const startGame = () => {
    retroAudio.coin();
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setWave(1);
    playerRef.current.x = (CANVAS_WIDTH - 28) / 2;
    invadersRef.current = createInvaders();
    bunkersRef.current = createBunkers();
    bulletsRef.current = [];
    particlesRef.current = [];
    ufoRef.current = null;
    marchDirRef.current = 1;
    marchIntervalRef.current = 650;
    nextUfoTimeRef.current = Date.now() + 15000;
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

  // Keyboard
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (gameState === 'PLAYING') {
        const keys = keysRef.current;
        const player = playerRef.current;
        const playerSpeed = 5;

        // Move Player
        if (keys['arrowleft'] || keys['a']) {
          player.x = Math.max(10, player.x - playerSpeed);
        }
        if (keys['arrowright'] || keys['d']) {
          player.x = Math.min(CANVAS_WIDTH - player.w - 10, player.x + playerSpeed);
        }

        // Shoot Player Laser
        if (keys[' '] && Date.now() - lastPlayerShotTimerRef.current > 350) {
          lastPlayerShotTimerRef.current = Date.now();
          bulletsRef.current.push({
            x: player.x + player.w / 2,
            y: player.y - 2,
            vy: -7,
            isAlien: false
          });
          retroAudio.laser();
        }

        // Alien March Step
        if (timestamp - marchStepTimerRef.current > marchIntervalRef.current) {
          marchStepTimerRef.current = timestamp;

          const aliveInvaders = invadersRef.current.filter(inv => inv.alive);
          if (aliveInvaders.length === 0) {
            // Wave cleared!
            retroAudio.victory();
            setWave(prev => {
              const nextWave = prev + 1;
              invadersRef.current = createInvaders();
              marchIntervalRef.current = Math.max(180, 650 - nextWave * 70);
              return nextWave;
            });
          } else {
            // Check edge boundaries
            let hitEdge = false;
            for (const inv of aliveInvaders) {
              if (marchDirRef.current === 1 && inv.x + 24 >= CANVAS_WIDTH - 15) {
                hitEdge = true;
                break;
              } else if (marchDirRef.current === -1 && inv.x <= 15) {
                hitEdge = true;
                break;
              }
            }

            if (hitEdge) {
              marchDirRef.current *= -1;
              for (const inv of aliveInvaders) {
                inv.y += 16;
                // If alien reaches player line: Game Over!
                if (inv.y + 20 >= player.y) {
                  retroAudio.gameOver();
                  setGameState('GAMEOVER');
                  saveHighScore('invaders', scoreRef.current);
                  if (onGameOver) onGameOver(scoreRef.current);
                  return;
                }
              }
            } else {
              for (const inv of aliveInvaders) {
                inv.x += marchDirRef.current * 12;
              }
            }

            // Speed up proportionally to remaining aliens
            const fraction = aliveInvaders.length / 45;
            marchIntervalRef.current = Math.max(120, 100 + fraction * 550);
            retroAudio.blip(180 + (1 - fraction) * 140);
          }
        }

        // Alien Random Shooting
        if (Date.now() - lastAlienShotTimerRef.current > 900) {
          lastAlienShotTimerRef.current = Date.now();
          const alive = invadersRef.current.filter(i => i.alive);
          if (alive.length > 0) {
            const shooter = alive[Math.floor(Math.random() * alive.length)];
            bulletsRef.current.push({
              x: shooter.x + 10,
              y: shooter.y + 16,
              vy: 3.5,
              isAlien: true
            });
          }
        }

        // Mystery UFO Spawning
        if (nextUfoTimeRef.current > 0 && Date.now() > nextUfoTimeRef.current && !ufoRef.current) {
          ufoRef.current = {
            x: 0,
            y: 28,
            speed: 2.2,
            alive: true,
            score: [100, 150, 200, 300][Math.floor(Math.random() * 4)]
          };
          retroAudio.blip(600);
        }

        // Move UFO
        if (ufoRef.current) {
          ufoRef.current.x += ufoRef.current.speed;
          if (ufoRef.current.x > CANVAS_WIDTH) {
            ufoRef.current = null;
            nextUfoTimeRef.current = Date.now() + 20000;
          }
        }

        // Update Bullets
        for (let bIdx = bulletsRef.current.length - 1; bIdx >= 0; bIdx--) {
          const bullet = bulletsRef.current[bIdx];
          bullet.y += bullet.vy;

          // Out of screen
          if (bullet.y < 0 || bullet.y > CANVAS_HEIGHT) {
            bulletsRef.current.splice(bIdx, 1);
            continue;
          }

          // Bullet hits Bunker blocks
          let bulletRemoved = false;
          for (const block of bunkersRef.current) {
            if (block.alive && bullet.x >= block.x && bullet.x <= block.x + 7 && bullet.y >= block.y && bullet.y <= block.y + 6) {
              block.alive = false;
              bulletsRef.current.splice(bIdx, 1);
              bulletRemoved = true;
              break;
            }
          }
          if (bulletRemoved) continue;

          // Player laser hits Alien
          if (!bullet.isAlien) {
            // Check UFO
            if (ufoRef.current && ufoRef.current.alive) {
              if (
                bullet.x >= ufoRef.current.x &&
                bullet.x <= ufoRef.current.x + 36 &&
                bullet.y >= ufoRef.current.y &&
                bullet.y <= ufoRef.current.y + 16
              ) {
                retroAudio.bonus();
                createExplosion(ufoRef.current.x + 18, ufoRef.current.y + 8, '#EF4444', 18);
                scoreRef.current += ufoRef.current.score;
                setScore(scoreRef.current);
                ufoRef.current = null;
                nextUfoTimeRef.current = Date.now() + 25000;
                bulletsRef.current.splice(bIdx, 1);
                continue;
              }
            }

            // Check Invaders
            for (const inv of invadersRef.current) {
              if (inv.alive && bullet.x >= inv.x && bullet.x <= inv.x + 22 && bullet.y >= inv.y && bullet.y <= inv.y + 18) {
                inv.alive = false;
                bulletsRef.current.splice(bIdx, 1);
                retroAudio.explosion();
                createExplosion(inv.x + 11, inv.y + 9, '#34D399', 14);
                scoreRef.current += inv.score;
                setScore(scoreRef.current);
                if (onScoreUpdate) onScoreUpdate(scoreRef.current);
                break;
              }
            }
          } else {
            // Alien bullet hits Player
            if (
              bullet.x >= player.x &&
              bullet.x <= player.x + player.w &&
              bullet.y >= player.y &&
              bullet.y <= player.y + player.h
            ) {
              bulletsRef.current.splice(bIdx, 1);
              livesRef.current -= 1;
              setLives(livesRef.current);
              retroAudio.hit();
              createExplosion(player.x + player.w / 2, player.y + player.h / 2, '#EF4444', 20);

              if (livesRef.current <= 0) {
                retroAudio.gameOver();
                setGameState('GAMEOVER');
                saveHighScore('invaders', scoreRef.current);
                if (onGameOver) onGameOver(scoreRef.current);
              }
            }
          }
        }
      }

      // Render
      render(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const render = (context: CanvasRenderingContext2D) => {
      // Space background with stars
      context.fillStyle = '#05070d';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Starfield dots
      context.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 25; s++) {
        const sx = ((s * 73) % CANVAS_WIDTH);
        const sy = ((s * 47) % (CANVAS_HEIGHT - 60));
        context.fillRect(sx, sy, 1.5, 1.5);
      }

      // Border
      context.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      context.lineWidth = 3;
      context.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

      // Render UFO if present
      if (ufoRef.current) {
        const u = ufoRef.current;
        context.save();
        context.fillStyle = '#EF4444';
        context.shadowColor = '#DC2626';
        context.shadowBlur = 8;
        context.beginPath();
        context.ellipse(u.x + 18, u.y + 8, 16, 6, 0, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = '#FBBF24';
        context.beginPath();
        context.ellipse(u.x + 18, u.y + 4, 8, 3, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      // Render Invaders (Pixel sprites drawn directly via Canvas)
      invadersRef.current.forEach(inv => {
        if (!inv.alive) return;
        context.save();
        const colors = { 1: '#EC4899', 2: '#38BDF8', 3: '#10B981' };
        context.fillStyle = colors[inv.type];
        context.shadowColor = colors[inv.type];
        context.shadowBlur = 4;

        // Pixel-like retro invader shapes
        const ix = inv.x;
        const iy = inv.y;
        if (inv.type === 1) {
          // Top Squid
          context.fillRect(ix + 6, iy, 10, 3);
          context.fillRect(ix + 3, iy + 3, 16, 5);
          context.fillRect(ix, iy + 8, 22, 4);
          context.fillRect(ix + 3, iy + 12, 4, 5);
          context.fillRect(ix + 15, iy + 12, 4, 5);
        } else if (inv.type === 2) {
          // Middle Crab
          context.fillRect(ix + 3, iy, 16, 3);
          context.fillRect(ix, iy + 3, 22, 6);
          context.fillRect(ix + 3, iy + 9, 16, 3);
          context.fillRect(ix, iy + 12, 6, 5);
          context.fillRect(ix + 16, iy + 12, 6, 5);
        } else {
          // Bottom Octopus
          context.fillRect(ix + 4, iy, 14, 3);
          context.fillRect(ix + 2, iy + 3, 18, 5);
          context.fillRect(ix, iy + 8, 22, 4);
          context.fillRect(ix + 2, iy + 12, 5, 5);
          context.fillRect(ix + 9, iy + 12, 4, 3);
          context.fillRect(ix + 15, iy + 12, 5, 5);
        }
        context.restore();
      });

      // Render Bunkers (Protective Barriers)
      context.fillStyle = '#10B981';
      bunkersRef.current.forEach(block => {
        if (block.alive) {
          context.fillRect(block.x, block.y, 6.5, 5.5);
        }
      });

      // Render Player Starship
      const p = playerRef.current;
      context.save();
      context.fillStyle = '#34D399';
      context.shadowColor = '#10B981';
      context.shadowBlur = 8;
      // Cannon body
      context.fillRect(p.x, p.y + 8, p.w, 10);
      context.fillRect(p.x + 4, p.y + 4, p.w - 8, 6);
      context.fillRect(p.x + p.w / 2 - 2, p.y, 4, 6);
      context.restore();

      // Render Bullets
      bulletsRef.current.forEach(b => {
        context.save();
        if (b.isAlien) {
          context.fillStyle = '#F43F5E';
          context.shadowColor = '#E11D48';
          context.shadowBlur = 4;
          // Zigzag alien bomb
          context.fillRect(b.x - 2, b.y, 4, 8);
        } else {
          context.fillStyle = '#38BDF8';
          context.shadowColor = '#0284C7';
          context.shadowBlur = 6;
          context.fillRect(b.x - 1.5, b.y, 3, 10);
        }
        context.restore();
      });

      // Render Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const part = particles[i];
        part.x += part.vx;
        part.y += part.vy;
        part.life += 1;
        const progress = part.life / part.maxLife;
        if (progress >= 1) {
          particles.splice(i, 1);
        } else {
          context.save();
          context.globalAlpha = 1 - progress;
          context.fillStyle = part.color;
          context.fillRect(part.x - 2, part.y - 2, 4, 4);
          context.restore();
        }
      }

      // Overlays
      if (gameState === 'IDLE') {
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#EC4899';
        context.font = 'bold 24px monospace';
        context.fillText('INVASORES DO ESPAÇO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        context.fillStyle = '#E2E8F0';
        context.font = '14px monospace';
        context.fillText('Pressione Iniciar ou ESPAÇO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        context.fillStyle = '#94A3B8';
        context.font = '12px monospace';
        context.fillText('Setas para mover · Espaço para atirar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
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
        context.fillText('A TERRA FOI INVADIDA!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

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
        context.fillText('Pressione Iniciar para defender novamente', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 65);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, highScore, onGameOver, onScoreUpdate]);

  // Touch moves
  const movePlayer = (delta: number) => {
    if (gameState !== 'PLAYING') return;
    playerRef.current.x = Math.max(10, Math.min(CANVAS_WIDTH - playerRef.current.w - 10, playerRef.current.x + delta));
  };

  const firePlayerLaser = () => {
    if (gameState !== 'PLAYING') return;
    if (Date.now() - lastPlayerShotTimerRef.current > 350) {
      lastPlayerShotTimerRef.current = Date.now();
      bulletsRef.current.push({
        x: playerRef.current.x + playerRef.current.w / 2,
        y: playerRef.current.y - 2,
        vy: -7,
        isAlien: false
      });
      retroAudio.laser();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>PONTOS: <strong className="text-pink-400 tabular-nums text-sm">{score}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>ONDA: <strong className="text-sky-400 tabular-nums text-sm">{wave}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            DEFESA: {'🚀'.repeat(Math.max(0, lives))}
          </span>
        </div>
        <div>
          <span>RECORDE: <strong className="text-amber-400 tabular-nums text-sm">{Math.max(score, highScore)}</strong></span>
        </div>
      </div>

      {/* Invaders Canvas */}
      <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden bg-black shadow-2xl w-full aspect-[480/460] max-w-[480px]">
        <canvas
          ref={canvasRef}
          width={480}
          height={460}
          className="w-full h-full block"
        />
      </div>

      {/* Control bar */}
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
              className="px-4 py-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-500 active:scale-95 transition-transform rounded shadow"
            >
              {gameState === 'GAMEOVER' ? 'Jogar de Novo' : 'Iniciar Batalha'}
            </button>
          )}
        </div>

        <div className="text-slate-400 text-xs font-mono">
          ← / → Nave · Espaço Atirar · P Pausa
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex justify-between items-center px-4 sm:hidden">
        <div className="flex gap-2">
          <button
            onClick={() => movePlayer(-24)}
            className="w-14 h-12 bg-slate-800 active:bg-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-xl border border-slate-700"
          >
            ◀
          </button>
          <button
            onClick={() => movePlayer(24)}
            className="w-14 h-12 bg-slate-800 active:bg-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-xl border border-slate-700"
          >
            ▶
          </button>
        </div>

        <button
          onClick={firePlayerLaser}
          className="px-6 h-12 bg-pink-600 active:bg-pink-500 text-white font-bold text-sm rounded-lg flex items-center justify-center border border-pink-400 shadow-lg"
        >
          DISPARAR
        </button>
      </div>
    </div>
  );
}
