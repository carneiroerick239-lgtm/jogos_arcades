'use client';

import React, { useState, useEffect, useRef } from 'react';
import { retroAudio } from '@/lib/sound';
import { Play, RotateCcw, User, Bot, Users } from 'lucide-react';

interface Connect4GameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

type Player = 1 | 2; // 1: Red (Human), 2: Yellow (AI or Human 2)
type Cell = 0 | 1 | 2;

const COLS = 7;
const ROWS = 6;

export default function Connect4Game({ onScoreUpdate, onGameOver, highScore }: Connect4GameProps) {
  const [board, setBoard] = useState<Cell[][]>(() =>
    Array(ROWS).fill(0).map(() => Array(COLS).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [gameMode, setGameMode] = useState<'1P' | '2P'>('1P');
  const [aiDifficulty, setAiDifficulty] = useState<'FACIL' | 'MEDIO' | 'MESTRE'>('MEDIO');
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);
  const [hoverCol, setHoverCol] = useState<number>(3);
  const [stats, setStats] = useState({ redWins: 0, yellowWins: 0, draws: 0 });

  const isAiThinking = gameMode === '1P' && currentPlayer === 2 && winner === null;

  const checkWin = (grid: Cell[][]): { winner: Player; cells: [number, number][] } | null => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const p = grid[r][c];
        if (p !== 0 && p === grid[r][c + 1] && p === grid[r][c + 2] && p === grid[r][c + 3]) {
          return { winner: p as Player, cells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
        }
      }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = grid[r][c];
        if (p !== 0 && p === grid[r + 1][c] && p === grid[r + 2][c] && p === grid[r + 3][c]) {
          return { winner: p as Player, cells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
        }
      }
    }
    // Diagonal \
    for (let r = 0; r < ROWS - 3; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const p = grid[r][c];
        if (p !== 0 && p === grid[r + 1][c + 1] && p === grid[r + 2][c + 2] && p === grid[r + 3][c + 3]) {
          return { winner: p as Player, cells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
        }
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const p = grid[r][c];
        if (p !== 0 && p === grid[r - 1][c + 1] && p === grid[r - 2][c + 2] && p === grid[r - 3][c + 3]) {
          return { winner: p as Player, cells: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] };
        }
      }
    }
    return null;
  };

  const getLowestEmptyRow = (grid: Cell[][], col: number): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === 0) return r;
    }
    return -1;
  };

  const dropToken = (col: number) => {
    if (winner !== null || isAiThinking) return;

    const row = getLowestEmptyRow(board, col);
    if (row === -1) return; // Column is full

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPlayer;
    setBoard(newBoard);
    retroAudio.tokenDrop();

    // Check Win
    const winResult = checkWin(newBoard);
    if (winResult) {
      setWinner(winResult.winner);
      setWinningCells(winResult.cells);
      if (winResult.winner === 1) {
        retroAudio.victory();
        setStats(s => ({ ...s, redWins: s.redWins + 1 }));
        onScoreUpdate(100);
      } else {
        retroAudio.gameOver();
        setStats(s => ({ ...s, yellowWins: s.yellowWins + 1 }));
      }
      onGameOver(winResult.winner === 1 ? 100 : 0);
      return;
    }

    // Check Draw
    const isFull = newBoard.every(r => r.every(cell => cell !== 0));
    if (isFull) {
      setWinner('DRAW');
      setStats(s => ({ ...s, draws: s.draws + 1 }));
      return;
    }

    // Next Turn
    const nextP: Player = currentPlayer === 1 ? 2 : 1;
    setCurrentPlayer(nextP);
  };

  // Computer AI Turn
  useEffect(() => {
    if (gameMode === '1P' && currentPlayer === 2 && winner === null) {
      const timer = setTimeout(() => {
        const validCols: number[] = [];
        for (let c = 0; c < COLS; c++) {
          if (board[0][c] === 0) validCols.push(c);
        }

        if (validCols.length === 0) {
          return;
        }

        let chosenCol = validCols[Math.floor(Math.random() * validCols.length)];

        // Smart Move Finder
        if (aiDifficulty === 'MEDIO' || aiDifficulty === 'MESTRE') {
          // 1. Can AI win immediately in 1 move?
          for (const col of validCols) {
            const r = getLowestEmptyRow(board, col);
            const testBoard = board.map(row => [...row]);
            testBoard[r][col] = 2;
            if (checkWin(testBoard)) {
              chosenCol = col;
              break;
            }
          }

          // 2. Can Player 1 win next turn? Block it!
          if (chosenCol === undefined || !checkWin(board)) {
            for (const col of validCols) {
              const r = getLowestEmptyRow(board, col);
              const testBoard = board.map(row => [...row]);
              testBoard[r][col] = 1;
              if (checkWin(testBoard)) {
                chosenCol = col;
                break;
              }
            }
          }

          // 3. Mestre: Favor center column
          if (aiDifficulty === 'MESTRE' && validCols.includes(3) && Math.random() < 0.6) {
            chosenCol = 3;
          }
        }

        dropToken(chosenCol);
      }, 550);

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, board, aiDifficulty]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') {
        setHoverCol(c => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight') {
        setHoverCol(c => Math.min(COLS - 1, c + 1));
      } else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') {
        dropToken(hoverCol);
      } else if (e.key >= '1' && e.key <= '7') {
        const colIdx = parseInt(e.key, 10) - 1;
        setHoverCol(colIdx);
        dropToken(colIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoverCol, winner, currentPlayer, isAiThinking, board]);

  const resetMatch = () => {
    setBoard(Array(ROWS).fill(0).map(() => Array(COLS).fill(0)));
    setCurrentPlayer(1);
    setWinner(null);
    setWinningCells([]);
    retroAudio.coin();
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg">
      {/* Top Match Control Header */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-t-xl text-xs font-mono">
        {/* Mode Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setGameMode('1P');
              resetMatch();
            }}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
              gameMode === '1P'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>1 Jogador</span>
          </button>

          <button
            onClick={() => {
              setGameMode('2P');
              resetMatch();
            }}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
              gameMode === '2P'
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2 Jogadores</span>
          </button>
        </div>

        {/* Turn indicator */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">VEZ: </span>
          <div className="flex items-center gap-1.5 font-bold">
            <span
              className={`w-3.5 h-3.5 rounded-full inline-block ${
                currentPlayer === 1 ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 'bg-amber-400 shadow-md shadow-amber-400/50'
              }`}
            />
            <span className={currentPlayer === 1 ? 'text-rose-400' : 'text-amber-300'}>
              {currentPlayer === 1
                ? 'Vermelho'
                : gameMode === '1P'
                ? isAiThinking
                  ? 'Computador...'
                  : 'Computador'
                : 'Amarelo'}
            </span>
          </div>
        </div>

        {/* Reset button */}
        <button
          onClick={resetMatch}
          className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-800 rounded flex items-center gap-1"
          title="Nova Partida"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      {/* Main Board Container */}
      <div className="w-full bg-slate-950 border-x-4 border-b-4 border-slate-800 p-4 sm:p-6 flex flex-col items-center">
        {/* Hover preview slot row */}
        <div className="grid grid-cols-7 gap-2 w-full max-w-sm mb-2 h-8 px-2">
          {Array.from({ length: COLS }).map((_, c) => {
            const isHover = hoverCol === c && winner === null && !isAiThinking;
            return (
              <div
                key={c}
                onClick={() => dropToken(c)}
                onMouseEnter={() => setHoverCol(c)}
                className="flex items-center justify-center cursor-pointer"
              >
                {isHover && (
                  <div
                    className={`w-6 h-6 rounded-full transition-transform animate-bounce ${
                      currentPlayer === 1 ? 'bg-rose-500/80' : 'bg-amber-400/80'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Classic Blue Standing Grid Frame */}
        <div className="relative bg-blue-700 p-3 sm:p-4 rounded-2xl shadow-2xl border-4 border-blue-800 max-w-sm w-full">
          <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isWinning = winningCells.some(([wr, wc]) => wr === rIdx && wc === cIdx);
                return (
                  <button
                    key={`${rIdx}-${cIdx}`}
                    onClick={() => dropToken(cIdx)}
                    onMouseEnter={() => setHoverCol(cIdx)}
                    disabled={winner !== null || isAiThinking}
                    className="aspect-square rounded-full bg-slate-950/90 shadow-inner flex items-center justify-center transition-all relative overflow-hidden focus:outline-hidden"
                  >
                    {cell !== 0 && (
                      <div
                        className={`w-full h-full rounded-full transition-all duration-200 transform scale-90 border-2 ${
                          cell === 1
                            ? 'bg-rose-500 border-rose-400 shadow-md shadow-rose-900/60'
                            : 'bg-amber-400 border-amber-300 shadow-md shadow-amber-900/60'
                        } ${isWinning ? 'animate-pulse ring-4 ring-white' : ''}`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Column Quick Click Buttons */}
        <div className="grid grid-cols-7 gap-2 w-full max-w-sm mt-3 px-2">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              onClick={() => dropToken(c)}
              className="py-1 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 text-slate-400 hover:text-white rounded text-[11px] font-mono border border-slate-800 transition-colors"
            >
              {c + 1}
            </button>
          ))}
        </div>

        {/* End Game Banner */}
        {winner !== null && (
          <div className="mt-4 p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between w-full max-w-sm">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  winner === 1 ? 'bg-rose-500' : winner === 2 ? 'bg-amber-400' : 'bg-slate-400'
                }`}
              />
              <span className="font-bold text-xs text-white font-mono">
                {winner === 'DRAW'
                  ? 'EMPATE TÉCNICO!'
                  : winner === 1
                  ? 'VERMELHO VENCEU!'
                  : gameMode === '1P'
                  ? 'COMPUTADOR VENCEU!'
                  : 'AMARELO VENCEU!'}
              </span>
            </div>

            <button
              onClick={resetMatch}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded transition-transform active:scale-95 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Jogar De Novo</span>
            </button>
          </div>
        )}

        {/* Match Statistics */}
        <div className="mt-4 pt-3 border-t border-slate-900 w-full max-w-sm flex items-center justify-around text-xs font-mono text-slate-400">
          <div>
            <span>Vermelho: </span>
            <span className="text-rose-400 font-bold tabular-nums">{stats.redWins}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span>Empates: </span>
            <span className="text-slate-300 font-bold tabular-nums">{stats.draws}</span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span>{gameMode === '1P' ? 'IA: ' : 'Amarelo: '}</span>
            <span className="text-amber-400 font-bold tabular-nums">{stats.yellowWins}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
