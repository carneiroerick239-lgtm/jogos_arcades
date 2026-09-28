'use client';

import React, { useRef, useEffect, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, Pause, RotateCcw, RotateCw, Flame, ArrowUp } from 'lucide-react';

interface LanderGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

interface LandingPad {
  x1: number;
  x2: number;
  y: number;
  multiplier: number;
  label: string;
}

const WIDTH = 540;
const HEIGHT = 460;
const GRAVITY = 0.032;

export default function LanderGame({ onScoreUpdate, onGameOver, highScore }: LanderGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [fuel, setFuel] = useState(750);
  const [vxDisplay, setVxDisplay] = useState(0);
  const [vyDisplay, setVyDisplay] = useState(0);
  const [altitudeDisplay, setAltitudeDisplay] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'LANDED' | 'CRASHED'>('IDLE');

  const shipRef = useRef({
    x: 70,
    y: 60,
    vx: 1.2,
    vy: 0.1,
    angle: 0, // 0 = straight up
    isMainThrust: false,
    isLeftThrust: false,
    isRightThrust: false
  });

  const terrainRef = useRef<{ x: number; y: number }[]>([]);
  const padsRef = useRef<LandingPad[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const generateTerrain = () => {
    // Generate rugged mountainous surface with 3 flat landing zones
    const points: { x: number; y: number }[] = [];
    const pads: LandingPad[] = [
      { x1: 60, x2: 140, y: 380, multiplier: 2, label: '2X' },
      { x1: 220, x2: 320, y: 410, multiplier: 1, label: '1X' },
      { x1: 420, x2: 480, y: 350, multiplier: 5, label: '5X' }
    ];

    points.push({ x: 0, y: 350 });
    points.push({ x: 40, y: 340 });

    // Pad 1 (2x)
    points.push({ x: pads[0].x1, y: pads[0].y });
    points.push({ x: pads[0].x2, y: pads[0].y });

    points.push({ x: 170, y: 320 });
    points.push({ x: 195, y: 390 });

    // Pad 2 (1x)
    points.push({ x: pads[1].x1, y: pads[1].y });
    points.push({ x: pads[1].x2, y: pads[1].y });

    points.push({ x: 350, y: 320 });
    points.push({ x: 380, y: 280 });

    // Pad 3 (5x)
    points.push({ x: pads[2].x1, y: pads[2].y });
    points.push({ x: pads[2].x2, y: pads[2].y });

    points.push({ x: 510, y: 390 });
    points.push({ x: WIDTH, y: 360 });

    terrainRef.current = points;
    padsRef.current = pads;
  };

  const restartMission = () => {
    generateTerrain();
    shipRef.current = {
      x: 70,
      y: 50,
      vx: 1.0,
      vy: 0.1,
      angle: 0,
      isMainThrust: false,
      isLeftThrust: false,
      isRightThrust: false
    };
    setFuel(750);
    setStatusMessage('');
    particlesRef.current = [];
    setGameState('PLAYING');
    retroAudio.coin();
  };

  // Keyboard handlers
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

      if (gameState === 'IDLE' || gameState === 'LANDED' || gameState === 'CRASHED') {
        if (e.key === ' ' || e.key === 'Enter') {
          restartMission();
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        shipRef.current.isMainThrust = true;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        shipRef.current.isLeftThrust = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        shipRef.current.isRightThrust = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w' || e.key === 'W') {
        shipRef.current.isMainThrust = false;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        shipRef.current.isLeftThrust = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        shipRef.current.isRightThrust = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pitch black space
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Stars
    ctx.fillStyle = '#94A3B8';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 89 + 13) % WIDTH;
      const sy = (i * 127 + 23) % (HEIGHT - 120);
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }

    // Draw Terrain Wireframe
    const terrain = terrainRef.current;
    if (terrain.length > 1) {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(terrain[0].x, terrain[0].y);
      for (let i = 1; i < terrain.length; i++) {
        ctx.lineTo(terrain[i].x, terrain[i].y);
      }
      ctx.stroke();

      // Terrain shaded fill
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fillStyle = '#0B1120';
      ctx.fill();
    }

    // Draw Landing Pads
    padsRef.current.forEach(pad => {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad.x1, pad.y);
      ctx.lineTo(pad.x2, pad.y);
      ctx.stroke();

      // Pad multiplier marker
      ctx.fillStyle = '#10B981';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pad.label, (pad.x1 + pad.x2) / 2, pad.y + 14);
    });

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Lunar Module
    const ship = shipRef.current;
    if (gameState !== 'CRASHED') {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      // Cabin capsule (vector octagon/polygon)
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, -8);
      ctx.lineTo(12, 2);
      ctx.lineTo(-12, 2);
      ctx.closePath();
      ctx.stroke();

      // Ascent window
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3, -6, 6, 4);

      // Landing leg struts
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.8;
      // Left strut
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-14, 14);
      ctx.lineTo(-17, 14);
      ctx.stroke();
      // Right strut
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(14, 14);
      ctx.lineTo(17, 14);
      ctx.stroke();

      // Rocket engine bell
      ctx.strokeStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(-4, 2);
      ctx.lineTo(4, 2);
      ctx.lineTo(6, 7);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.stroke();

      // Main thruster plume
      if (ship.isMainThrust && fuel > 0) {
        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(-5, 7);
        ctx.lineTo(0, 18 + Math.random() * 8);
        ctx.lineTo(5, 7);
        ctx.stroke();
      }

      ctx.restore();
    }
  };

  // Main Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const loop = () => {
      const ship = shipRef.current;

      // 1. Angular attitude jets
      if (ship.isLeftThrust && fuel > 0) {
        ship.angle -= 0.035;
        setFuel(f => Math.max(0, f - 0.5));
      }
      if (ship.isRightThrust && fuel > 0) {
        ship.angle += 0.035;
        setFuel(f => Math.max(0, f - 0.5));
      }

      // 2. Main thruster
      if (ship.isMainThrust && fuel > 0) {
        const thrustForce = 0.085;
        // Ship angle 0 points up (towards negative y)
        ship.vx += Math.sin(ship.angle) * thrustForce;
        ship.vy -= Math.cos(ship.angle) * thrustForce;
        setFuel(f => Math.max(0, f - 1.2));
        retroAudio.thrust();

        // Rocket exhaust particles
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push({
            x: ship.x - Math.sin(ship.angle) * 14 + (Math.random() - 0.5) * 4,
            y: ship.y + Math.cos(ship.angle) * 14,
            vx: -Math.sin(ship.angle) * (2 + Math.random() * 2),
            vy: Math.cos(ship.angle) * (2 + Math.random() * 2),
            life: 16,
            color: Math.random() > 0.4 ? '#F59E0B' : '#EF4444'
          });
        }
      }

      // 3. Gravity
      ship.vy += GRAVITY;

      // Position update
      ship.x += ship.vx;
      ship.y += ship.vy;

      // Screen boundary check
      if (ship.x < 15) {
        ship.x = 15;
        ship.vx = 0;
      } else if (ship.x > WIDTH - 15) {
        ship.x = WIDTH - 15;
        ship.vx = 0;
      }

      // Update telemetry state
      setVxDisplay(Math.round(ship.vx * 10) / 10);
      setVyDisplay(Math.round(ship.vy * 10) / 10);
      setAltitudeDisplay(Math.max(0, Math.round(HEIGHT - ship.y - 40)));

      // 4. Update particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });

      // 5. Collision with ground
      const shipBottom = ship.y + 14;
      const shipLeft = ship.x - 12;
      const shipRight = ship.x + 12;

      // Find if ship has reached ground altitude
      let groundYAtShip = HEIGHT;
      const terrain = terrainRef.current;
      for (let i = 0; i < terrain.length - 1; i++) {
        const p1 = terrain[i];
        const p2 = terrain[i + 1];
        if (ship.x >= p1.x && ship.x <= p2.x) {
          const t = (ship.x - p1.x) / (p2.x - p1.x);
          groundYAtShip = p1.y + t * (p2.y - p1.y);
          break;
        }
      }

      if (shipBottom >= groundYAtShip) {
        // Ship touched ground! Determine if safe landing or crash
        const landedOnPad: LandingPad | undefined = padsRef.current.find(
          pad => shipLeft >= pad.x1 && shipRight <= pad.x2 && Math.abs(shipBottom - pad.y) < 10
        );

        const safeVy = Math.abs(ship.vy) <= 1.4;
        const safeVx = Math.abs(ship.vx) <= 0.8;
        const safeAngle = Math.abs(ship.angle) <= 0.16; // ~9 degrees

        if (landedOnPad && safeVy && safeVx && safeAngle) {
          // Touchdown success!
          retroAudio.victory();
          const points = (50 + Math.round(fuel / 5)) * landedOnPad.multiplier;
          setScore(s => {
            const next = s + points;
            onScoreUpdate(next);
            return next;
          });
          setStatusMessage(`POUSO PERFEITO! +${points} PTS (${landedOnPad.label})`);
          setGameState('LANDED');
        } else {
          // Crash!
          retroAudio.explosion();
          // Spawn explosion debris
          for (let i = 0; i < 30; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4 + 1;
            particlesRef.current.push({
              x: ship.x,
              y: ship.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              life: 30,
              color: '#EF4444'
            });
          }

          let reason = 'Colisão com o terreno rochoso!';
          if (landedOnPad) {
            if (!safeVy) reason = 'Impacto vertical violento (V > 1.4)!';
            else if (!safeVx) reason = 'Derrapagem lateral excessiva (H > 0.8)!';
            else if (!safeAngle) reason = 'Trem de pouso desalinhado (inclinação)!';
          }
          setStatusMessage(reason);
          setGameState('CRASHED');
          onGameOver(score);
        }
        return;
      }

      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, fuel, score]);

  useEffect(() => {
    generateTerrain();
    renderCanvas();
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      {/* Flight Computer Telemetry HUD */}
      <div className="w-full grid grid-cols-4 gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px]">COMB转变 (FUEL)</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              fuel < 150 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
            }`}
          >
            {Math.round(fuel)}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px]">VEL VERT (V)</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              Math.abs(vyDisplay) > 1.4 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {vyDisplay} m/s
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px]">VEL HORIZ (H)</span>
          <span
            className={`font-bold tabular-nums text-sm ${
              Math.abs(vxDisplay) > 0.8 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {vxDisplay} m/s
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px]">ALTITUDE</span>
          <span className="text-white font-bold tabular-nums text-sm">{altitudeDisplay}m</span>
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
                  LUNAR LANDER 1979
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Controle os propulsores e pouse suavemente nas plataformas (V &lt; 1.4 m/s e H &lt; 0.8 m/s). Pousos difíceis concedem multiplicadores de 2X e 5X!
                </p>
                <button
                  onClick={restartMission}
                  className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Descida</span>
                </button>
              </>
            )}

            {gameState === 'PAUSED' && (
              <>
                <h3 className="text-2xl font-black text-cyan-400 tracking-wider font-mono mb-4">
                  SIMULAÇÃO PAUSADA
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

            {gameState === 'LANDED' && (
              <>
                <h3 className="text-2xl font-black text-emerald-400 tracking-wider font-mono mb-2">
                  ÁGUIA POUSOU!
                </h3>
                <p className="text-sm font-bold text-amber-300 font-mono mb-4">{statusMessage}</p>
                <p className="text-xs text-slate-400 mb-1 font-mono">Pontuação Total:</p>
                <p className="text-3xl font-black text-white font-mono tabular-nums mb-6">
                  {score}
                </p>
                <button
                  onClick={restartMission}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Próximo Pouso</span>
                </button>
              </>
            )}

            {gameState === 'CRASHED' && (
              <>
                <h3 className="text-2xl font-black text-rose-500 tracking-wider font-mono mb-2">
                  MÓDULO DESTRUÍDO
                </h3>
                <p className="text-xs font-mono text-rose-300 mb-4">{statusMessage}</p>
                <button
                  onClick={restartMission}
                  className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Repetir Missão</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Touch Flight Controls */}
      <div className="w-full mt-4 grid grid-cols-3 gap-3 sm:hidden px-4">
        <button
          onTouchStart={() => (shipRef.current.isLeftThrust = true)}
          onTouchEnd={() => (shipRef.current.isLeftThrust = false)}
          onMouseDown={() => (shipRef.current.isLeftThrust = true)}
          onMouseUp={() => (shipRef.current.isLeftThrust = false)}
          className="h-14 bg-slate-800 active:bg-cyan-500 text-white active:text-slate-950 rounded-xl flex items-center justify-center border border-slate-700"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onTouchStart={() => (shipRef.current.isMainThrust = true)}
          onTouchEnd={() => (shipRef.current.isMainThrust = false)}
          onMouseDown={() => (shipRef.current.isMainThrust = true)}
          onMouseUp={() => (shipRef.current.isMainThrust = false)}
          className="h-14 bg-cyan-500 active:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center justify-center border border-cyan-400 shadow-md"
        >
          <Flame className="w-6 h-6 fill-current" />
        </button>

        <button
          onTouchStart={() => (shipRef.current.isRightThrust = true)}
          onTouchEnd={() => (shipRef.current.isRightThrust = false)}
          onMouseDown={() => (shipRef.current.isRightThrust = true)}
          onMouseUp={() => (shipRef.current.isRightThrust = false)}
          className="h-14 bg-slate-800 active:bg-cyan-500 text-white active:text-slate-950 rounded-xl flex items-center justify-center border border-slate-700"
        >
          <RotateCw className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
