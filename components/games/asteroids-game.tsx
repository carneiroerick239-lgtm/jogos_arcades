'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, Pause, RotateCcw, RotateCw, Crosshair, ArrowUp, Sparkles } from 'lucide-react';

interface AsteroidsGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  sizeTier: 'LARGE' | 'MEDIUM' | 'SMALL';
  offsets: number[];
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const WIDTH = 540;
const HEIGHT = 460;

export default function AsteroidsGame({ onScoreUpdate, onGameOver, highScore }: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('IDLE');

  // Spaceship state
  const shipRef = useRef({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    rotationSpeed: 0.075,
    isThrusting: false,
    invincibleTimer: 120
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ left: boolean; right: boolean; thrust: boolean; fire: boolean }>({
    left: false,
    right: false,
    thrust: false,
    fire: false
  });

  const animationFrameRef = useRef<number | null>(null);
  const fireCooldownRef = useRef(0);

  // Generate random asteroid shape vertices
  const createAsteroid = (x: number, y: number, sizeTier: 'LARGE' | 'MEDIUM' | 'SMALL'): Asteroid => {
    let radius = 32;
    let speed = 1.0;
    if (sizeTier === 'MEDIUM') {
      radius = 18;
      speed = 1.6;
    } else if (sizeTier === 'SMALL') {
      radius = 10;
      speed = 2.2;
    }

    const numPoints = 10;
    const offsets: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      offsets.push(0.8 + Math.random() * 0.4);
    }

    const angle = Math.random() * Math.PI * 2;
    const velocity = (Math.random() * 0.8 + speed);

    return {
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      radius,
      sizeTier,
      offsets
    };
  };

  const spawnWave = (currentWave: number) => {
    const count = 3 + Math.min(6, currentWave);
    const newAsteroids: Asteroid[] = [];

    for (let i = 0; i < count; i++) {
      // Spawn away from center
      let x = Math.random() * WIDTH;
      let y = Math.random() * HEIGHT;
      while (Math.hypot(x - WIDTH / 2, y - HEIGHT / 2) < 120) {
        x = Math.random() * WIDTH;
        y = Math.random() * HEIGHT;
      }
      newAsteroids.push(createAsteroid(x, y, 'LARGE'));
    }

    asteroidsRef.current = newAsteroids;
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setWave(1);
    shipRef.current = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      rotationSpeed: 0.075,
      isThrusting: false,
      invincibleTimer: 120
    };
    bulletsRef.current = [];
    particlesRef.current = [];
    spawnWave(1);
    setGameState('PLAYING');
    retroAudio.coin();
  };

  const hyperspaceJump = () => {
    shipRef.current.x = Math.random() * (WIDTH - 40) + 20;
    shipRef.current.y = Math.random() * (HEIGHT - 40) + 20;
    shipRef.current.vx = 0;
    shipRef.current.vy = 0;
    shipRef.current.invincibleTimer = 60;
    retroAudio.bonus();
  };

  const fireBullet = () => {
    if (bulletsRef.current.length >= 6) return;
    const ship = shipRef.current;
    const bulletSpeed = 7.5;
    bulletsRef.current.push({
      x: ship.x + Math.cos(ship.angle) * 14,
      y: ship.y + Math.sin(ship.angle) * 14,
      vx: ship.vx + Math.cos(ship.angle) * bulletSpeed,
      vy: ship.vy + Math.sin(ship.angle) * bulletSpeed,
      life: 55
    });
    retroAudio.laser();
  };

  const addExplosion = (x: number, y: number, count = 12, color = '#38BDF8') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        color
      });
    }
  };

  // Keyboard control handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'p', 'P'].includes(e.key)) {
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

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.thrust = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') hyperspaceJump();
      if (e.key === ' ') fireBullet();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.thrust = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Vector black background
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Subtle starfield
    ctx.fillStyle = '#475569';
    for (let i = 0; i < 35; i++) {
      const sx = (i * 73 + 17) % WIDTH;
      const sy = (i * 113 + 29) % HEIGHT;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Draw Asteroids (vector wireframe)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.8;
    asteroidsRef.current.forEach(ast => {
      ctx.save();
      ctx.beginPath();
      const numPoints = ast.offsets.length;
      for (let i = 0; i < numPoints; i++) {
        const theta = (i / numPoints) * Math.PI * 2;
        const r = ast.radius * ast.offsets[i];
        const px = ast.x + Math.cos(theta) * r;
        const py = ast.y + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    // Draw Bullets
    ctx.fillStyle = '#38BDF8';
    bulletsRef.current.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Ship
    const ship = shipRef.current;
    const isFlashing = ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer / 8) % 2 === 0;

    if (!isFlashing) {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Ship wireframe triangle
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.stroke();

      // Thrust flame
      if (ship.isThrusting) {
        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-15 - Math.random() * 6, 0);
        ctx.lineTo(-6, 4);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, []);

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      const ship = shipRef.current;
      const keys = keysRef.current;

      // 1. Ship rotation
      if (keys.left) ship.angle -= ship.rotationSpeed;
      if (keys.right) ship.angle += ship.rotationSpeed;

      // 2. Ship thrust physics
      if (keys.thrust) {
        ship.vx += Math.cos(ship.angle) * 0.14;
        ship.vy += Math.sin(ship.angle) * 0.14;
        ship.isThrusting = true;
        // Flame particles
        if (Math.random() < 0.6) {
          particlesRef.current.push({
            x: ship.x - Math.cos(ship.angle) * 12,
            y: ship.y - Math.sin(ship.angle) * 12,
            vx: -Math.cos(ship.angle) * 2 + (Math.random() - 0.5),
            vy: -Math.sin(ship.angle) * 2 + (Math.random() - 0.5),
            life: 14,
            color: '#F59E0B'
          });
        }
      } else {
        ship.isThrusting = false;
      }

      // Space friction / drag (subtle)
      ship.vx *= 0.988;
      ship.vy *= 0.988;

      // Move ship
      ship.x += ship.vx;
      ship.y += ship.vy;

      // Screen wrap-around
      if (ship.x < 0) ship.x = WIDTH;
      else if (ship.x > WIDTH) ship.x = 0;
      if (ship.y < 0) ship.y = HEIGHT;
      else if (ship.y > HEIGHT) ship.y = 0;

      if (ship.invincibleTimer > 0) ship.invincibleTimer--;

      // 3. Update Bullets
      bulletsRef.current = bulletsRef.current.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Wrap around
        if (b.x < 0) b.x = WIDTH;
        else if (b.x > WIDTH) b.x = 0;
        if (b.y < 0) b.y = HEIGHT;
        else if (b.y > HEIGHT) b.y = 0;

        return b.life > 0;
      });

      // 4. Update Asteroids
      asteroidsRef.current.forEach(ast => {
        ast.x += ast.vx;
        ast.y += ast.vy;

        if (ast.x < -ast.radius) ast.x = WIDTH + ast.radius;
        else if (ast.x > WIDTH + ast.radius) ast.x = -ast.radius;
        if (ast.y < -ast.radius) ast.y = HEIGHT + ast.radius;
        else if (ast.y > HEIGHT + ast.radius) ast.y = -ast.radius;
      });

      // 5. Update Particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // 6. Bullet - Asteroid Collisions
      const nextAsteroids: Asteroid[] = [];
      const destroyedBulletIndices = new Set<number>();

      asteroidsRef.current.forEach(ast => {
        let hit = false;

        bulletsRef.current.forEach((b, bIdx) => {
          if (hit || destroyedBulletIndices.has(bIdx)) return;
          const dist = Math.hypot(ast.x - b.x, ast.y - b.y);
          if (dist < ast.radius) {
            hit = true;
            destroyedBulletIndices.add(bIdx);
          }
        });

        if (hit) {
          retroAudio.hit();
          addExplosion(ast.x, ast.y, ast.radius > 20 ? 18 : 10, '#38BDF8');

          let pts = 20;
          if (ast.sizeTier === 'LARGE') {
            pts = 20;
            nextAsteroids.push(createAsteroid(ast.x, ast.y, 'MEDIUM'));
            nextAsteroids.push(createAsteroid(ast.x, ast.y, 'MEDIUM'));
          } else if (ast.sizeTier === 'MEDIUM') {
            pts = 50;
            nextAsteroids.push(createAsteroid(ast.x, ast.y, 'SMALL'));
            nextAsteroids.push(createAsteroid(ast.x, ast.y, 'SMALL'));
          } else {
            pts = 100;
          }

          setScore(s => {
            const next = s + pts;
            onScoreUpdate(next);
            return next;
          });
        } else {
          nextAsteroids.push(ast);
        }
      });

      bulletsRef.current = bulletsRef.current.filter((_, idx) => !destroyedBulletIndices.has(idx));
      asteroidsRef.current = nextAsteroids;

      // 7. Check Wave Cleared
      if (asteroidsRef.current.length === 0) {
        retroAudio.victory();
        setWave(w => {
          const nextW = w + 1;
          spawnWave(nextW);
          return nextW;
        });
        ship.invincibleTimer = 90;
      }

      // 8. Ship - Asteroid Collision
      if (ship.invincibleTimer <= 0) {
        let shipCrashed = false;
        asteroidsRef.current.forEach(ast => {
          if (shipCrashed) return;
          const dist = Math.hypot(ship.x - ast.x, ship.y - ast.y);
          if (dist < ast.radius + 8) {
            shipCrashed = true;
          }
        });

        if (shipCrashed) {
          retroAudio.explosion();
          addExplosion(ship.x, ship.y, 28, '#EF4444');
          setLives(l => {
            const rem = l - 1;
            if (rem <= 0) {
              retroAudio.gameOver();
              setGameState('GAMEOVER');
              onGameOver(score);
            } else {
              ship.x = WIDTH / 2;
              ship.y = HEIGHT / 2;
              ship.vx = 0;
              ship.vy = 0;
              ship.invincibleTimer = 150;
            }
            return rem;
          });
        }
      }

      // 9. Render
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, score, renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      {/* HUD Header */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div>
          <span className="text-slate-400">PONTOS: </span>
          <span className="text-amber-400 font-bold tabular-nums text-sm">{score}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">ONDA: </span>
          <span className="text-cyan-400 font-bold tabular-nums">{wave}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">NAVES: </span>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-xs ${
                  i < lives ? 'bg-cyan-400' : 'bg-slate-800'
                }`}
              />
            ))}
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
                <h3 className="text-2xl font-black text-cyan-400 tracking-wider font-mono mb-2">
                  ASTEROIDS 1979
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Pilote com física vetorial inercial. Destrua asteroides rochosos gigantes e use o salto no hiperespaço em emergências!
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Missão</span>
                </button>
              </>
            )}

            {gameState === 'PAUSED' && (
              <>
                <h3 className="text-2xl font-black text-cyan-400 tracking-wider font-mono mb-4">
                  PAUSADO
                </h3>
                <button
                  onClick={() => setGameState('PLAYING')}
                  className="px-6 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Continuar</span>
                </button>
              </>
            )}

            {gameState === 'GAMEOVER' && (
              <>
                <h3 className="text-2xl font-black text-rose-500 tracking-wider font-mono mb-2">
                  NAVE DESTRUÍDA
                </h3>
                <p className="text-xs text-slate-400 mb-1 font-mono">Pontuação Final:</p>
                <p className="text-3xl font-black text-white font-mono tabular-nums mb-6">
                  {score}
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Novo Voo</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      <div className="w-full mt-4 grid grid-cols-4 gap-2 sm:hidden px-2">
        <button
          onTouchStart={() => (keysRef.current.left = true)}
          onTouchEnd={() => (keysRef.current.left = false)}
          onMouseDown={() => (keysRef.current.left = true)}
          onMouseUp={() => (keysRef.current.left = false)}
          className="h-12 bg-slate-800 active:bg-cyan-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onTouchStart={() => (keysRef.current.thrust = true)}
          onTouchEnd={() => (keysRef.current.thrust = false)}
          onMouseDown={() => (keysRef.current.thrust = true)}
          onMouseUp={() => (keysRef.current.thrust = false)}
          className="h-12 bg-slate-800 active:bg-cyan-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <button
          onTouchStart={() => (keysRef.current.right = true)}
          onTouchEnd={() => (keysRef.current.right = false)}
          onMouseDown={() => (keysRef.current.right = true)}
          onMouseUp={() => (keysRef.current.right = false)}
          className="h-12 bg-slate-800 active:bg-cyan-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <button
          onClick={fireBullet}
          className="h-12 bg-cyan-500 active:bg-cyan-400 text-slate-950 font-bold rounded-lg flex items-center justify-center border border-cyan-400"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
