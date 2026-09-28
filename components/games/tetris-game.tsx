'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface Piece {
  type: TetrominoType;
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const TETROMINOES: Record<TetrominoType, { shape: number[][]; color: string }> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#06B6D4' // Cyan
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#FACC15' // Yellow
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#A855F7' // Purple
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#22C55E' // Green
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#EF4444' // Red
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#3B82F6' // Blue
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#F97316' // Orange
  }
};

const COLS = 10;
const ROWS = 20;

interface TetrisGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function TetrisGame({ onScoreUpdate, onGameOver, highScore }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastTetra, setLastTetra] = useState(false);

  // Core Game Refs
  const gridRef = useRef<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
  const currentPieceRef = useRef<Piece | null>(null);
  const nextPieceTypeRef = useRef<TetrominoType>('T');
  const holdPieceTypeRef = useRef<TetrominoType | null>(null);
  const canHoldRef = useRef<boolean>(true);
  const lastDropTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);

  const getRandomPieceType = (): TetrominoType => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const createPiece = (type: TetrominoType): Piece => {
    const data = TETROMINOES[type];
    return {
      type,
      shape: data.shape.map(row => [...row]),
      color: data.color,
      x: Math.floor((COLS - data.shape[0].length) / 2),
      y: 0
    };
  };

  const checkCollision = (piece: Piece, offsetX = 0, offsetY = 0, testShape?: number[][]): boolean => {
    const shape = testShape || piece.shape;
    const grid = gridRef.current;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nextX = piece.x + c + offsetX;
          const nextY = piece.y + r + offsetY;

          if (nextX < 0 || nextX >= COLS || nextY >= ROWS) {
            return true;
          }
          if (nextY >= 0 && grid[nextY][nextX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotateMatrix = (matrix: number[][]): number[][] => {
    const N = matrix.length;
    const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        result[j][N - 1 - i] = matrix[i][j];
      }
    }
    return result;
  };

  const getDropInterval = () => {
    // Speeds up as level increases
    return Math.max(100, 800 - (levelRef.current - 1) * 75);
  };

  const calculateGhostY = (): number => {
    const piece = currentPieceRef.current;
    if (!piece) return 0;
    let offset = 0;
    while (!checkCollision(piece, 0, offset + 1)) {
      offset++;
    }
    return piece.y + offset;
  };

  const lockPiece = () => {
    const piece = currentPieceRef.current;
    if (!piece) return;

    const grid = gridRef.current;
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          const targetY = piece.y + r;
          const targetX = piece.x + c;
          if (targetY < 0) {
            // Lock out of screen -> Game Over
            retroAudio.gameOver();
            setGameState('GAMEOVER');
            saveHighScore('tetris', scoreRef.current);
            if (onGameOver) onGameOver(scoreRef.current);
            return;
          }
          grid[targetY][targetX] = piece.color;
        }
      }
    }

    retroAudio.blip(260);

    // Check completed rows
    let rowsCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r].every(cell => cell !== '')) {
        grid.splice(r, 1);
        grid.unshift(Array(COLS).fill(''));
        rowsCleared++;
        r++; // Recheck same row index since lines dropped
      }
    }

    if (rowsCleared > 0) {
      const isTetra = rowsCleared === 4;
      retroAudio.lineClear(isTetra);
      if (isTetra) {
        setLastTetra(true);
        setTimeout(() => setLastTetra(false), 1200);
      }

      const pointsTable = [0, 100, 300, 500, 800];
      const ptsEarned = pointsTable[rowsCleared] * levelRef.current;
      scoreRef.current += ptsEarned;
      linesRef.current += rowsCleared;
      setScore(scoreRef.current);
      setLines(linesRef.current);

      if (onScoreUpdate) onScoreUpdate(scoreRef.current);

      // Level up every 10 lines
      const newLvl = Math.floor(linesRef.current / 10) + 1;
      if (newLvl !== levelRef.current) {
        levelRef.current = newLvl;
        setLevel(newLvl);
        retroAudio.bonus();
      }
    }

    // Spawn next piece
    spawnNextPiece();
    canHoldRef.current = true;
  };

  const spawnNextPiece = () => {
    const nextType = nextPieceTypeRef.current;
    const newPiece = createPiece(nextType);
    nextPieceTypeRef.current = getRandomPieceType();

    if (checkCollision(newPiece)) {
      // Cannot spawn piece -> Game Over
      retroAudio.gameOver();
      setGameState('GAMEOVER');
      saveHighScore('tetris', scoreRef.current);
      if (onGameOver) onGameOver(scoreRef.current);
      return;
    }

    currentPieceRef.current = newPiece;
  };

  const hardDrop = () => {
    if (gameState !== 'PLAYING' || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    let dropped = 0;
    while (!checkCollision(piece, 0, 1)) {
      piece.y++;
      dropped++;
    }
    scoreRef.current += dropped * 2;
    setScore(scoreRef.current);
    lockPiece();
  };

  const rotate = () => {
    if (gameState !== 'PLAYING' || !currentPieceRef.current) return;
    const piece = currentPieceRef.current;
    if (piece.type === 'O') return; // O doesn't rotate

    const rotated = rotateMatrix(piece.shape);

    // Wall kick attempts
    const kicks = [0, 1, -1, 2, -2];
    for (const k of kicks) {
      if (!checkCollision(piece, k, 0, rotated)) {
        piece.shape = rotated;
        piece.x += k;
        retroAudio.blip(400);
        return;
      }
    }
  };

  const holdPiece = () => {
    if (gameState !== 'PLAYING' || !canHoldRef.current || !currentPieceRef.current) return;
    retroAudio.blip(500);
    const curType = currentPieceRef.current.type;

    if (holdPieceTypeRef.current) {
      const swapType = holdPieceTypeRef.current;
      holdPieceTypeRef.current = curType;
      currentPieceRef.current = createPiece(swapType);
    } else {
      holdPieceTypeRef.current = curType;
      spawnNextPiece();
    }
    canHoldRef.current = false;
  };

  const moveHorizontal = (dx: number) => {
    if (gameState !== 'PLAYING' || !currentPieceRef.current) return;
    if (!checkCollision(currentPieceRef.current, dx, 0)) {
      currentPieceRef.current.x += dx;
      retroAudio.blip(300);
    }
  };

  const softDrop = () => {
    if (gameState !== 'PLAYING' || !currentPieceRef.current) return;
    if (!checkCollision(currentPieceRef.current, 0, 1)) {
      currentPieceRef.current.y++;
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else {
      lockPiece();
    }
  };

  const startGame = () => {
    retroAudio.coin();
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    setScore(0);
    setLines(0);
    setLevel(1);
    holdPieceTypeRef.current = null;
    canHoldRef.current = true;
    nextPieceTypeRef.current = getRandomPieceType();
    currentPieceRef.current = createPiece(getRandomPieceType());
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'c', 'C'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'p' || e.key === 'P') {
        togglePause();
        return;
      }

      if (gameState !== 'PLAYING') {
        if (e.key === ' ' || e.key === 'Enter') {
          startGame();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveHorizontal(1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'x':
        case 'X':
          rotate();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          softDrop();
          break;
        case ' ':
          hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          holdPiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Main tick & render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      if (gameState === 'PLAYING') {
        if (!lastDropTimeRef.current) lastDropTimeRef.current = timestamp;
        const delta = timestamp - lastDropTimeRef.current;

        if (delta >= getDropInterval()) {
          lastDropTimeRef.current = timestamp;
          if (currentPieceRef.current) {
            if (!checkCollision(currentPieceRef.current, 0, 1)) {
              currentPieceRef.current.y++;
            } else {
              lockPiece();
            }
          }
        }
      }

      render(ctx);
      renderMiniPieces();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    const render = (context: CanvasRenderingContext2D) => {
      const width = canvas.width;
      const height = canvas.height;
      const cellW = width / COLS;
      const cellH = height / ROWS;

      // Dark background
      context.fillStyle = '#080c16';
      context.fillRect(0, 0, width, height);

      // Grid guidelines
      context.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      context.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        context.beginPath();
        context.moveTo(0, r * cellH);
        context.lineTo(width, r * cellH);
        context.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        context.beginPath();
        context.moveTo(c * cellW, 0);
        context.lineTo(c * cellW, height);
        context.stroke();
      }

      // Border
      context.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      context.lineWidth = 3;
      context.strokeRect(1, 1, width - 2, height - 2);

      // Draw locked cells
      const grid = gridRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            drawBlock(context, c * cellW, r * cellH, cellW, cellH, grid[r][c]);
          }
        }
      }

      // Draw Ghost Piece
      if (currentPieceRef.current && gameState === 'PLAYING') {
        const piece = currentPieceRef.current;
        const ghostY = calculateGhostY();

        context.save();
        context.strokeStyle = piece.color;
        context.lineWidth = 1.5;
        context.globalAlpha = 0.35;
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
              const gx = (piece.x + c) * cellW;
              const gy = (ghostY + r) * cellH;
              context.strokeRect(gx + 1, gy + 1, cellW - 2, cellH - 2);
            }
          }
        }
        context.restore();
      }

      // Draw Active Piece
      if (currentPieceRef.current) {
        const piece = currentPieceRef.current;
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c]) {
              const px = (piece.x + c) * cellW;
              const py = (piece.y + r) * cellH;
              if (py >= 0) {
                drawBlock(context, px, py, cellW, cellH, piece.color);
              }
            }
          }
        }
      }

      // Overlays
      if (gameState === 'IDLE') {
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#A855F7';
        context.font = 'bold 22px monospace';
        context.fillText('TETRA BLOCKS', width / 2, height / 2 - 30);

        context.fillStyle = '#E2E8F0';
        context.font = '14px monospace';
        context.fillText('Pressione Iniciar ou ESPAÇO', width / 2, height / 2 + 10);

        context.fillStyle = '#94A3B8';
        context.font = '12px monospace';
        context.fillText('Setas para girar e mover', width / 2, height / 2 + 35);
      } else if (gameState === 'PAUSED') {
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#F59E0B';
        context.font = 'bold 24px monospace';
        context.fillText('JOGO PAUSADO', width / 2, height / 2 - 10);
        context.fillStyle = '#E2E8F0';
        context.font = '13px monospace';
        context.fillText('Pressione P para continuar', width / 2, height / 2 + 20);
      } else if (gameState === 'GAMEOVER') {
        context.fillStyle = 'rgba(15, 23, 42, 0.85)';
        context.fillRect(0, 0, width, height);

        context.textAlign = 'center';
        context.fillStyle = '#EF4444';
        context.font = 'bold 24px monospace';
        context.fillText('FIM DE JOGO!', width / 2, height / 2 - 30);

        context.fillStyle = '#F8FAFC';
        context.font = '16px monospace';
        context.fillText(`Pontos: ${scoreRef.current}`, width / 2, height / 2 + 5);
        context.fillText(`Linhas: ${linesRef.current}`, width / 2, height / 2 + 30);

        if (scoreRef.current >= highScore && scoreRef.current > 0) {
          context.fillStyle = '#FBBF24';
          context.font = 'bold 13px monospace';
          context.fillText('★ NOVO RECORDE PESSOAL! ★', width / 2, height / 2 + 55);
        }

        context.fillStyle = '#94A3B8';
        context.font = '13px monospace';
        context.fillText('Pressione Iniciar para jogar de novo', width / 2, height / 2 + 85);
      }
    };

    const drawBlock = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string
    ) => {
      context.save();
      context.fillStyle = color;
      context.fillRect(x + 1, y + 1, w - 2, h - 2);

      // Light bevel on top and left
      context.fillStyle = 'rgba(255, 255, 255, 0.35)';
      context.fillRect(x + 1, y + 1, w - 2, 2.5);
      context.fillRect(x + 1, y + 1, 2.5, h - 2);

      // Dark bevel on bottom and right
      context.fillStyle = 'rgba(0, 0, 0, 0.35)';
      context.fillRect(x + 1, y + h - 3.5, w - 2, 2.5);
      context.fillRect(x + w - 3.5, y + 1, 2.5, h - 2);
      context.restore();
    };

    const renderMiniPieces = () => {
      // Render next piece
      const nextCanvas = nextCanvasRef.current;
      if (nextCanvas) {
        const nCtx = nextCanvas.getContext('2d');
        if (nCtx) {
          nCtx.fillStyle = '#080c16';
          nCtx.fillRect(0, 0, 80, 80);
          const nextData = TETROMINOES[nextPieceTypeRef.current];
          if (nextData) {
            const size = 16;
            const shape = nextData.shape;
            const startX = (80 - shape[0].length * size) / 2;
            const startY = (80 - shape.length * size) / 2;
            shape.forEach((row, r) => {
              row.forEach((val, c) => {
                if (val) {
                  drawBlock(nCtx, startX + c * size, startY + r * size, size, size, nextData.color);
                }
              });
            });
          }
        }
      }

      // Render hold piece
      const holdCanvas = holdCanvasRef.current;
      if (holdCanvas) {
        const hCtx = holdCanvas.getContext('2d');
        if (hCtx) {
          hCtx.fillStyle = '#080c16';
          hCtx.fillRect(0, 0, 80, 80);
          if (holdPieceTypeRef.current) {
            const holdData = TETROMINOES[holdPieceTypeRef.current];
            const size = 16;
            const shape = holdData.shape;
            const startX = (80 - shape[0].length * size) / 2;
            const startY = (80 - shape.length * size) / 2;
            shape.forEach((row, r) => {
              row.forEach((val, c) => {
                if (val) {
                  drawBlock(hCtx, startX + c * size, startY + r * size, size, size, holdData.color);
                }
              });
            });
          }
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, highScore, onGameOver, onScoreUpdate]);

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>PONTOS: <strong className="text-purple-400 tabular-nums text-sm">{score}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>LINHAS: <strong className="text-sky-400 tabular-nums text-sm">{lines}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>NÍVEL: <strong className="text-amber-400 tabular-nums text-sm">{level}</strong></span>
        </div>
        <div>
          <span>RECORDE: <strong className="text-amber-400 tabular-nums text-sm">{Math.max(score, highScore)}</strong></span>
        </div>
      </div>

      {/* Main Play Area with Side Panels */}
      <div className="flex items-start gap-4">
        {/* Hold Piece Sidebar */}
        <div className="hidden sm:flex flex-col items-center bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg">
          <span className="text-[11px] font-mono uppercase text-slate-400 mb-1">Guardar (C)</span>
          <canvas ref={holdCanvasRef} width={80} height={80} className="border border-slate-800 rounded bg-black" />
          <button
            onClick={holdPiece}
            className="mt-2 w-full py-1 text-[11px] font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded border border-slate-700"
          >
            Trocar
          </button>
        </div>

        {/* Main Canvas Container */}
        <div className="relative border-4 border-slate-700 rounded-lg overflow-hidden bg-black shadow-2xl w-[260px] h-[520px]">
          <canvas
            ref={canvasRef}
            width={260}
            height={520}
            className="w-full h-full block"
          />

          {lastTetra && (
            <div className="absolute inset-x-0 top-1/3 text-center py-2 bg-purple-600 text-white font-mono font-black text-xl animate-bounce shadow-lg">
              ★ TETRA! +800 ★
            </div>
          )}
        </div>

        {/* Next Piece Sidebar */}
        <div className="flex flex-col items-center bg-slate-900/90 border border-slate-700 p-2.5 rounded-lg">
          <span className="text-[11px] font-mono uppercase text-slate-400 mb-1">Próxima</span>
          <canvas ref={nextCanvasRef} width={80} height={80} className="border border-slate-800 rounded bg-black" />
          
          <div className="mt-4 flex flex-col gap-1 w-full text-[11px] font-mono text-slate-400">
            <span>Espaço: Queda Rápida</span>
            <span>↑: Girar bloco</span>
            <span>↓: Queda suave</span>
            <span>←/→: Mover</span>
          </div>
        </div>
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
              className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:scale-95 transition-transform rounded shadow"
            >
              {gameState === 'GAMEOVER' ? 'Jogar de Novo' : 'Iniciar Jogo'}
            </button>
          )}

          <button
            onClick={hardDrop}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700"
          >
            Despencar (Espaço)
          </button>
        </div>

        <button
          onClick={holdPiece}
          className="sm:hidden px-3 py-1.5 text-xs font-medium text-purple-300 bg-purple-950 border border-purple-800 rounded"
        >
          Guardar Peça (C)
        </button>
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex flex-col items-center sm:hidden">
        <div className="grid grid-cols-3 gap-2 w-48 mb-2">
          <div />
          <button
            onClick={rotate}
            className="w-12 h-12 bg-slate-800 active:bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
          >
            ↻
          </button>
          <div />
          <button
            onClick={() => moveHorizontal(-1)}
            className="w-12 h-12 bg-slate-800 active:bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
          >
            ◀
          </button>
          <button
            onClick={softDrop}
            className="w-12 h-12 bg-slate-800 active:bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
          >
            ▼
          </button>
          <button
            onClick={() => moveHorizontal(1)}
            className="w-12 h-12 bg-slate-800 active:bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-lg border border-slate-700"
          >
            ▶
          </button>
        </div>

        <button
          onClick={hardDrop}
          className="w-48 py-2 bg-purple-700 active:bg-purple-600 text-white text-xs font-bold rounded-lg border border-purple-500 shadow"
        >
          DESPENCAR (HARD DROP)
        </button>
      </div>
    </div>
  );
}
