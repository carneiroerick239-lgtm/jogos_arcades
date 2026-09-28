'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface PacmanGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface Entity {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  speed: number;
}

interface Ghost extends Entity {
  id: number;
  color: string;
  name: string;
  isFrightened: boolean;
  frightenedTimer: number;
  homeX: number;
  homeY: number;
  isEaten: boolean;
}

// 0: empty, 1: wall, 2: pellet, 3: power pellet, 4: ghost house
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,4,4,4,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const ROWS = INITIAL_MAP.length;
const COLS = INITIAL_MAP[0].length;
const TILE_SIZE = 22;

export default function PacmanGame({ onScoreUpdate, onGameOver, highScore }: PacmanGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);

  const mapRef = useRef<number[][]>(JSON.parse(JSON.stringify(INITIAL_MAP)));
  const pacmanRef = useRef<Entity>({
    x: 9 * TILE_SIZE + TILE_SIZE / 2,
    y: 16 * TILE_SIZE + TILE_SIZE / 2,
    dir: 'LEFT',
    nextDir: 'LEFT',
    speed: 2.2
  });

  const ghostsRef = useRef<Ghost[]>([
    { id: 0, name: 'Blinky', color: '#EF4444', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 9 * TILE_SIZE, dir: 'UP', nextDir: 'UP', speed: 1.8, isFrightened: false, frightenedTimer: 0, homeX: 9, homeY: 9, isEaten: false },
    { id: 1, name: 'Pinky', color: '#F472B6', x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE, dir: 'UP', nextDir: 'UP', speed: 1.7, isFrightened: false, frightenedTimer: 0, homeX: 8, homeY: 10, isEaten: false },
    { id: 2, name: 'Inky', color: '#38BDF8', x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE, dir: 'UP', nextDir: 'UP', speed: 1.6, isFrightened: false, frightenedTimer: 0, homeX: 10, homeY: 10, isEaten: false },
    { id: 3, name: 'Clyde', color: '#FB923C', x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE, dir: 'UP', nextDir: 'UP', speed: 1.5, isFrightened: false, frightenedTimer: 0, homeX: 9, homeY: 10, isEaten: false }
  ]);

  const chompAngleRef = useRef(0.2);
  const chompDirRef = useRef(1);
  const consecutiveGhostsEaten = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const isWall = (col: number, row: number, allowGhostHouse = false): boolean => {
    if (row < 0 || row >= ROWS) return false;
    if (col < 0 || col >= COLS) return false;
    const tile = mapRef.current[row][col];
    if (tile === 1) return true;
    if (tile === 4 && !allowGhostHouse) return true;
    return false;
  };

  const canMove = (x: number, y: number, dir: Direction, isGhost = false, allowGhostHouse = false): boolean => {
    const margin = 7;
    let checkX = x;
    let checkY = y;

    if (dir === 'UP') checkY -= margin;
    else if (dir === 'DOWN') checkY += margin;
    else if (dir === 'LEFT') checkX -= margin;
    else if (dir === 'RIGHT') checkX += margin;

    const col = Math.floor(checkX / TILE_SIZE);
    const row = Math.floor(checkY / TILE_SIZE);

    return !isWall(col, row, isGhost && allowGhostHouse);
  };

  const resetPositions = () => {
    pacmanRef.current = {
      x: 9 * TILE_SIZE + TILE_SIZE / 2,
      y: 16 * TILE_SIZE + TILE_SIZE / 2,
      dir: 'LEFT',
      nextDir: 'LEFT',
      speed: 2.2
    };

    ghostsRef.current.forEach((g, idx) => {
      g.x = (8 + (idx % 3)) * TILE_SIZE + TILE_SIZE / 2;
      g.y = (9 + Math.floor(idx / 3)) * TILE_SIZE;
      g.dir = 'UP';
      g.nextDir = 'UP';
      g.isFrightened = false;
      g.frightenedTimer = 0;
      g.isEaten = false;
    });
  };

  const restartGame = () => {
    mapRef.current = JSON.parse(JSON.stringify(INITIAL_MAP));
    setScore(0);
    setLives(3);
    setLevel(1);
    consecutiveGhostsEaten.current = 0;
    resetPositions();
    setGameState('PLAYING');
    retroAudio.coin();
  };

  const countRemainingPellets = (): number => {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (mapRef.current[r][c] === 2 || mapRef.current[r][c] === 3) count++;
      }
    }
    return count;
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'p', 'P'].includes(e.key)) {
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

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        pacmanRef.current.nextDir = 'UP';
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        pacmanRef.current.nextDir = 'DOWN';
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        pacmanRef.current.nextDir = 'LEFT';
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        pacmanRef.current.nextDir = 'RIGHT';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Canvas drawing function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#05070F';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = mapRef.current[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === 1) {
          // Maze wall (neon blue retro border)
          ctx.fillStyle = '#1E3A8A';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === 4) {
          // Ghost house gate
          ctx.fillStyle = '#1E1B4B';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#EC4899';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE_SIZE / 2);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
          ctx.stroke();
        } else if (tile === 2) {
          // Normal pellet
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 3) {
          // Power pellet (pulsing yellow glow)
          const pulse = Math.sin(Date.now() / 150) * 1.5 + 5;
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Pacman
    const pac = pacmanRef.current;
    let angleOffset = 0;
    if (pac.dir === 'RIGHT') angleOffset = 0;
    else if (pac.dir === 'DOWN') angleOffset = 0.5 * Math.PI;
    else if (pac.dir === 'LEFT') angleOffset = Math.PI;
    else if (pac.dir === 'UP') angleOffset = 1.5 * Math.PI;

    const mouth = chompAngleRef.current;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(
      pac.x,
      pac.y,
      TILE_SIZE * 0.45,
      angleOffset + mouth * Math.PI,
      angleOffset + (2 - mouth) * Math.PI
    );
    ctx.lineTo(pac.x, pac.y);
    ctx.closePath();
    ctx.fill();

    // Pacman eye
    ctx.fillStyle = '#000';
    const eyeX = pac.x + Math.cos(angleOffset - 0.3 * Math.PI) * 4;
    const eyeY = pac.y + Math.sin(angleOffset - 0.3 * Math.PI) * 4;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Ghosts
    ghostsRef.current.forEach(ghost => {
      const gx = ghost.x;
      const gy = ghost.y;
      const gr = TILE_SIZE * 0.42;

      ctx.save();
      if (ghost.isEaten) {
        // Just eyes floating back
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 2, 3, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 2, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // Ghost body
      if (ghost.isFrightened) {
        // Frightened blue (flash white when near expiration)
        const isFlashing = ghost.frightenedTimer < 100 && Math.floor(ghost.frightenedTimer / 10) % 2 === 0;
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#2563EB';
      } else {
        ctx.fillStyle = ghost.color;
      }

      ctx.beginPath();
      ctx.arc(gx, gy - 2, gr, Math.PI, 0, false);
      // Ghost skirt tentacle wiggles
      ctx.lineTo(gx + gr, gy + gr);
      ctx.lineTo(gx + gr * 0.5, gy + gr - 3);
      ctx.lineTo(gx, gy + gr);
      ctx.lineTo(gx - gr * 0.5, gy + gr - 3);
      ctx.lineTo(gx - gr, gy + gr);
      ctx.closePath();
      ctx.fill();

      // Ghost Eyes
      if (!ghost.isFrightened) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 3, 3, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Pupils look toward ghost direction
        let lookX = 0;
        let lookY = 0;
        if (ghost.dir === 'LEFT') lookX = -1.5;
        if (ghost.dir === 'RIGHT') lookX = 1.5;
        if (ghost.dir === 'UP') lookY = -1.5;
        if (ghost.dir === 'DOWN') lookY = 1.5;

        ctx.fillStyle = '#1E3A8A';
        ctx.beginPath();
        ctx.arc(gx - 4 + lookX, gy - 3 + lookY, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 4 + lookX, gy - 3 + lookY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Frightened face (wiggly mouth)
        ctx.fillStyle = '#FED7AA';
        ctx.beginPath();
        ctx.arc(gx - 3, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(gx + 3, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }, []);

  // Main Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let isWakaHigh = false;

    const loop = () => {
      const pacman = pacmanRef.current;
      const ghosts = ghostsRef.current;

      // 1. Chomp animation
      chompAngleRef.current += 0.035 * chompDirRef.current;
      if (chompAngleRef.current > 0.38) chompDirRef.current = -1;
      else if (chompAngleRef.current < 0.05) chompDirRef.current = 1;

      // 2. Pacman direction turning
      const canTurnNext = canMove(pacman.x, pacman.y, pacman.nextDir);
      if (canTurnNext) {
        // Snap to grid axis when turning 90 degrees
        const isTurningVertical = pacman.nextDir === 'UP' || pacman.nextDir === 'DOWN';
        const isCurrentHorizontal = pacman.dir === 'LEFT' || pacman.dir === 'RIGHT';
        if (isTurningVertical && isCurrentHorizontal) {
          const targetX = Math.round(pacman.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          if (Math.abs(pacman.x - targetX) < 8) pacman.x = targetX;
        } else if (!isTurningVertical && !isCurrentHorizontal) {
          const targetY = Math.round(pacman.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
          if (Math.abs(pacman.y - targetY) < 8) pacman.y = targetY;
        }
        pacman.dir = pacman.nextDir;
      }

      // 3. Move Pacman
      if (canMove(pacman.x, pacman.y, pacman.dir)) {
        if (pacman.dir === 'UP') pacman.y -= pacman.speed;
        else if (pacman.dir === 'DOWN') pacman.y += pacman.speed;
        else if (pacman.dir === 'LEFT') pacman.x -= pacman.speed;
        else if (pacman.dir === 'RIGHT') pacman.x += pacman.speed;
      }

      // Screen Wrap-around tunnel
      if (pacman.x < 0) pacman.x = COLS * TILE_SIZE - 2;
      else if (pacman.x > COLS * TILE_SIZE) pacman.x = 2;

      // 4. Eat Pellets
      const col = Math.floor(pacman.x / TILE_SIZE);
      const row = Math.floor(pacman.y / TILE_SIZE);

      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const tile = mapRef.current[row][col];
        if (tile === 2) {
          // Normal pellet
          mapRef.current[row][col] = 0;
          setScore(s => {
            const next = s + 10;
            onScoreUpdate(next);
            return next;
          });
          isWakaHigh = !isWakaHigh;
          retroAudio.waka(isWakaHigh);

          // Check win condition
          if (countRemainingPellets() === 0) {
            retroAudio.victory();
            setGameState('VICTORY');
            return;
          }
        } else if (tile === 3) {
          // Power Pellet
          mapRef.current[row][col] = 0;
          setScore(s => {
            const next = s + 50;
            onScoreUpdate(next);
            return next;
          });
          retroAudio.bonus();
          consecutiveGhostsEaten.current = 0;

          // Scare ghosts
          ghosts.forEach(g => {
            if (!g.isEaten) {
              g.isFrightened = true;
              g.frightenedTimer = 360; // ~6 seconds at 60fps
            }
          });
        }
      }

      // 5. Update Ghosts
      const DIRS: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      ghosts.forEach(ghost => {
        if (ghost.isFrightened) {
          ghost.frightenedTimer--;
          if (ghost.frightenedTimer <= 0) {
            ghost.isFrightened = false;
          }
        }

        // Return to home if eaten
        if (ghost.isEaten) {
          const targetX = ghost.homeX * TILE_SIZE + TILE_SIZE / 2;
          const targetY = ghost.homeY * TILE_SIZE;
          const dx = targetX - ghost.x;
          const dy = targetY - ghost.y;
          ghost.x += Math.sign(dx) * 3;
          ghost.y += Math.sign(dy) * 3;
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
            ghost.isEaten = false;
            ghost.isFrightened = false;
          }
          return;
        }

        // Move Ghost
        const curSpeed = ghost.isFrightened ? ghost.speed * 0.65 : ghost.speed;
        if (canMove(ghost.x, ghost.y, ghost.dir, true, true)) {
          if (ghost.dir === 'UP') ghost.y -= curSpeed;
          else if (ghost.dir === 'DOWN') ghost.y += curSpeed;
          else if (ghost.dir === 'LEFT') ghost.x -= curSpeed;
          else if (ghost.dir === 'RIGHT') ghost.x += curSpeed;
        } else {
          // Pick a valid random direction that isn't the direct opposite if possible
          const valid = DIRS.filter(d => canMove(ghost.x, ghost.y, d, true, true));
          if (valid.length > 0) {
            ghost.dir = valid[Math.floor(Math.random() * valid.length)];
          }
        }

        // Ghost tunnel wrap
        if (ghost.x < 0) ghost.x = COLS * TILE_SIZE - 2;
        else if (ghost.x > COLS * TILE_SIZE) ghost.x = 2;

        // Random intersection decision
        if (Math.random() < 0.05) {
          const valid = DIRS.filter(d => canMove(ghost.x, ghost.y, d, true, true));
          if (valid.length > 0) {
            ghost.dir = valid[Math.floor(Math.random() * valid.length)];
          }
        }

        // 6. Collision with Pacman
        const dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y);
        if (dist < TILE_SIZE * 0.75) {
          if (ghost.isFrightened && !ghost.isEaten) {
            // Eat ghost!
            ghost.isEaten = true;
            consecutiveGhostsEaten.current++;
            const points = Math.min(1600, 200 * Math.pow(2, consecutiveGhostsEaten.current - 1));
            setScore(s => {
              const next = s + points;
              onScoreUpdate(next);
              return next;
            });
            retroAudio.bonus();
          } else if (!ghost.isEaten) {
            // Pacman dies!
            retroAudio.hit();
            setLives(prevLives => {
              const remaining = prevLives - 1;
              if (remaining <= 0) {
                retroAudio.gameOver();
                setGameState('GAMEOVER');
                onGameOver(score);
              } else {
                resetPositions();
              }
              return remaining;
            });
          }
        }
      });

      // 7. Render
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, score, renderCanvas]);

  // Initial render when idle
  useEffect(() => {
    renderCanvas();
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      {/* HUD Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        <div>
          <span className="text-slate-400">PONTUAÇÃO: </span>
          <span className="text-amber-400 font-bold tabular-nums text-sm">{score}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">VIDAS:</span>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < lives ? 'bg-amber-400' : 'bg-slate-800'
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

      {/* Screen Canvas Container */}
      <div className="relative border-x-4 border-b-4 border-slate-800 bg-black flex justify-center items-center shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          width={COLS * TILE_SIZE}
          height={ROWS * TILE_SIZE}
          className="max-w-full h-auto block"
        />

        {/* Overlay for States */}
        {gameState !== 'PLAYING' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            {gameState === 'IDLE' && (
              <>
                <h3 className="text-2xl font-black text-amber-400 tracking-wider font-mono mb-2">
                  PAC-MAZE 1980
                </h3>
                <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
                  Devore todas as pastilhas, colete as pílulas de força para assustar os fantasmas e acumule recordes lendários!
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jogar Agora</span>
                </button>
              </>
            )}

            {gameState === 'PAUSED' && (
              <>
                <h3 className="text-2xl font-black text-amber-400 tracking-wider font-mono mb-4">
                  JOGO PAUSADO
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
                  GAME OVER
                </h3>
                <p className="text-xs text-slate-400 mb-1 font-mono">Pontuação Final:</p>
                <p className="text-3xl font-black text-white font-mono tabular-nums mb-6">
                  {score}
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Tentar Novamente</span>
                </button>
              </>
            )}

            {gameState === 'VICTORY' && (
              <>
                <h3 className="text-2xl font-black text-emerald-400 tracking-wider font-mono mb-2">
                  LABIRINTO LIMPO!
                </h3>
                <p className="text-xs text-slate-300 mb-1 font-mono">Pontuação da Rodada:</p>
                <p className="text-3xl font-black text-amber-400 font-mono tabular-nums mb-6">
                  {score}
                </p>
                <button
                  onClick={restartGame}
                  className="px-6 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Próxima Rodada</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Virtual D-Pad for Mobile Touch Devices */}
      <div className="w-full mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => {
            pacmanRef.current.nextDir = 'UP';
          }}
          className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => {
              pacmanRef.current.nextDir = 'LEFT';
            }}
            className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              pacmanRef.current.nextDir = 'DOWN';
            }}
            className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              pacmanRef.current.nextDir = 'RIGHT';
            }}
            className="w-14 h-12 bg-slate-800 active:bg-amber-500 text-white active:text-slate-950 rounded-lg flex items-center justify-center border border-slate-700"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
