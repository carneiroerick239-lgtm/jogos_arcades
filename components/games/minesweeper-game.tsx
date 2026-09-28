'use client';

import React, { useState, useEffect, useRef } from 'react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface Cell {
  r: number;
  c: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

type Difficulty = 'FACIL' | 'MEDIO' | 'DIFICIL';

const CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number; label: string }> = {
  FACIL: { rows: 9, cols: 9, mines: 10, label: 'Fácil (9x9)' },
  MEDIO: { rows: 16, cols: 16, mines: 40, label: 'Médio (16x16)' },
  DIFICIL: { rows: 16, cols: 30, mines: 99, label: 'Difícil (16x30)' }
};

const NUMBER_COLORS: Record<number, string> = {
  1: '#2563EB', // Blue
  2: '#16A34A', // Green
  3: '#DC2626', // Red
  4: '#1E1B4B', // Dark Blue
  5: '#78350F', // Brown / Maroon
  6: '#0D9488', // Teal
  7: '#000000', // Black
  8: '#4B5563'  // Gray
};

function createEmptyBoard(diff: Difficulty): Cell[][] {
  const { rows, cols } = CONFIG[diff];
  const newBoard: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
      });
    }
    newBoard.push(row);
  }
  return newBoard;
}

function placeMinesAndCalculate(baseBoard: Cell[][], diff: Difficulty, startR: number, startC: number): Cell[][] {
  const { rows, cols, mines } = CONFIG[diff];
  let placed = 0;
  const newBoard = baseBoard.map(row => row.map(cell => ({ ...cell })));

  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    const isStartArea = Math.abs(r - startR) <= 1 && Math.abs(c - startC) <= 1;
    if (!newBoard[r][c].isMine && !isStartArea) {
      newBoard[r][c].isMine = true;
      placed++;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
              count++;
            }
          }
        }
        newBoard[r][c].neighborMines = count;
      }
    }
  }

  return newBoard;
}

interface MinesweeperGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (score: number) => void;
  highScore: number;
}

export default function MinesweeperGame({ onScoreUpdate, onGameOver, highScore }: MinesweeperGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('FACIL');
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard('FACIL'));
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [minesLeft, setMinesLeft] = useState(10);
  const [timer, setTimer] = useState(0);
  const [mobileMode, setMobileMode] = useState<'REVEAL' | 'FLAG'>('REVEAL');
  const [isPressing, setIsPressing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const firstClickRef = useRef(true);

  const resetGame = (diff: Difficulty = difficulty) => {
    setBoard(createEmptyBoard(diff));
    setGameStatus('IDLE');
    setMinesLeft(CONFIG[diff].mines);
    setTimer(0);
    firstClickRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSelectDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    resetGame(diff);
  };

  // Start timer on playing
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimer(t => Math.min(999, t + 1));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  // Reveal cell and flood fill empty spaces
  const revealCell = (r: number, c: number) => {
    if (gameStatus === 'LOST' || gameStatus === 'WON') return;

    let currentBoard = board;
    if (firstClickRef.current) {
      firstClickRef.current = false;
      currentBoard = placeMinesAndCalculate(board, difficulty, r, c);
      setGameStatus('PLAYING');
      retroAudio.coin();
    }

    const cell = currentBoard[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    const newBoard = currentBoard.map(row => row.map(item => ({ ...item })));

    // Hit a mine!
    if (newBoard[r][c].isMine) {
      retroAudio.explosion();
      newBoard.forEach(row => {
        row.forEach(item => {
          if (item.isMine) item.isRevealed = true;
        });
      });
      setBoard(newBoard);
      setGameStatus('LOST');
      return;
    }

    // Flood fill
    const queue: [number, number][] = [[r, c]];
    newBoard[r][c].isRevealed = true;

    while (queue.length > 0) {
      const [currR, currC] = queue.shift()!;
      const currentCell = newBoard[currR][currC];

      if (currentCell.neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr;
            const nc = currC + dc;
            if (
              nr >= 0 &&
              nr < CONFIG[difficulty].rows &&
              nc >= 0 &&
              nc < CONFIG[difficulty].cols &&
              !newBoard[nr][nc].isRevealed &&
              !newBoard[nr][nc].isFlagged &&
              !newBoard[nr][nc].isMine
            ) {
              newBoard[nr][nc].isRevealed = true;
              if (newBoard[nr][nc].neighborMines === 0) {
                queue.push([nr, nc]);
              }
            }
          }
        }
      }
    }

    retroAudio.blip(340);
    setBoard(newBoard);

    // Check Victory
    const { rows, cols } = CONFIG[difficulty];
    let unrevealedSafe = 0;
    for (let ro = 0; ro < rows; ro++) {
      for (let co = 0; co < cols; co++) {
        if (!newBoard[ro][co].isMine && !newBoard[ro][co].isRevealed) {
          unrevealedSafe++;
        }
      }
    }

    if (unrevealedSafe === 0) {
      retroAudio.victory();
      setGameStatus('WON');
      const calculatedScore = Math.max(10, 1000 - timer * 2);
      saveHighScore('minesweeper', calculatedScore);
      if (onScoreUpdate) onScoreUpdate(calculatedScore);
      if (onGameOver) onGameOver(calculatedScore);
    }
  };

  // Toggle Flag
  const toggleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameStatus === 'LOST' || gameStatus === 'WON') return;

    const cell = board[r][c];
    if (cell.isRevealed) return;

    retroAudio.flag();
    const newBoard = board.map(row => row.map(item => ({ ...item })));
    const target = newBoard[r][c];
    target.isFlagged = !target.isFlagged;

    setMinesLeft(prev => prev + (target.isFlagged ? -1 : 1));
    setBoard(newBoard);
  };

  const handleCellClick = (r: number, c: number) => {
    if (mobileMode === 'FLAG' && !board[r][c].isRevealed) {
      const pseudoEvent = { preventDefault: () => {} } as React.MouseEvent;
      toggleFlag(pseudoEvent, r, c);
    } else {
      revealCell(r, c);
    }
  };

  const getSmileyFace = () => {
    if (gameStatus === 'LOST') return '😵';
    if (gameStatus === 'WON') return '😎';
    if (isPressing) return '😮';
    return '🙂';
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto select-none">
      {/* HUD Info */}
      <div className="w-full flex items-center justify-between pb-3 text-xs tracking-wider text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span>MINAS: <strong className="text-red-400 tabular-nums text-sm">{minesLeft}</strong></span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>TEMPO: <strong className="text-amber-400 tabular-nums text-sm">{timer}s</strong></span>
        </div>
        <div>
          <span>RECORDE: <strong className="text-amber-400 tabular-nums text-sm">{highScore} Pts</strong></span>
        </div>
      </div>

      {/* Retro Classic Windows / Arcade Container */}
      <div className="bg-slate-300 border-4 border-slate-500 rounded p-4 shadow-2xl flex flex-col items-center max-w-full overflow-x-auto">
        {/* Top Header Bar */}
        <div className="w-full bg-slate-400/50 border-2 border-slate-500 border-b-white border-r-white p-2.5 flex items-center justify-between mb-3 shadow-inner">
          <div className="bg-black border border-slate-600 px-2 py-0.5 text-red-500 font-mono text-xl font-black tracking-widest tabular-nums rounded">
            {String(Math.max(-99, Math.min(999, minesLeft))).padStart(3, '0')}
          </div>

          <button
            onClick={() => resetGame(difficulty)}
            className="w-10 h-10 bg-slate-300 border-2 border-white border-b-slate-600 border-r-slate-600 active:border-slate-600 active:border-b-white active:border-r-white rounded flex items-center justify-center text-2xl shadow hover:bg-slate-200 transition-colors"
            title="Reiniciar Campo"
          >
            {getSmileyFace()}
          </button>

          <div className="bg-black border border-slate-600 px-2 py-0.5 text-red-500 font-mono text-xl font-black tracking-widest tabular-nums rounded">
            {String(timer).padStart(3, '0')}
          </div>
        </div>

        {/* The Grid */}
        <div
          className="border-3 border-slate-600 border-b-white border-r-white bg-slate-300 p-1 inline-block"
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onMouseLeave={() => setIsPressing(false)}
        >
          <div
            className="grid gap-[1px] bg-slate-400"
            style={{
              gridTemplateColumns: `repeat(${CONFIG[difficulty].cols}, minmax(0, 1fr))`
            }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const isRevealed = cell.isRevealed;
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onContextMenu={e => toggleFlag(e, r, c)}
                    disabled={isRevealed && cell.neighborMines === 0}
                    className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center font-bold text-xs sm:text-sm transition-none select-none ${
                      isRevealed
                        ? cell.isMine
                          ? 'bg-red-500 text-white border border-slate-500'
                          : 'bg-slate-200 border border-slate-300'
                        : 'bg-slate-300 border-2 border-white border-b-slate-600 border-r-slate-600 active:border-slate-500 active:bg-slate-200'
                    }`}
                  >
                    {isRevealed ? (
                      cell.isMine ? (
                        '💣'
                      ) : cell.neighborMines > 0 ? (
                        <span style={{ color: NUMBER_COLORS[cell.neighborMines] }}>
                          {cell.neighborMines}
                        </span>
                      ) : (
                        ''
                      )
                    ) : cell.isFlagged ? (
                      '🚩'
                    ) : (
                      ''
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
          <span className="text-slate-400 text-xs px-1">Dificuldade:</span>
          {(['FACIL', 'MEDIO', 'DIFICIL'] as const).map(diff => (
            <button
              key={diff}
              onClick={() => handleSelectDifficulty(diff)}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                difficulty === diff
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {CONFIG[diff].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMode(prev => prev === 'REVEAL' ? 'FLAG' : 'REVEAL')}
            className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors flex items-center gap-1.5 ${
              mobileMode === 'FLAG'
                ? 'bg-red-950 border-red-600 text-red-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <span>{mobileMode === 'FLAG' ? '🚩 Modo: Bandeira' : '🔍 Modo: Revelar'}</span>
          </button>
        </div>
      </div>

      <div className="w-full text-center text-xs text-slate-400 font-mono mt-2">
        Dica: Clique com botão direito no PC para marcar minas com bandeiras 🚩
      </div>
    </div>
  );
}
