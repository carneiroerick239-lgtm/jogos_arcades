'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Shield, Award, HelpCircle } from 'lucide-react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface SoccerGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

type ShotPhase = 'AIMING' | 'CHARGING' | 'BALL_FLYING' | 'GOAL' | 'SAVED' | 'OUT' | 'POST';

const WIDTH = 480;
const HEIGHT = 420;

// Goal Dimensions
const GOAL_LEFT = 90;
const GOAL_RIGHT = 390;
const GOAL_TOP = 110;
const GOAL_BOTTOM = 220;

export default function SoccerGame({
  onScoreUpdate,
  onGameOver,
  highScore
}: SoccerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'ROUND_OVER' | 'GAMEOVER'>('IDLE');
  const [shotPhase, setShotPhase] = useState<ShotPhase>('AIMING');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const [totalRounds] = useState(5);
  const [shotsHistory, setShotsHistory] = useState<('GOAL' | 'MISS')[]>([]);
  const [mode, setMode] = useState<'PENALTY' | 'FREEKICK'>('PENALTY');
  const [curve, setCurve] = useState<-1 | 0 | 1>(0); // -1: Left curve, 0: Straight, 1: Right curve
  const [power, setPower] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [goalMessage, setGoalMessage] = useState<string>('');

  // Aiming cursor coordinates (X and Y on the goal plane)
  const aimRef = useRef<{ x: number; y: number; vx: number }>({
    x: 240,
    y: 160,
    vx: 3
  });

  // Ball physics
  const ballRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    progress: number;
    scale: number;
    rotation: number;
  }>({
    x: 240,
    y: 370,
    targetX: 240,
    targetY: 160,
    progress: 0,
    scale: 1,
    rotation: 0
  });

  // Goalkeeper physics
  const keeperRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    diving: boolean;
    diveFrame: number;
    dir: -1 | 0 | 1;
    saveBox: { x: number; y: number; w: number; h: number };
  }>({
    x: 240,
    y: 200,
    targetX: 240,
    targetY: 200,
    diving: false,
    diveFrame: 0,
    dir: 0,
    saveBox: { x: 220, y: 180, w: 40, h: 40 }
  });

  // Wall defenders (for FREEKICK mode)
  const wallRef = useRef<{ x: number; y: number; jumpY: number }[]>([
    { x: 200, y: 260, jumpY: 0 },
    { x: 230, y: 260, jumpY: 0 },
    { x: 260, y: 260, jumpY: 0 }
  ]);

  // Confetti particles
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const chargeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize a new shot
  const resetShotPosition = useCallback(() => {
    aimRef.current.x = 240;
    aimRef.current.y = 160 + (Math.random() * 30 - 15);
    aimRef.current.vx = (Math.random() > 0.5 ? 3 : -3);

    ballRef.current = {
      x: 240,
      y: 370,
      targetX: 240,
      targetY: 160,
      progress: 0,
      scale: 1,
      rotation: 0
    };

    keeperRef.current = {
      x: 240,
      y: 200,
      targetX: 240,
      targetY: 200,
      diving: false,
      diveFrame: 0,
      dir: 0,
      saveBox: { x: 215, y: 175, w: 50, h: 45 }
    };

    wallRef.current.forEach(w => {
      w.jumpY = 0;
    });

    setPower(0);
    setIsCharging(false);
    setShotPhase('AIMING');
    setGoalMessage('');
  }, []);

  // Start new match
  const startMatch = (chosenMode?: 'PENALTY' | 'FREEKICK') => {
    if (chosenMode) setMode(chosenMode);
    retroAudio.whistle();
    setScore(0);
    setStreak(0);
    setRound(1);
    setShotsHistory([]);
    setGameState('PLAYING');
    resetShotPosition();
  };

  // Charging shot power
  const startCharging = useCallback(() => {
    if (shotPhase !== 'AIMING' || gameState !== 'PLAYING') return;
    setShotPhase('CHARGING');
    setIsCharging(true);
    setPower(0);
  }, [shotPhase, gameState]);

  // Release and kick ball
  const releaseKick = useCallback(() => {
    if (shotPhase !== 'CHARGING' || gameState !== 'PLAYING') return;
    setIsCharging(false);

    retroAudio.kick();

    // Calculate flight target with curve adjustment
    const finalPower = Math.max(15, power);
    let targetX = aimRef.current.x + curve * 45;
    let targetY = aimRef.current.y;

    // Overpowered shot lifts ball higher
    if (finalPower > 88) {
      targetY -= (finalPower - 88) * 1.5;
    } else if (finalPower < 40) {
      targetY += (40 - finalPower) * 1.2;
    }

    ballRef.current.targetX = targetX;
    ballRef.current.targetY = targetY;

    // AI Goalkeeper Decision
    // Decide dive direction based on aim with slight anticipation & random error
    const keeper = keeperRef.current;
    const aiLuck = Math.random();
    let keeperTargetX = targetX;

    if (mode === 'FREEKICK') {
      // Defenders jump
      wallRef.current.forEach(w => {
        w.jumpY = 15 + Math.random() * 10;
      });
    }

    if (aiLuck > 0.45) {
      // Goalkeeper dives correctly
      keeperTargetX = targetX + (Math.random() * 30 - 15);
    } else {
      // Goalkeeper dives wrong way or stays center
      const fakeDirs = [-70, 0, 70];
      keeperTargetX = 240 + fakeDirs[Math.floor(Math.random() * fakeDirs.length)];
    }

    keeper.diving = true;
    keeper.targetX = Math.max(GOAL_LEFT + 25, Math.min(GOAL_RIGHT - 25, keeperTargetX));
    keeper.targetY = Math.max(GOAL_TOP + 20, Math.min(GOAL_BOTTOM - 10, targetY + (Math.random() * 20 - 10)));
    keeper.dir = keeper.targetX > keeper.x ? 1 : keeper.targetX < keeper.x ? -1 : 0;

    setShotPhase('BALL_FLYING');
  }, [shotPhase, gameState, power, curve, mode]);

  // Power increment tick when holding kick
  useEffect(() => {
    if (isCharging) {
      chargeIntervalRef.current = setInterval(() => {
        setPower(p => {
          if (p >= 100) return 0; // meter bounces or cycles
          return p + 3.5;
        });
      }, 30);
    } else {
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    }
    return () => {
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, [isCharging]);

  // Spawn confetti particles for goal celebration
  const spawnConfetti = (x: number, y: number) => {
    const colors = ['#FACC15', '#10B981', '#38BDF8', '#F43F5E', '#FFFFFF'];
    for (let i = 0; i < 45; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 60
      });
    }
  };

  // Advance round or end game
  const handleShotEnd = useCallback((isGoal: boolean) => {
    setShotsHistory(prev => [...prev, isGoal ? 'GOAL' : 'MISS']);

    setTimeout(() => {
      if (round >= totalRounds) {
        setGameState('GAMEOVER');
        retroAudio.whistle();
        onGameOver(score);
      } else {
        setRound(r => r + 1);
        resetShotPosition();
      }
    }, 2000);
  }, [round, totalRounds, score, onGameOver, resetShotPosition]);

  // Evaluate shot outcome once ball reaches net plane
  const evaluateShot = useCallback(() => {
    const ball = ballRef.current;
    const keeper = keeperRef.current;

    // Check Wall collision in Free Kick mode
    if (mode === 'FREEKICK') {
      const hitWall = wallRef.current.some(
        w => Math.abs(ball.targetX - w.x) < 18 && ball.targetY > 210 - w.jumpY
      );
      if (hitWall) {
        retroAudio.hit();
        setShotPhase('SAVED');
        setGoalMessage('BLOQUEADO PELA BARREIRA!');
        handleShotEnd(false);
        return;
      }
    }

    // Check if ball hit the post / crossbar
    const hitCrossbar =
      ball.targetY >= GOAL_TOP - 8 &&
      ball.targetY <= GOAL_TOP + 8 &&
      ball.targetX >= GOAL_LEFT - 6 &&
      ball.targetX <= GOAL_RIGHT + 6;

    const hitPost =
      ball.targetY >= GOAL_TOP &&
      ball.targetY <= GOAL_BOTTOM &&
      (Math.abs(ball.targetX - GOAL_LEFT) < 8 || Math.abs(ball.targetX - GOAL_RIGHT) < 8);

    if (hitCrossbar || hitPost) {
      retroAudio.bounce(160);
      setShotPhase('POST');
      setGoalMessage('NA TRAVE!');
      handleShotEnd(false);
      return;
    }

    // Check if shot went OUT (wide or high)
    const isInsideGoal =
      ball.targetX > GOAL_LEFT + 8 &&
      ball.targetX < GOAL_RIGHT - 8 &&
      ball.targetY > GOAL_TOP + 8 &&
      ball.targetY < GOAL_BOTTOM;

    if (!isInsideGoal) {
      retroAudio.hit();
      setShotPhase('OUT');
      setGoalMessage('PRA FORA!');
      handleShotEnd(false);
      return;
    }

    // Check if Goalkeeper intercepted
    const distToKeeper = Math.hypot(ball.targetX - keeper.targetX, ball.targetY - keeper.targetY);
    if (distToKeeper < 40) {
      retroAudio.hit();
      setShotPhase('SAVED');
      setGoalMessage('DEFESA DO GOLEIRO!');
      handleShotEnd(false);
      return;
    }

    // GOAL!
    retroAudio.goalCheer();
    spawnConfetti(ball.targetX, ball.targetY);
    setShotPhase('GOAL');
    const sweetSpotBonus = power >= 65 && power <= 85 ? 150 : 100;
    const curveBonus = curve !== 0 ? 50 : 0;
    const points = sweetSpotBonus + curveBonus;

    setGoalMessage('GOLAÇO NO ÂNGULO!');
    setScore(s => {
      const next = s + points;
      onScoreUpdate(next);
      saveHighScore('soccer', next);
      return next;
    });
    setStreak(st => st + 1);
    handleShotEnd(true);
  }, [mode, power, curve, onScoreUpdate, handleShotEnd]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
          startMatch();
        } else if (shotPhase === 'AIMING') {
          startCharging();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        aimRef.current.x = Math.max(GOAL_LEFT + 15, aimRef.current.x - 12);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        aimRef.current.x = Math.min(GOAL_RIGHT - 15, aimRef.current.x + 12);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        aimRef.current.y = Math.max(GOAL_TOP + 10, aimRef.current.y - 8);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        aimRef.current.y = Math.min(GOAL_BOTTOM - 10, aimRef.current.y + 8);
      } else if (e.key === 'q' || e.key === 'Q' || e.key === '1') {
        setCurve(-1);
        retroAudio.blip(350);
      } else if (e.key === 'w' || e.key === '2') {
        setCurve(0);
        retroAudio.blip(400);
      } else if (e.key === 'e' || e.key === 'E' || e.key === '3') {
        setCurve(1);
        retroAudio.blip(450);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        if (shotPhase === 'CHARGING') {
          releaseKick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, shotPhase, startCharging, releaseKick]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1. Sky & Stadium Stands
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 110);
      skyGrad.addColorStop(0, '#0F172A');
      skyGrad.addColorStop(1, '#1E293B');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, WIDTH, 110);

      // Stadium Floodlights & Crowd Spectators (pixelated dots)
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 60, WIDTH, 50);

      for (let cy = 62; cy < 105; cy += 8) {
        for (let cx = 10; cx < WIDTH - 10; cx += 12) {
          const crowdColors = ['#E2E8F0', '#F59E0B', '#EF4444', '#10B981', '#38BDF8'];
          ctx.fillStyle = crowdColors[(cx + cy + Math.floor(frame / 20)) % crowdColors.length];
          ctx.fillRect(cx, cy, 6, 5);
        }
      }

      // Stadium Banner
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(40, 95, WIDTH - 80, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★ COPA RETRÔ DE FUTEBOL 8-BIT ★ CAMPEONATO MUNDIAL ★', WIDTH / 2, 104);

      // 2. Pitch Grass (with alternating lawn mower stripes)
      for (let y = 110; y < HEIGHT; y += 20) {
        ctx.fillStyle = (y / 20) % 2 === 0 ? '#15803D' : '#166534';
        ctx.fillRect(0, y, WIDTH, 20);
      }

      // Pitch white lines (Penalty box, penalty spot)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2.5;

      // Goal area box
      ctx.strokeRect(60, 110, WIDTH - 120, 140);
      // Six yard box
      ctx.strokeRect(120, 110, WIDTH - 240, 60);
      // Penalty spot
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(240, 370, 4, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Arc at bottom
      ctx.beginPath();
      ctx.arc(240, 250, 45, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // 3. Goal Net (3D Perspective mesh)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;

      // Net grid vertical lines
      for (let nx = GOAL_LEFT; nx <= GOAL_RIGHT; nx += 12) {
        ctx.beginPath();
        ctx.moveTo(nx, GOAL_TOP);
        ctx.lineTo(nx + (nx - 240) * 0.1, GOAL_TOP - 15);
        ctx.lineTo(nx + (nx - 240) * 0.1, GOAL_BOTTOM - 20);
        ctx.lineTo(nx, GOAL_BOTTOM);
        ctx.stroke();
      }

      // Net grid horizontal lines
      for (let ny = GOAL_TOP; ny <= GOAL_BOTTOM; ny += 10) {
        ctx.beginPath();
        ctx.moveTo(GOAL_LEFT, ny);
        ctx.lineTo(GOAL_RIGHT, ny);
        ctx.stroke();
      }

      // Goal Posts & Crossbar (White thick borders with 3D bevel)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT, GOAL_BOTTOM);
      ctx.lineTo(GOAL_LEFT, GOAL_TOP);
      ctx.lineTo(GOAL_RIGHT, GOAL_TOP);
      ctx.lineTo(GOAL_RIGHT, GOAL_BOTTOM);
      ctx.stroke();

      // 4. Free Kick Defenders Wall (if active)
      if (mode === 'FREEKICK') {
        wallRef.current.forEach(w => {
          const dy = w.y - w.jumpY;
          // Defender Jersey (Striped Blue/Red)
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(w.x - 10, dy, 20, 24);
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(w.x - 4, dy, 8, 24);
          // Head
          ctx.fillStyle = '#FBBF24';
          ctx.beginPath();
          ctx.arc(w.x, dy - 8, 7, 0, Math.PI * 2);
          ctx.fill();
          // Shorts
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(w.x - 9, dy + 24, 18, 12);
        });
      }

      // 5. Goalkeeper
      const keeper = keeperRef.current;
      if (shotPhase === 'BALL_FLYING' || shotPhase === 'GOAL' || shotPhase === 'SAVED') {
        // Goalkeeper dive movement
        keeper.x += (keeper.targetX - keeper.x) * 0.14;
        keeper.y += (keeper.targetY - keeper.y) * 0.14;
      }

      // Goalkeeper Pixel Rendering
      ctx.save();
      ctx.translate(keeper.x, keeper.y);

      // Jersey (Bright Yellow retro keeper)
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-12, -14, 24, 26);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('1', 0, 3);

      // Head with retro hair/cap
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath();
      ctx.arc(0, -22, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-8, -30, 16, 7);

      // Gloves (Padded White/Orange)
      ctx.fillStyle = '#F97316';
      if (keeper.diving) {
        // Arms stretched out in dive direction
        ctx.fillRect(keeper.dir > 0 ? 12 : -22, -18, 10, 10);
        ctx.fillRect(keeper.dir > 0 ? 6 : -16, -10, 10, 10);
      } else {
        // Ready stance
        ctx.fillRect(-20, -10, 8, 8);
        ctx.fillRect(12, -10, 8, 8);
      }

      // Goalkeeper Shorts & Socks
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(-10, 12, 20, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-9, 24, 6, 8);
      ctx.fillRect(3, 24, 6, 8);

      ctx.restore();

      // 6. Aiming Target Indicator (when aiming)
      if (shotPhase === 'AIMING' || shotPhase === 'CHARGING') {
        const aim = aimRef.current;
        // Automatic gentle sweep if not moved
        aim.x += aim.vx;
        if (aim.x > GOAL_RIGHT - 20 || aim.x < GOAL_LEFT + 20) {
          aim.vx = -aim.vx;
        }

        // Reticle (Crosshair)
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(aim.x, aim.y, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(aim.x - 20, aim.y);
        ctx.lineTo(aim.x + 20, aim.y);
        ctx.moveTo(aim.x, aim.y - 20);
        ctx.lineTo(aim.x, aim.y + 20);
        ctx.stroke();

        // Trajectory projection dotted line
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(240, 370);
        const curveOffset = curve * 40;
        ctx.quadraticCurveTo(240 + curveOffset, 270, aim.x + curveOffset, aim.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 7. Ball Flight Animation & Update
      const ball = ballRef.current;
      if (shotPhase === 'BALL_FLYING') {
        ball.progress += 0.045;
        const p = ball.progress;

        // Quadratic bezier arc towards target
        const startX = 240;
        const startY = 370;
        const ctrlX = 240 + curve * 60;
        const ctrlY = 220;

        ball.x = (1 - p) * (1 - p) * startX + 2 * (1 - p) * p * ctrlX + p * p * ball.targetX;
        ball.y = (1 - p) * (1 - p) * startY + 2 * (1 - p) * p * ctrlY + p * p * ball.targetY;
        ball.scale = 1 - p * 0.55; // Scales down as it gets farther away
        ball.rotation += 0.25;

        if (ball.progress >= 1) {
          evaluateShot();
        }
      }

      // Draw Ball Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(ball.x, Math.min(HEIGHT - 20, ball.y + 12 * ball.scale), 12 * ball.scale, 5 * ball.scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Ball
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.rotation);
      ctx.scale(ball.scale, ball.scale);

      // Ball body
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Classic Black Pentagons
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      for (let a = 0; a < 5; a++) {
        const ang = (a * 2 * Math.PI) / 5;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 8.5, Math.sin(ang) * 8.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // 8. Particles (Confetti)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.15; // Gravity
        pt.life--;

        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 4, 4);

        if (pt.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shotPhase, curve, mode, evaluateShot]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Game HUD Bar */}
      <div className="w-full max-w-lg mb-3 flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">PONTUAÇÃO</span>
            <span className="text-amber-400 text-lg font-bold">{score}</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">COBRANÇA</span>
            <span className="text-white font-bold">{round} / {totalRounds}</span>
          </div>
        </div>

        {/* History tracker circles */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalRounds }).map((_, idx) => {
            const res = shotsHistory[idx];
            return (
              <span
                key={idx}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  res === 'GOAL'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : res === 'MISS'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                {res === 'GOAL' ? '⚽' : res === 'MISS' ? '✕' : idx + 1}
              </span>
            );
          })}
        </div>

        {/* Game Mode Picker */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              if (gameState !== 'PLAYING') setMode('PENALTY');
            }}
            disabled={gameState === 'PLAYING'}
            className={`px-2 py-1 rounded text-[10px] font-bold ${
              mode === 'PENALTY' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pênalti
          </button>
          <button
            onClick={() => {
              if (gameState !== 'PLAYING') setMode('FREEKICK');
            }}
            disabled={gameState === 'PLAYING'}
            className={`px-2 py-1 rounded text-[10px] font-bold ${
              mode === 'FREEKICK' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Falta
          </button>
        </div>
      </div>

      {/* Main Pitch Canvas */}
      <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block max-w-full h-auto cursor-crosshair touch-none"
          onClick={() => {
            if (gameState === 'IDLE' || gameState === 'GAMEOVER') {
              startMatch();
            }
          }}
        />

        {/* Idle Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <span className="text-5xl mb-3">⚽</span>
            <h3 className="text-2xl font-black text-amber-400 tracking-tight">FUTEBOL RETRÔ 8-BIT</h3>
            <p className="text-slate-300 text-xs max-w-xs mt-2 mb-6">
              Aponte no ângulo, calibre a barra de força na zona verde e aplique curvas de trivela para vencer o goleiro!
            </p>
            <button
              onClick={() => startMatch()}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>COMEÇAR COPA</span>
            </button>
          </div>
        )}

        {/* Goal / Miss Banner Notification */}
        {goalMessage && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-3 bg-slate-950/95 border-2 border-amber-400 rounded-2xl shadow-2xl text-center pointer-events-none animate-bounce">
            <span className="text-2xl font-black text-amber-300 tracking-wider font-mono">
              {goalMessage}
            </span>
          </div>
        )}

        {/* Game Over / Victory Modal */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-pulse" />
            <h3 className="text-2xl font-black text-white">FIM DA DISPUTA!</h3>
            <div className="my-3 text-xs font-mono text-slate-300">
              <div>Gols marcados: <span className="text-emerald-400 font-bold">{shotsHistory.filter(s => s === 'GOAL').length} / {totalRounds}</span></div>
              <div className="text-lg text-amber-400 font-bold mt-1">Pontos Finais: {score}</div>
              {score > highScore && (
                <div className="text-emerald-400 font-bold mt-1">★ NOVO RECORDE DA ARENA! ★</div>
              )}
            </div>
            <button
              onClick={() => startMatch()}
              className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>JOGAR NOVAMENTE</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Panel (Power Meter & Curve Selectors) */}
      <div className="w-full max-w-lg mt-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-3">
        {/* Power Gauge Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400 font-bold">FORÇA DO CHUTE:</span>
            <span className={`font-bold ${power >= 65 && power <= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {Math.round(power)}% {power >= 65 && power <= 85 ? '(IDEAL ★)' : ''}
            </span>
          </div>
          <div className="w-full h-4 bg-slate-950 rounded-full border border-slate-700 overflow-hidden relative">
            {/* Optimal zone marker */}
            <div className="absolute left-[65%] w-[20%] h-full bg-emerald-500/20 border-x border-emerald-500" />
            <div
              className={`h-full transition-all duration-75 ${
                power > 88 ? 'bg-rose-500' : power >= 65 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${power}%` }}
            />
          </div>
        </div>

        {/* Interactive Buttons (Touch & Mouse friendly) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Curve Left */}
          <button
            onClick={() => {
              setCurve(-1);
              retroAudio.blip(350);
            }}
            className={`py-2 px-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-colors ${
              curve === -1
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>↺ Curva Esq</span>
          </button>

          {/* Straight */}
          <button
            onClick={() => {
              setCurve(0);
              retroAudio.blip(400);
            }}
            className={`py-2 px-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-colors ${
              curve === 0
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>| Reto</span>
          </button>

          {/* Curve Right */}
          <button
            onClick={() => {
              setCurve(1);
              retroAudio.blip(450);
            }}
            className={`py-2 px-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 transition-colors ${
              curve === 1
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>↻ Curva Dir</span>
          </button>

          {/* Big Kick Trigger Button */}
          <button
            onMouseDown={startCharging}
            onMouseUp={releaseKick}
            onTouchStart={startCharging}
            onTouchEnd={releaseKick}
            disabled={gameState !== 'PLAYING' || shotPhase === 'BALL_FLYING'}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-lg transition-transform active:scale-95 shadow-md flex items-center justify-center gap-1.5"
          >
            <span>⚡ SEGURE P/ CHUTAR</span>
          </button>
        </div>

        {/* Help tooltip note */}
        <div className="text-[10px] text-slate-400 text-center font-mono">
          Controles: Mova mira com ←/→/↑/↓ · Segure ESPAÇO para dosar e solte para chutar!
        </div>
      </div>
    </div>
  );
}
