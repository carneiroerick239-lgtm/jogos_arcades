'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Sparkles, Zap, Flag, Timer } from 'lucide-react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface KartGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

const WIDTH = 520;
const HEIGHT = 440;

type KartItem = 'NONE' | 'BANANA' | 'GREEN_SHELL' | 'RED_SHELL' | 'MUSHROOM' | 'STAR';

interface KartRival {
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  waypointIndex: number;
  lap: number;
  isSpinning: boolean;
  spinTimer: number;
}

interface ItemEntity {
  id: number;
  type: 'BANANA' | 'GREEN_SHELL' | 'RED_SHELL';
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetRival?: KartRival;
  life: number;
}

interface ItemBox {
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

// Track Circuit Waypoints (Smooth oval circuit with chicane)
const WAYPOINTS = [
  { x: 100, y: 360 },
  { x: 260, y: 360 }, // Start / Finish Line
  { x: 420, y: 360 },
  { x: 450, y: 300 },
  { x: 450, y: 160 },
  { x: 400, y: 90 },
  { x: 280, y: 90 },
  { x: 230, y: 140 }, // Chicane curve
  { x: 180, y: 90 },
  { x: 90, y: 120 },
  { x: 70, y: 220 },
  { x: 70, y: 310 }
];

export default function KartGame({
  onScoreUpdate,
  onGameOver,
  highScore
}: KartGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'IDLE' | 'RACING' | 'FINISHED'>('IDLE');
  const [playerLap, setPlayerLap] = useState(1);
  const [totalLaps] = useState(3);
  const [position, setPosition] = useState(4);
  const [activeItem, setActiveItem] = useState<KartItem>('NONE');
  const [isRouletteRolling, setIsRouletteRolling] = useState(false);
  const [score, setScore] = useState(0);
  const [raceTime, setRaceTime] = useState(0);
  const [boostTimer, setBoostTimer] = useState(0);
  const [starTimer, setStarTimer] = useState(0);
  const [finalPosition, setFinalPosition] = useState(1);

  // Player Kart
  const playerRef = useRef<{
    x: number;
    y: number;
    angle: number;
    speed: number;
    lap: number;
    waypointIndex: number;
    isSpinning: boolean;
    spinAngle: number;
  }>({
    x: 230,
    y: 350,
    angle: 0,
    speed: 0,
    lap: 1,
    waypointIndex: 1,
    isSpinning: false,
    spinAngle: 0
  });

  // AI Rivals
  const rivalsRef = useRef<KartRival[]>([
    {
      name: 'Luigi',
      color: '#16A34A',
      x: 210,
      y: 370,
      angle: 0,
      speed: 0,
      maxSpeed: 3.1,
      waypointIndex: 1,
      lap: 1,
      isSpinning: false,
      spinTimer: 0
    },
    {
      name: 'Peach',
      color: '#F472B6',
      x: 180,
      y: 350,
      angle: 0,
      speed: 0,
      maxSpeed: 3.0,
      waypointIndex: 1,
      lap: 1,
      isSpinning: false,
      spinTimer: 0
    },
    {
      name: 'Bowser',
      color: '#F59E0B',
      x: 160,
      y: 370,
      angle: 0,
      speed: 0,
      maxSpeed: 3.2,
      waypointIndex: 1,
      lap: 1,
      isSpinning: false,
      spinTimer: 0
    }
  ]);

  // Track Entities
  const itemBoxesRef = useRef<ItemBox[]>([
    { x: 340, y: 360, active: true, respawnTimer: 0 },
    { x: 450, y: 230, active: true, respawnTimer: 0 },
    { x: 230, y: 140, active: true, respawnTimer: 0 },
    { x: 70, y: 260, active: true, respawnTimer: 0 }
  ]);

  const activeEntitiesRef = useRef<ItemEntity[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  // Controls
  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false
  });

  const animFrameRef = useRef<number | null>(null);

  // Start Race
  const startRace = () => {
    retroAudio.engineRev();
    setGameState('RACING');
    setPlayerLap(1);
    setPosition(4);
    setActiveItem('NONE');
    setScore(0);
    setRaceTime(0);
    setBoostTimer(0);
    setStarTimer(0);

    playerRef.current = {
      x: 230,
      y: 350,
      angle: 0,
      speed: 0,
      lap: 1,
      waypointIndex: 1,
      isSpinning: false,
      spinAngle: 0
    };

    rivalsRef.current = [
      {
        name: 'Luigi',
        color: '#16A34A',
        x: 210,
        y: 370,
        angle: 0,
        speed: 0,
        maxSpeed: 3.0,
        waypointIndex: 1,
        lap: 1,
        isSpinning: false,
        spinTimer: 0
      },
      {
        name: 'Peach',
        color: '#F472B6',
        x: 180,
        y: 350,
        angle: 0,
        speed: 0,
        maxSpeed: 2.9,
        waypointIndex: 1,
        lap: 1,
        isSpinning: false,
        spinTimer: 0
      },
      {
        name: 'Bowser',
        color: '#F59E0B',
        x: 160,
        y: 370,
        angle: 0,
        speed: 0,
        maxSpeed: 3.1,
        waypointIndex: 1,
        lap: 1,
        isSpinning: false,
        spinTimer: 0
      }
    ];

    activeEntitiesRef.current = [];
    particlesRef.current = [];
  };

  // Roll Mystery Box Item
  const rollItemBox = useCallback(() => {
    if (activeItem !== 'NONE' || isRouletteRolling) return;
    retroAudio.kartItem();
    setIsRouletteRolling(true);

    const pool: KartItem[] = ['BANANA', 'GREEN_SHELL', 'RED_SHELL', 'MUSHROOM', 'STAR'];
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count > 10) {
        clearInterval(interval);
        setIsRouletteRolling(false);
        const item = pool[Math.floor(Math.random() * pool.length)];
        setActiveItem(item);
        retroAudio.bonus();
      }
    }, 90);
  }, [activeItem, isRouletteRolling]);

  // Activate collected item
  const activateItem = useCallback(() => {
    if (activeItem === 'NONE' || isRouletteRolling || gameState !== 'RACING') return;

    const player = playerRef.current;

    if (activeItem === 'BANANA') {
      retroAudio.blip(200);
      // Drop banana behind kart
      const bx = player.x - Math.cos(player.angle) * 24;
      const by = player.y - Math.sin(player.angle) * 24;
      activeEntitiesRef.current.push({
        id: Math.random(),
        type: 'BANANA',
        x: bx,
        y: by,
        vx: 0,
        vy: 0,
        life: 600
      });
    } else if (activeItem === 'GREEN_SHELL') {
      retroAudio.kartShell();
      // Shoots straight forward
      const sx = player.x + Math.cos(player.angle) * 20;
      const sy = player.y + Math.sin(player.angle) * 20;
      activeEntitiesRef.current.push({
        id: Math.random(),
        type: 'GREEN_SHELL',
        x: sx,
        y: sy,
        vx: Math.cos(player.angle) * 7,
        vy: Math.sin(player.angle) * 7,
        life: 250
      });
    } else if (activeItem === 'RED_SHELL') {
      retroAudio.kartShell();
      // Target rival in front
      const rivalInFront = rivalsRef.current.find(r => r.lap >= player.lap);
      const sx = player.x + Math.cos(player.angle) * 20;
      const sy = player.y + Math.sin(player.angle) * 20;
      activeEntitiesRef.current.push({
        id: Math.random(),
        type: 'RED_SHELL',
        x: sx,
        y: sy,
        vx: Math.cos(player.angle) * 5,
        vy: Math.sin(player.angle) * 5,
        targetRival: rivalInFront,
        life: 300
      });
    } else if (activeItem === 'MUSHROOM') {
      retroAudio.thrust();
      setBoostTimer(120); // 2 seconds boost
    } else if (activeItem === 'STAR') {
      retroAudio.victory();
      setStarTimer(200);
      setBoostTimer(200);
    }

    setActiveItem('NONE');
  }, [activeItem, isRouletteRolling, gameState]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'IDLE' || gameState === 'FINISHED') {
          startRace();
          return;
        } else if (gameState === 'RACING') {
          activateItem();
        }
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keysRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keysRef.current.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, activateItem]);

  // Race Timer
  useEffect(() => {
    if (gameState !== 'RACING') return;
    const interval = setInterval(() => {
      setRaceTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;

      if (gameState === 'RACING') {
        const player = playerRef.current;
        const keys = keysRef.current;

        // Timers decay
        setBoostTimer(b => Math.max(0, b - 1));
        setStarTimer(st => Math.max(0, st - 1));

        // 1. Player Physics
        if (player.isSpinning) {
          player.spinAngle += 0.25;
          player.speed *= 0.9;
          if (player.spinAngle >= Math.PI * 4) {
            player.isSpinning = false;
            player.spinAngle = 0;
          }
        } else {
          // Turning
          if (keys.left) player.angle -= 0.055;
          if (keys.right) player.angle += 0.055;

          // Acceleration
          const baseMax = 3.4;
          const maxSpd = boostTimer > 0 ? 5.2 : baseMax;

          if (keys.up) {
            player.speed = Math.min(maxSpd, player.speed + 0.12);
          } else if (keys.down) {
            player.speed = Math.max(-1.5, player.speed - 0.15); // Reverse
          } else {
            player.speed *= 0.96; // Friction
          }

          player.x += Math.cos(player.angle) * player.speed;
          player.y += Math.sin(player.angle) * player.speed;
        }

        // Boundary constraints
        player.x = Math.max(30, Math.min(WIDTH - 30, player.x));
        player.y = Math.max(30, Math.min(HEIGHT - 30, player.y));

        // Waypoint & Lap tracking
        const nextWp = WAYPOINTS[(player.waypointIndex + 1) % WAYPOINTS.length];
        const distToWp = Math.hypot(player.x - nextWp.x, player.y - nextWp.y);
        if (distToWp < 60) {
          const nextIdx = (player.waypointIndex + 1) % WAYPOINTS.length;
          player.waypointIndex = nextIdx;

          // Crossed Start/Finish Line (Waypoint 1 is right after line)
          if (nextIdx === 1) {
            if (player.lap >= totalLaps) {
              // Finished Race!
              retroAudio.goalCheer();
              setGameState('FINISHED');
              setFinalPosition(position);

              const pts = (5 - position) * 1000 + Math.max(0, 300 - raceTime * 5);
              setScore(pts);
              onScoreUpdate(pts);
              saveHighScore('kart', pts);
              onGameOver(pts);
              return;
            } else {
              retroAudio.whistle();
              player.lap++;
              setPlayerLap(player.lap);
            }
          }
        }

        // 2. Update AI Rivals
        rivalsRef.current.forEach(rival => {
          if (rival.isSpinning) {
            rival.spinTimer--;
            rival.speed *= 0.9;
            if (rival.spinTimer <= 0) rival.isSpinning = false;
            return;
          }

          const targetWp = WAYPOINTS[(rival.waypointIndex + 1) % WAYPOINTS.length];
          const targetAngle = Math.atan2(targetWp.y - rival.y, targetWp.x - rival.x);

          // Smooth turn towards waypoint
          const diff = targetAngle - rival.angle;
          rival.angle += Math.atan2(Math.sin(diff), Math.cos(diff)) * 0.08;

          rival.speed = Math.min(rival.maxSpeed, rival.speed + 0.08);
          rival.x += Math.cos(rival.angle) * rival.speed;
          rival.y += Math.sin(rival.angle) * rival.speed;

          const d = Math.hypot(rival.x - targetWp.x, rival.y - targetWp.y);
          if (d < 50) {
            rival.waypointIndex = (rival.waypointIndex + 1) % WAYPOINTS.length;
            if (rival.waypointIndex === 1) rival.lap++;
          }
        });

        // 3. Compute Real-time Position (1st, 2nd, 3rd, 4th)
        let pos = 1;
        rivalsRef.current.forEach(r => {
          if (r.lap > player.lap) {
            pos++;
          } else if (r.lap === player.lap) {
            if (r.waypointIndex > player.waypointIndex) {
              pos++;
            }
          }
        });
        setPosition(pos);

        // 4. Update Item Boxes
        itemBoxesRef.current.forEach(box => {
          if (!box.active) {
            box.respawnTimer--;
            if (box.respawnTimer <= 0) box.active = true;
          } else {
            // Player collision
            if (Math.hypot(player.x - box.x, player.y - box.y) < 26) {
              box.active = false;
              box.respawnTimer = 240;
              rollItemBox();
            }
          }
        });

        // 5. Update Active Items / Projectiles
        for (let i = activeEntitiesRef.current.length - 1; i >= 0; i--) {
          const item = activeEntitiesRef.current[i];
          item.life--;

          if (item.type === 'BANANA') {
            // Check player collision
            if (starTimer === 0 && Math.hypot(player.x - item.x, player.y - item.y) < 18) {
              retroAudio.skid();
              player.isSpinning = true;
              activeEntitiesRef.current.splice(i, 1);
              continue;
            }

            // Check rivals collision
            for (const rival of rivalsRef.current) {
              if (Math.hypot(rival.x - item.x, rival.y - item.y) < 18) {
                retroAudio.skid();
                rival.isSpinning = true;
                rival.spinTimer = 60;
                activeEntitiesRef.current.splice(i, 1);
                break;
              }
            }
          } else if (item.type === 'GREEN_SHELL') {
            item.x += item.vx;
            item.y += item.vy;

            // Bounce off outer wall
            if (item.x < 40 || item.x > WIDTH - 40) item.vx = -item.vx;
            if (item.y < 40 || item.y > HEIGHT - 40) item.vy = -item.vy;

            // Hit rivals
            for (const rival of rivalsRef.current) {
              if (Math.hypot(rival.x - item.x, rival.y - item.y) < 22) {
                retroAudio.hit();
                rival.isSpinning = true;
                rival.spinTimer = 70;
                activeEntitiesRef.current.splice(i, 1);
                break;
              }
            }
          } else if (item.type === 'RED_SHELL') {
            if (item.targetRival) {
              const ang = Math.atan2(item.targetRival.y - item.y, item.targetRival.x - item.x);
              item.vx = Math.cos(ang) * 6.5;
              item.vy = Math.sin(ang) * 6.5;
              item.x += item.vx;
              item.y += item.vy;

              if (Math.hypot(item.targetRival.x - item.x, item.targetRival.y - item.y) < 24) {
                retroAudio.hit();
                item.targetRival.isSpinning = true;
                item.targetRival.spinTimer = 80;
                activeEntitiesRef.current.splice(i, 1);
                continue;
              }
            } else {
              item.x += item.vx;
              item.y += item.vy;
            }
          }

          if (item.life <= 0) {
            activeEntitiesRef.current.splice(i, 1);
          }
        }
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // Infield & Outfield Grass
      ctx.fillStyle = '#15803D';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Draw Circuit Track Ribbon
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 68;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
      for (let i = 1; i < WAYPOINTS.length; i++) {
        ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Asphalt Track Surface
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 60;
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0].x, WAYPOINTS[0].y);
      for (let i = 1; i < WAYPOINTS.length; i++) {
        ctx.lineTo(WAYPOINTS[i].x, WAYPOINTS[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Track Center Dashed Guideline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 16]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start / Finish Checkerboard Line
      ctx.save();
      ctx.translate(260, 360);
      for (let cy = -30; cy < 30; cy += 10) {
        for (let cx = -5; cx <= 5; cx += 5) {
          ctx.fillStyle = (Math.floor(cy / 10) + Math.floor(cx / 5)) % 2 === 0 ? '#FFFFFF' : '#000000';
          ctx.fillRect(cx, cy, 5, 10);
        }
      }
      ctx.restore();

      // Draw Item Boxes
      itemBoxesRef.current.forEach(box => {
        if (box.active) {
          ctx.save();
          ctx.translate(box.x, box.y);
          const rainbow = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
          ctx.fillStyle = rainbow[Math.floor((frame / 8) % rainbow.length)];
          ctx.fillRect(-10, -10, 20, 20);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-10, -10, 20, 20);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('?', 0, 4);
          ctx.restore();
        }
      });

      // Draw Items on Track (Bananas & Shells)
      activeEntitiesRef.current.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);
        if (item.type === 'BANANA') {
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0.4, 2.7);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#EAB308';
          ctx.stroke();
        } else if (item.type === 'GREEN_SHELL') {
          ctx.fillStyle = '#22C55E';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (item.type === 'RED_SHELL') {
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();
      });

      // Draw AI Rivals
      rivalsRef.current.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle + (r.isSpinning ? frame * 0.3 : 0));

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-8, -6, 16, 12);

        // Body
        ctx.fillStyle = r.color;
        ctx.fillRect(-10, -7, 20, 14);

        // Tires
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-11, -9, 6, 3);
        ctx.fillRect(5, -9, 6, 3);
        ctx.fillRect(-11, 6, 6, 3);
        ctx.fillRect(5, 6, 6, 3);

        // Driver Cap
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Player Kart (Red)
      const player = playerRef.current;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.isSpinning ? player.spinAngle : player.angle);

      // Star rainbow aura
      if (starTimer > 0) {
        ctx.strokeStyle = ['#F43F5E', '#F59E0B', '#10B981', '#38BDF8', '#8B5CF6'][Math.floor(frame / 4) % 5];
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-9, -7, 18, 14);

      // Mario Red Chassis
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-12, -8, 24, 16);

      // White nose with 'M' logo
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(4, -5, 8, 10);
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', 8, 3);

      // Tires
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-13, -11, 7, 4);
      ctx.fillRect(6, -11, 7, 4);
      ctx.fillRect(-13, 7, 7, 4);
      ctx.fillRect(6, 7, 7, 4);

      // Driver Head (Mario Cap)
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Exhaust Boost Sparks
      if (boostTimer > 0) {
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-16, -3, 5, 6);
      }

      ctx.restore();

      // Radar Minimap in top right corner
      ctx.save();
      ctx.translate(WIDTH - 90, 15);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(0, 0, 75, 65);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(0, 0, 75, 65);

      // Mini track outline
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(WAYPOINTS[0].x * 0.14, WAYPOINTS[0].y * 0.14);
      for (let i = 1; i < WAYPOINTS.length; i++) {
        ctx.lineTo(WAYPOINTS[i].x * 0.14, WAYPOINTS[i].y * 0.14);
      }
      ctx.closePath();
      ctx.stroke();

      // Player dot (Red)
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(player.x * 0.14, player.y * 0.14, 3, 0, Math.PI * 2);
      ctx.fill();

      // Rivals dots
      rivalsRef.current.forEach(r => {
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x * 0.14, r.y * 0.14, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, boostTimer, starTimer, position, totalLaps, raceTime, onGameOver, onScoreUpdate, rollItemBox]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD */}
      <div className="w-full max-w-lg mb-3 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 font-mono">
        {/* Position */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">POSIÇÃO:</span>
          <span
            className={`text-xl font-black px-2 py-0.5 rounded ${
              position === 1
                ? 'bg-amber-500 text-slate-950'
                : position === 2
                ? 'bg-slate-300 text-slate-950'
                : 'bg-amber-800 text-white'
            }`}
          >
            {position}º
          </span>
        </div>

        {/* Lap */}
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-slate-400">VOLTA:</span>
          <span className="text-sm font-bold text-white">{playerLap} / {totalLaps}</span>
        </div>

        {/* Item Slot Box */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">ITEM:</span>
          <div className="w-9 h-9 rounded-lg bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-lg shadow-inner">
            {isRouletteRolling ? (
              <span className="animate-spin text-sm font-bold text-amber-300">?</span>
            ) : activeItem === 'BANANA' ? (
              '🍌'
            ) : activeItem === 'GREEN_SHELL' ? (
              '🐢'
            ) : activeItem === 'RED_SHELL' ? (
              '🔴'
            ) : activeItem === 'MUSHROOM' ? (
              '🍄'
            ) : activeItem === 'STAR' ? (
              '⭐'
            ) : (
              <span className="text-slate-700 text-xs">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Screen */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-slate-950">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block max-w-full h-auto cursor-pointer"
          onClick={() => {
            if (gameState === 'IDLE' || gameState === 'FINISHED') startRace();
          }}
        />

        {/* Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <span className="text-5xl mb-2">🏁</span>
            <h3 className="text-2xl font-black text-amber-400 tracking-tight">SUPER KART GP</h3>
            <p className="text-slate-300 text-xs max-w-xs mt-2 mb-6">
              Passe pelas caixas com ?, dispare cascos vermelhos e verdes, solte cascas de banana e vença as 3 voltas!
            </p>
            <button
              onClick={startRace}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INICIAR GRAND PRIX</span>
            </button>
          </div>
        )}

        {/* Podium Finish Overlay */}
        {gameState === 'FINISHED' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-white">BANDEIRADA FINAL!</h3>
            <div className="my-3 text-xs font-mono text-slate-300">
              <div>Chegada em: <span className="text-amber-400 font-bold text-lg">{finalPosition}º LUGAR</span></div>
              <div className="text-lg text-white font-bold mt-1">Pontos: {score}</div>
              {score > highScore && (
                <div className="text-emerald-400 font-bold mt-1">★ RECORDE DE VOLTA CONQUISTADO! ★</div>
              )}
            </div>
            <button
              onClick={startRace}
              className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>CORRER NOVAMENTE</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch On-Screen Controls */}
      <div className="w-full max-w-lg mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
        {/* Steer */}
        <div className="flex items-center gap-2">
          <button
            onMouseDown={() => (keysRef.current.left = true)}
            onMouseUp={() => (keysRef.current.left = false)}
            onTouchStart={() => (keysRef.current.left = true)}
            onTouchEnd={() => (keysRef.current.left = false)}
            className="w-14 h-12 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 text-lg"
          >
            ←
          </button>
          <button
            onMouseDown={() => (keysRef.current.right = true)}
            onMouseUp={() => (keysRef.current.right = false)}
            onTouchStart={() => (keysRef.current.right = true)}
            onTouchEnd={() => (keysRef.current.right = false)}
            className="w-14 h-12 bg-slate-800 active:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 text-lg"
          >
            →
          </button>
        </div>

        {/* Accelerate, Brake & Use Item */}
        <div className="flex items-center gap-2">
          <button
            onClick={activateItem}
            disabled={activeItem === 'NONE'}
            className="px-4 h-12 bg-amber-600 disabled:opacity-40 active:bg-amber-500 text-white font-black text-xs rounded-lg border border-amber-400 shadow-md flex items-center gap-1.5"
          >
            <span>USAR ITEM</span>
          </button>

          <button
            onMouseDown={() => (keysRef.current.down = true)}
            onMouseUp={() => (keysRef.current.down = false)}
            onTouchStart={() => (keysRef.current.down = true)}
            onTouchEnd={() => (keysRef.current.down = false)}
            className="px-3 h-12 bg-slate-800 active:bg-slate-700 text-rose-400 font-bold text-xs rounded-lg border border-slate-700"
          >
            RÉ
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
        </div>
      </div>
    </div>
  );
}
