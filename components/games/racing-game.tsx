'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Zap, Flame, ShieldAlert, Trophy, Gauge } from 'lucide-react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface RacingGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

const WIDTH = 480;
const HEIGHT = 520;
const ROAD_LEFT = 80;
const ROAD_RIGHT = 400;
const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;

interface TrafficCar {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  type: 'truck' | 'sedan' | 'sport';
  color: string;
  laneChangeTimer: number;
  laneDir: number;
}

interface RoadHazard {
  id: number;
  x: number;
  y: number;
  type: 'oil' | 'nitro_can';
}

export default function RacingGame({
  onScoreUpdate,
  onGameOver,
  highScore
}: RacingGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'CRASHED' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0); // km/h
  const [timeLeft, setTimeLeft] = useState(50);
  const [nitro, setNitro] = useState(100);
  const [isNitroActive, setIsNitroActive] = useState(false);
  const [checkpointDistance, setCheckpointDistance] = useState(2500);
  const [checkpointNotif, setCheckpointNotif] = useState('');

  // Player state
  const playerRef = useRef<{
    x: number;
    y: number;
    vx: number;
    width: number;
    height: number;
    steerAngle: number;
    spinAngle: number;
    isSpinning: boolean;
  }>({
    x: 240,
    y: 430,
    vx: 0,
    width: 32,
    height: 54,
    steerAngle: 0,
    spinAngle: 0,
    isSpinning: false
  });

  // Controls input
  const keysRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    nitro: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    nitro: false
  });

  // World state
  const roadOffsetRef = useRef(0);
  const trafficRef = useRef<TrafficCar[]>([]);
  const hazardsRef = useRef<RoadHazard[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);
  const shakeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize race
  const startRace = () => {
    retroAudio.engineRev();
    setGameState('PLAYING');
    setScore(0);
    setDistance(0);
    setSpeed(120);
    setTimeLeft(50);
    setNitro(100);
    setCheckpointDistance(2500);
    setCheckpointNotif('');

    playerRef.current = {
      x: 240,
      y: 430,
      vx: 0,
      width: 32,
      height: 54,
      steerAngle: 0,
      spinAngle: 0,
      isSpinning: false
    };

    trafficRef.current = [];
    hazardsRef.current = [];
    particlesRef.current = [];
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
          startRace();
          return;
        }
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
      if (e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
        keysRef.current.nitro = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
      if (e.key === ' ' || e.key === 'Shift') keysRef.current.nitro = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          retroAudio.gameOver();
          setGameState('GAMEOVER');
          onGameOver(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, onGameOver]);

  // Trigger Crash
  const handleCrash = useCallback(() => {
    retroAudio.explosion();
    shakeRef.current = 20;

    // Spawn explosion debris
    const player = playerRef.current;
    for (let i = 0; i < 35; i++) {
      particlesRef.current.push({
        x: player.x,
        y: player.y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        color: ['#EF4444', '#F97316', '#FACC15', '#64748B', '#000000'][Math.floor(Math.random() * 5)],
        life: 50
      });
    }

    setGameState('CRASHED');
    setSpeed(0);

    // Respawn after 1.4s
    setTimeout(() => {
      player.x = 240;
      player.y = 430;
      player.vx = 0;
      player.spinAngle = 0;
      player.isSpinning = false;
      setSpeed(100);
      setGameState('PLAYING');
    }, 1400);
  }, []);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const loop = () => {
      frameCount++;

      if (gameState === 'PLAYING') {
        const keys = keysRef.current;
        const player = playerRef.current;

        // 1. Acceleration & Speed Calculation
        const maxNormalSpeed = 230;
        const maxNitroSpeed = 315;
        const targetMax = (keys.nitro && nitro > 0) ? maxNitroSpeed : maxNormalSpeed;

        if (keys.nitro && nitro > 0) {
          setIsNitroActive(true);
          setNitro(n => Math.max(0, n - 0.4));
          setSpeed(s => Math.min(targetMax, s + 3));
          if (frameCount % 6 === 0) retroAudio.thrust();
        } else {
          setIsNitroActive(false);
          if (keys.up) {
            setSpeed(s => Math.min(targetMax, s + 1.2));
          } else if (keys.down) {
            setSpeed(s => Math.max(50, s - 3.5)); // Braking
          } else {
            // Natural air drag
            setSpeed(s => Math.max(80, s - 0.5));
          }
        }

        // Distance & Score increment
        const currentSpeedKmh = speed;
        const speedRatio = currentSpeedKmh / 100;
        setDistance(d => {
          const nextDist = Math.round(d + speedRatio * 1.5);
          // Checkpoint pass
          if (nextDist >= checkpointDistance) {
            retroAudio.bonus();
            setTimeLeft(t => t + 25);
            setCheckpointDistance(cd => cd + 2500);
            setCheckpointNotif('★ CHECKPOINT! +25s ★');
            setTimeout(() => setCheckpointNotif(''), 2200);
          }
          return nextDist;
        });

        setScore(s => {
          const next = s + Math.round(speedRatio);
          onScoreUpdate(next);
          saveHighScore('racing', next);
          return next;
        });

        // 2. Steering & Physics
        if (player.isSpinning) {
          player.spinAngle += 0.3;
          if (player.spinAngle >= Math.PI * 4) {
            player.isSpinning = false;
            player.spinAngle = 0;
          }
        } else {
          if (keys.left) {
            player.vx = Math.max(-6, player.vx - 0.8);
            player.steerAngle = -0.12;
          } else if (keys.right) {
            player.vx = Math.min(6, player.vx + 0.8);
            player.steerAngle = 0.12;
          } else {
            player.vx *= 0.8;
            player.steerAngle *= 0.8;
          }
          player.x += player.vx;
        }

        // Shoulder grass friction & limits
        if (player.x < ROAD_LEFT + 15) {
          player.x = ROAD_LEFT + 15;
          setSpeed(s => Math.max(60, s - 4));
        }
        if (player.x > ROAD_RIGHT - 15) {
          player.x = ROAD_RIGHT - 15;
          setSpeed(s => Math.max(60, s - 4));
        }

        // 3. Scroll Road
        roadOffsetRef.current = (roadOffsetRef.current + speedRatio * 6) % 60;

        // 4. Spawn Traffic
        if (frameCount % 45 === 0 && trafficRef.current.length < 6) {
          const lanes = [ROAD_LEFT + 40, ROAD_LEFT + 110, ROAD_LEFT + 180, ROAD_LEFT + 250];
          const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

          // Check if lane is clear at top
          const isClear = !trafficRef.current.some(c => Math.abs(c.x - chosenLane) < 40 && c.y < 80);
          if (isClear) {
            const types: ('truck' | 'sedan' | 'sport')[] = ['truck', 'sedan', 'sedan', 'sport'];
            const tType = types[Math.floor(Math.random() * types.length)];
            trafficRef.current.push({
              id: Math.random(),
              x: chosenLane,
              y: -80,
              width: tType === 'truck' ? 38 : 30,
              height: tType === 'truck' ? 70 : 48,
              speed: tType === 'truck' ? 80 : tType === 'sedan' ? 120 : 160,
              type: tType,
              color: tType === 'truck' ? '#3B82F6' : tType === 'sedan' ? '#EAB308' : '#10B981',
              laneChangeTimer: 100 + Math.random() * 150,
              laneDir: Math.random() > 0.5 ? 1 : -1
            });
          }
        }

        // 5. Spawn Hazards / Nitro Cans
        if (frameCount % 180 === 0 && hazardsRef.current.length < 3) {
          const hX = ROAD_LEFT + 30 + Math.random() * (ROAD_WIDTH - 60);
          hazardsRef.current.push({
            id: Math.random(),
            x: hX,
            y: -40,
            type: Math.random() > 0.4 ? 'oil' : 'nitro_can'
          });
        }

        // Update Traffic
        for (let i = trafficRef.current.length - 1; i >= 0; i--) {
          const car = trafficRef.current[i];
          const relativeSpeed = (currentSpeedKmh - car.speed) / 18;
          car.y += relativeSpeed;

          // Sportscar random lane changes
          if (car.type === 'sport') {
            car.laneChangeTimer--;
            if (car.laneChangeTimer <= 0) {
              car.x += car.laneDir * 1.5;
              if (car.x < ROAD_LEFT + 30 || car.x > ROAD_RIGHT - 30) {
                car.laneDir = -car.laneDir;
              }
              if (Math.random() < 0.05) car.laneChangeTimer = 120;
            }
          }

          // Collision with player
          const hitX = Math.abs(player.x - car.x) < (player.width + car.width) / 2 - 4;
          const hitY = Math.abs(player.y - car.y) < (player.height + car.height) / 2 - 4;

          if (hitX && hitY) {
            handleCrash();
            break;
          }

          // Despawn offscreen
          if (car.y > HEIGHT + 100 || car.y < -150) {
            trafficRef.current.splice(i, 1);
          }
        }

        // Update Hazards
        for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
          const hz = hazardsRef.current[i];
          hz.y += speedRatio * 5;

          // Player pickup / hit
          const hitDist = Math.hypot(player.x - hz.x, player.y - hz.y);
          if (hitDist < 25) {
            if (hz.type === 'oil') {
              retroAudio.skid();
              player.isSpinning = true;
              setSpeed(s => Math.max(50, s - 60));
            } else if (hz.type === 'nitro_can') {
              retroAudio.bonus();
              setNitro(n => Math.min(100, n + 40));
              setScore(s => s + 500);
            }
            hazardsRef.current.splice(i, 1);
            continue;
          }

          if (hz.y > HEIGHT + 50) {
            hazardsRef.current.splice(i, 1);
          }
        }
      }

      // Camera shake decay
      if (shakeRef.current > 0) shakeRef.current *= 0.85;

      // ---------------- RENDER ----------------
      ctx.save();
      if (shakeRef.current > 0.5) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      }

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1. Grass Shoulders
      ctx.fillStyle = '#15803D';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Roadside trees scrolling
      const treeOffset = roadOffsetRef.current * 1.5;
      for (let ty = -40; ty < HEIGHT + 60; ty += 90) {
        const py = (ty + treeOffset) % (HEIGHT + 90) - 40;
        // Left tree
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(35, py, 18, 0, Math.PI * 2);
        ctx.fill();
        // Right tree
        ctx.beginPath();
        ctx.arc(WIDTH - 35, py, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Red and White curbs
      for (let cy = -20; cy < HEIGHT + 40; cy += 30) {
        const py = (cy + roadOffsetRef.current) % (HEIGHT + 40) - 20;
        ctx.fillStyle = (Math.floor(cy / 30) % 2 === 0) ? '#EF4444' : '#FFFFFF';
        ctx.fillRect(ROAD_LEFT - 10, py, 10, 30);
        ctx.fillRect(ROAD_RIGHT, py, 10, 30);
      }

      // 2. Asphalt Road
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, HEIGHT);

      // Road Lane Markings (White dashed lines)
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([25, 30]);
      ctx.lineDashOffset = -roadOffsetRef.current;

      // 3 dashed center lanes
      const lane1X = ROAD_LEFT + ROAD_WIDTH * 0.33;
      const lane2X = ROAD_LEFT + ROAD_WIDTH * 0.66;

      ctx.beginPath();
      ctx.moveTo(lane1X, 0);
      ctx.lineTo(lane1X, HEIGHT);
      ctx.moveTo(lane2X, 0);
      ctx.lineTo(lane2X, HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Hazards Render
      hazardsRef.current.forEach(hz => {
        if (hz.type === 'oil') {
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.ellipse(hz.x, hz.y, 16, 10, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.stroke();
        } else {
          // Nitro Canister
          ctx.fillStyle = '#06B6D4';
          ctx.fillRect(hz.x - 8, hz.y - 12, 16, 24);
          ctx.fillStyle = '#FEF08A';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('N₂O', hz.x - 7, hz.y + 4);
        }
      });

      // 4. Traffic Cars Render
      trafficRef.current.forEach(car => {
        ctx.save();
        ctx.translate(car.x, car.y);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-car.width / 2 + 3, -car.height / 2 + 4, car.width, car.height);

        // Body
        ctx.fillStyle = car.color;
        ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

        // Windshield
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(-car.width / 2 + 3, -car.height / 2 + 8, car.width - 6, 10);

        // Headlights / Tail lights
        ctx.fillStyle = '#F87171';
        ctx.fillRect(-car.width / 2 + 3, car.height / 2 - 3, 6, 3);
        ctx.fillRect(car.width / 2 - 9, car.height / 2 - 3, 6, 3);

        ctx.restore();
      });

      // 5. Player's Sports Car
      if (gameState !== 'CRASHED') {
        const player = playerRef.current;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.isSpinning ? player.spinAngle : player.steerAngle);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-player.width / 2 + 4, -player.height / 2 + 4, player.width, player.height);

        // Ferrari Red Body
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

        // White racing stripe
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-2, -player.height / 2, 4, player.height);

        // Cockpit / Windshields
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-player.width / 2 + 4, -player.height / 2 + 10, player.width - 8, 14);

        // Driver Helmet
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(0, -player.height / 2 + 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Rear Spoiler
        ctx.fillStyle = '#991B1B';
        ctx.fillRect(-player.width / 2 - 2, player.height / 2 - 5, player.width + 4, 4);

        // Tail lights
        ctx.fillStyle = '#F87171';
        ctx.fillRect(-player.width / 2 + 3, player.height / 2 - 2, 5, 2);
        ctx.fillRect(player.width / 2 - 8, player.height / 2 - 2, 5, 2);

        // Wheels
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(-player.width / 2 - 2, -player.height / 2 + 6, 3, 10);
        ctx.fillRect(player.width / 2 - 1, -player.height / 2 + 6, 3, 10);
        ctx.fillRect(-player.width / 2 - 2, player.height / 2 - 16, 3, 10);
        ctx.fillRect(player.width / 2 - 1, player.height / 2 - 16, 3, 10);

        // Nitro Flame Exhaust Jets
        if (isNitroActive) {
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.moveTo(-6, player.height / 2);
          ctx.lineTo(0, player.height / 2 + 16 + Math.random() * 8);
          ctx.lineTo(6, player.height / 2);
          ctx.fill();

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-2, player.height / 2, 4, 10);
        }

        ctx.restore();
      }

      // 6. Explosion Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 4, 4);
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, speed, nitro, isNitroActive, checkpointDistance, handleCrash, onScoreUpdate]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Dashboard HUD */}
      <div className="w-full max-w-lg mb-3 grid grid-cols-4 gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-center">
        {/* Speed */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400">VELOCIDADE</span>
          <span className={`text-lg font-black ${speed > 280 ? 'text-cyan-400' : 'text-amber-400'}`}>
            {Math.round(speed)} <span className="text-[10px]">KM/H</span>
          </span>
        </div>

        {/* Distance */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400">DISTÂNCIA</span>
          <span className="text-lg font-black text-white">{distance} <span className="text-[10px]">M</span></span>
        </div>

        {/* Time Left */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-slate-400">TEMPO</span>
          <span className={`text-lg font-black ${timeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Nitro Gauge */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
            <Flame className="w-3 h-3" />
            <span>NITRO</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full border border-slate-700 overflow-hidden mt-1">
            <div
              className="h-full bg-cyan-400 transition-all duration-75"
              style={{ width: `${nitro}%` }}
            />
          </div>
        </div>
      </div>

      {/* Canvas Arcade Screen */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block max-w-full h-auto cursor-pointer"
          onClick={() => {
            if (gameState === 'IDLE' || gameState === 'GAMEOVER') startRace();
          }}
        />

        {/* Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <span className="text-5xl mb-2">🏎️</span>
            <h3 className="text-2xl font-black text-rose-500 tracking-tight">SUPER CORRIDA TURBO</h3>
            <p className="text-slate-300 text-xs max-w-xs mt-2 mb-6">
              Desvie do tráfego na rodovia, colete galões de nitro, evite poças de óleo e passe pelos checkpoints a tempo!
            </p>
            <button
              onClick={startRace}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>LIGAR MOTORES</span>
            </button>
          </div>
        )}

        {/* Checkpoint Banner */}
        {checkpointNotif && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2.5 bg-cyan-950/90 border-2 border-cyan-400 rounded-xl text-cyan-300 font-bold font-mono text-base shadow-2xl animate-bounce">
            {checkpointNotif}
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-12 h-12 text-amber-400 mb-2" />
            <h3 className="text-2xl font-black text-white">TEMPO ESGOTADO!</h3>
            <div className="my-3 text-xs font-mono text-slate-300">
              <div>Distância total: <span className="text-white font-bold">{distance} metros</span></div>
              <div className="text-lg text-amber-400 font-bold mt-1">Pontuação: {score}</div>
              {score > highScore && (
                <div className="text-emerald-400 font-bold mt-1">★ NOVO RECORDE DA PISTA! ★</div>
              )}
            </div>
            <button
              onClick={startRace}
              className="mt-4 px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>NOVA CORRIDA</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch On-Screen Controls */}
      <div className="w-full max-w-lg mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        {/* Steering Buttons */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => (keysRef.current.left = true)}
            onMouseUp={() => (keysRef.current.left = false)}
            onTouchStart={() => (keysRef.current.left = true)}
            onTouchEnd={() => (keysRef.current.left = false)}
            className="w-14 h-12 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 flex items-center justify-center text-lg"
          >
            ←
          </button>
          <button
            onMouseDown={() => (keysRef.current.right = true)}
            onMouseUp={() => (keysRef.current.right = false)}
            onTouchStart={() => (keysRef.current.right = true)}
            onTouchEnd={() => (keysRef.current.right = false)}
            className="w-14 h-12 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 flex items-center justify-center text-lg"
          >
            →
          </button>
        </div>

        {/* Speed Pedals & Nitro */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => (keysRef.current.down = true)}
            onMouseUp={() => (keysRef.current.down = false)}
            onTouchStart={() => (keysRef.current.down = true)}
            onTouchEnd={() => (keysRef.current.down = false)}
            className="px-3 h-12 bg-slate-800 active:bg-slate-700 text-rose-400 font-bold text-xs rounded-lg border border-slate-700"
          >
            FREIO
          </button>

          <button
            onMouseDown={() => (keysRef.current.up = true)}
            onMouseUp={() => (keysRef.current.up = false)}
            onTouchStart={() => (keysRef.current.up = true)}
            onTouchEnd={() => (keysRef.current.up = false)}
            className="px-4 h-12 bg-emerald-600 active:bg-emerald-500 text-white font-black text-xs rounded-lg border border-emerald-500 shadow-md"
          >
            ACELERAR
          </button>

          <button
            onMouseDown={() => (keysRef.current.nitro = true)}
            onMouseUp={() => (keysRef.current.nitro = false)}
            onTouchStart={() => (keysRef.current.nitro = true)}
            onTouchEnd={() => (keysRef.current.nitro = false)}
            className="px-4 h-12 bg-cyan-600 active:bg-cyan-500 text-white font-black text-xs rounded-lg border border-cyan-400 shadow-md flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>NITRO</span>
          </button>
        </div>
      </div>
    </div>
  );
}
