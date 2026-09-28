'use client';

import React, { useEffect, useRef, useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface PongGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function PongGame({ onScoreUpdate, onGameOver, highScore }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');
  const [mode, setMode] = useState<'1P' | '2P'>('1P');
  const [aiDifficulty, setAiDifficulty] = useState<'FACIL' | 'MEDIO' | 'LENDARIO'>('MEDIO');
  const [targetScore, setTargetScore] = useState<number>(5);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  // Core state refs
  const p1YRef = useRef<number>(180);
  const p2YRef = useRef<number>(180);
  const ballRef = useRef<{ x: number; y: number; vx: number; vy: number; speed: number }>({
    x: 260,
    y: 195,
    vx: 4,
    vy: 2,
    speed: 5
  });
  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const animationFrameRef = useRef<number>(0);
  const p1ScoreRef = useRef(0);
  const p2ScoreRef = useRef(0);

  const CANVAS_WIDTH = 540;
  const CANVAS_HEIGHT = 380;
  const PADDLE_WIDTH = 12;
  const PADDLE_HEIGHT = 70;
  const BALL_SIZE = 10;

  const resetBall = (directionToP2: boolean) => {
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: (directionToP2 ? 1 : -1) * 4.5,
      vy: (Math.random() * 4 - 2),
      speed: 4.5
    };
    trailRef.current = [];
  };

  const startGame = () => {
    retroAudio.coin();
    p1ScoreRef.current = 0;
    p2ScoreRef.current = 0;
    setPlayer1Score(0);
    setPlayer2Score(0);
    p1YRef.current = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    p2YRef.current = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    resetBall(Math.random() > 0.5);
    setWinner(null);
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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', ' '].includes(e.key)) {
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

    const gameLoop = () => {
      if (!isRunning) return;

      if (gameState === 'PLAYING') {
        const keys = keysRef.current;
        const paddleSpeed = 6;

        // Player 1 controls (W / S or ArrowUp / ArrowDown in 1P mode)
        if (keys['w'] || (mode === '1P' && keys['arrowup'])) {
          p1YRef.current = Math.max(0, p1YRef.current - paddleSpeed);
        }
        if (keys['s'] || (mode === '1P' && keys['arrowdown'])) {
          p1YRef.current = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p1YRef.current + paddleSpeed);
        }

        // Player 2 / AI controls
        if (mode === '2P') {
          if (keys['arrowup']) {
            p2YRef.current = Math.max(0, p2YRef.current - paddleSpeed);
          }
          if (keys['arrowdown']) {
            p2YRef.current = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p2YRef.current + paddleSpeed);
          }
        } else {
          // AI Logic
          const targetY = ballRef.current.y - PADDLE_HEIGHT / 2;
          const aiSpeed = aiDifficulty === 'FACIL' ? 3.2 : aiDifficulty === 'MEDIO' ? 4.6 : 6.0;
          const aiError = aiDifficulty === 'FACIL' ? 24 : aiDifficulty === 'MEDIO' ? 12 : 2;

          if (ballRef.current.vx > 0) {
            if (p2YRef.current + PADDLE_HEIGHT / 2 < targetY - aiError) {
              p2YRef.current = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p2YRef.current + aiSpeed);
            } else if (p2YRef.current + PADDLE_HEIGHT / 2 > targetY + aiError) {
              p2YRef.current = Math.max(0, p2YRef.current - aiSpeed);
            }
          }
        }

        // Move Ball
        const ball = ballRef.current;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Add to ball trail
        trailRef.current.unshift({ x: ball.x, y: ball.y });
        if (trailRef.current.length > 6) trailRef.current.pop();

        // Top and bottom collision
        if (ball.y <= BALL_SIZE / 2) {
          ball.y = BALL_SIZE / 2;
          ball.vy = -ball.vy;
          retroAudio.bounce(350);
        } else if (ball.y >= CANVAS_HEIGHT - BALL_SIZE / 2) {
          ball.y = CANVAS_HEIGHT - BALL_SIZE / 2;
          ball.vy = -ball.vy;
          retroAudio.bounce(350);
        }

        // Paddle 1 Collision
        const p1X = 25;
        if (
          ball.x - BALL_SIZE / 2 <= p1X + PADDLE_WIDTH &&
          ball.x + BALL_SIZE / 2 >= p1X &&
          ball.y >= p1YRef.current &&
          ball.y <= p1YRef.current + PADDLE_HEIGHT &&
          ball.vx < 0
        ) {
          // Calculate angle based on where ball hits paddle
          const delta = (ball.y - (p1YRef.current + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          ball.speed = Math.min(9.5, ball.speed + 0.3);
          ball.vx = Math.abs(Math.cos(delta * 0.9) * ball.speed);
          ball.vy = Math.sin(delta * 0.9) * ball.speed;
          ball.x = p1X + PADDLE_WIDTH + BALL_SIZE / 2;
          retroAudio.bounce(480);
        }

        // Paddle 2 Collision
        const p2X = CANVAS_WIDTH - 25 - PADDLE_WIDTH;
        if (
          ball.x + BALL_SIZE / 2 >= p2X &&
          ball.x - BALL_SIZE / 2 <= p2X + PADDLE_WIDTH &&
          ball.y >= p2YRef.current &&
          ball.y <= p2YRef.current + PADDLE_HEIGHT &&
          ball.vx > 0
        ) {
          const delta = (ball.y - (p2YRef.current + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
          ball.speed = Math.min(9.5, ball.speed + 0.3);
          ball.vx = -Math.abs(Math.cos(delta * 0.9) * ball.speed);
          ball.vy = Math.sin(delta * 0.9) * ball.speed;
          ball.x = p2X - BALL_SIZE / 2;
          retroAudio.bounce(420);
        }

        // Scoring
        if (ball.x < 0) {
          // Player 2 scored
          p2ScoreRef.current += 1;
          setPlayer2Score(p2ScoreRef.current);
          retroAudio.hit();
          if (p2ScoreRef.current >= targetScore) {
            setWinner(mode === '1P' ? 'Computador' : 'Jogador 2');
            setGameState('GAMEOVER');
            retroAudio.gameOver();
          } else {
            resetBall(true);
          }
        } else if (ball.x > CANVAS_WIDTH) {
          // Player 1 scored
          p1ScoreRef.current += 1;
          setPlayer1Score(p1ScoreRef.current);
          retroAudio.eat();
          if (onScoreUpdate) onScoreUpdate(p1ScoreRef.current);
          if (p1ScoreRef.current >= targetScore) {
            setWinner('Jogador 1');
            setGameState('GAMEOVER');
            saveHighScore('pong', p1ScoreRef.current);
            retroAudio.victory();
            if (onGameOver) onGameOver(p1ScoreRef.current);
          } else {
            resetBall(false);
          }
        }
      }

      // Render Frame
      render(ctx);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const render = (context: CanvasRenderingContext2D) => {
      // Classic Dark Blue Arcade Table
      context.fillStyle = '#060d17';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Center dotted line
      context.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      context.lineWidth = 4;
      context.setLineDash([10, 10]);
      context.beginPath();
      context.moveTo(CANVAS_WIDTH / 2, 0);
      context.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      context.stroke();
      context.setLineDash([]);

      // Borders
      context.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      context.lineWidth = 3;
      context.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);

      // Scoreboard numbers in retro font
      context.fillStyle = 'rgba(255, 255, 255, 0.85)';
      context.font = 'bold 36px monospace';
      context.textAlign = 'center';
      context.fillText(String(p1ScoreRef.current), CANVAS_WIDTH / 2 - 60, 50);
      context.fillText(String(p2ScoreRef.current), CANVAS_WIDTH / 2 + 60, 50);

      // Player names quiet above paddles
      context.font = '10px monospace';
      context.fillStyle = '#94A3B8';
      context.fillText('JOGADOR 1', 60, 20);
      context.fillText(mode === '1P' ? 'COMPUTADOR' : 'JOGADOR 2', CANVAS_WIDTH - 70, 20);

      // Render Ball Trail
      trailRef.current.forEach((t, i) => {
        context.save();
        context.fillStyle = `rgba(56, 189, 248, ${0.4 - i * 0.06})`;
        context.beginPath();
        context.arc(t.x, t.y, BALL_SIZE / 2 * (1 - i * 0.1), 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      // Render Ball
      const ball = ballRef.current;
      context.save();
      context.fillStyle = '#38BDF8';
      context.shadowColor = '#0284C7';
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2);
      context.fill();
      context.restore();

      // Render Player 1 Paddle
      context.save();
      context.fillStyle = '#38BDF8';
      context.shadowColor = '#0284C7';
      context.shadowBlur = 8;
      context.beginPath();
      context.roundRect(25, p1YRef.current, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
      context.fill();
      context.restore();

      // Render Player 2 Paddle
      context.save();
      context.fillStyle = '#F43F5E';
      context.shadowColor = '#E11D48';
      context.shadowBlur = 8;
      context.beginPath();
      context.roundRect(CANVAS_WIDTH - 25 - PADDLE_WIDTH, p2YRef.current, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
      context.fill();
      context.restore();

      // Overlay messages
      if (gameState === 'IDLE') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#38BDF8';
        context.font = 'bold 24px monospace';
        context.fillText('PONG CLÁSSICO 1972', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

        context.fillStyle = '#E2E8F0';
        context.font = '14px monospace';
        context.fillText('Pressione Iniciar ou ESPAÇO', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        context.fillStyle = '#94A3B8';
        context.font = '12px monospace';
        context.fillText('W/S ou Setas para rebater a bola', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      } else if (gameState === 'PAUSED') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = '#F59E0B';
        context.font = 'bold 24px monospace';
        context.fillText('PARTIDA PAUSADA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        context.fillStyle = '#E2E8F0';
        context.font = '13px monospace';
        context.fillText('Pressione P para continuar', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      } else if (gameState === 'GAMEOVER') {
        context.fillStyle = 'rgba(15, 23, 42, 0.85)';
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        context.textAlign = 'center';
        context.fillStyle = winner === 'Jogador 1' ? '#38BDF8' : '#F43F5E';
        context.font = 'bold 24px monospace';
        context.fillText(`VITÓRIA DE: ${winner?.toUpperCase()}!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 25);

        context.fillStyle = '#F8FAFC';
        context.font = '16px monospace';
        context.fillText(`Placar: ${p1ScoreRef.current} x ${p2ScoreRef.current}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

        context.fillStyle = '#94A3B8';
        context.font = '13px monospace';
        context.fillText('Pressione Iniciar para nova partida', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 45);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, mode, aiDifficulty, targetScore, onGameOver, onScoreUpdate]);

  // Touch move handlers for mobile screen
  const movePaddle = (dir: 'UP' | 'DOWN', player: 1 | 2 = 1) => {
    if (gameState !== 'PLAYING') return;
    const delta = dir === 'UP' ? -30 : 30;
    if (player === 1) {
      p1YRef.current = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p1YRef.current + delta));
    } else {
      p2YRef.current = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p2YRef.current + delta));
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* HUD Info */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>JOGADOR 1: <strong className="text-sky-400 tabular-nums text-sm">{player1Score}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>{mode === '1P' ? 'CPU' : 'JOGADOR 2'}: <strong className="text-rose-400 tabular-nums text-sm">{player2Score}</strong></span>
        </div>
        <div>
          <span>ALVO: <strong className="text-amber-400 tabular-nums text-sm">{targetScore} Pts</strong></span>
        </div>
      </div>

      {/* Pong Canvas */}
      <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden bg-black shadow-2xl w-full aspect-[540/380] max-w-[540px]">
        <canvas
          ref={canvasRef}
          width={540}
          height={380}
          className="w-full h-full block"
        />
      </div>

      {/* Controls Bar */}
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
              className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-95 transition-transform rounded shadow"
            >
              {gameState === 'GAMEOVER' ? 'Jogar de Novo' : 'Iniciar Partida'}
            </button>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800">
            <button
              onClick={() => setMode('1P')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mode === '1P' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1 Jogador
            </button>
            <button
              onClick={() => setMode('2P')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mode === '2P' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2 Jogadores
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 text-xs">
          {mode === '1P' && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px] px-1">IA:</span>
              {(['FACIL', 'MEDIO', 'LENDARIO'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setAiDifficulty(diff)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    aiDifficulty === diff ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {diff === 'FACIL' ? 'Fácil' : diff === 'MEDIO' ? 'Médio' : 'Pro'}
                </button>
              ))}
            </div>
          )}

          {/* Points target */}
          <button
            onClick={() => setTargetScore(prev => prev === 5 ? 10 : 5)}
            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700"
          >
            Meta: {targetScore} pts
          </button>
        </div>
      </div>

      {/* Mobile Touch buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex justify-between items-center px-4 sm:hidden">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-sky-400 font-mono">P1 (Cima/Baixo)</span>
          <div className="flex gap-2">
            <button
              onClick={() => movePaddle('UP', 1)}
              className="w-12 h-12 bg-slate-800 active:bg-sky-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
            >
              ▲
            </button>
            <button
              onClick={() => movePaddle('DOWN', 1)}
              className="w-12 h-12 bg-slate-800 active:bg-sky-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
            >
              ▼
            </button>
          </div>
        </div>

        {mode === '2P' && (
          <div className="flex flex-col gap-2 items-end">
            <span className="text-[10px] text-rose-400 font-mono">P2 (Cima/Baixo)</span>
            <div className="flex gap-2">
              <button
                onClick={() => movePaddle('UP', 2)}
                className="w-12 h-12 bg-slate-800 active:bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
              >
                ▲
              </button>
              <button
                onClick={() => movePaddle('DOWN', 2)}
                className="w-12 h-12 bg-slate-800 active:bg-rose-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
              >
                ▼
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
