'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Sparkles, Clock, Flame, CheckCircle2 } from 'lucide-react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface MemoryGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface CardItem {
  id: number;
  symbol: string;
  name: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS_POOL = [
  { symbol: '🍄', name: 'Cogumelo', color: '#EF4444' },
  { symbol: '🪙', name: 'Moeda 8-Bit', color: '#FACC15' },
  { symbol: '⭐', name: 'Super Estrela', color: '#F59E0B' },
  { symbol: '👻', name: 'Fantasma', color: '#38BDF8' },
  { symbol: '👾', name: 'Marciano', color: '#A855F7' },
  { symbol: '🕹️', name: 'Joystick', color: '#EC4899' },
  { symbol: '📼', name: 'Fita Cassete', color: '#10B981' },
  { symbol: '💾', name: 'Disquete', color: '#3B82F6' },
  { symbol: '💣', name: 'Bomba Retrô', color: '#64748B' },
  { symbol: '❤️', name: 'Coração', color: '#F43F5E' },
  { symbol: '⚡', name: 'Raio Turbo', color: '#FDE047' },
  { symbol: '💎', name: 'Diamante', color: '#06B6D4' }
];

export default function MemoryGame({
  onScoreUpdate,
  onGameOver,
  highScore
}: MemoryGameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'VICTORY'>('IDLE');

  // Initialize and shuffle deck
  const initializeGame = useCallback((diff: Difficulty) => {
    let pairCount = 8;
    if (diff === 'EASY') pairCount = 6;
    if (diff === 'HARD') pairCount = 12;

    const selectedIcons = ICONS_POOL.slice(0, pairCount);
    const deck: CardItem[] = [];

    selectedIcons.forEach((icon, idx) => {
      // Add pair
      deck.push({
        id: idx * 2,
        symbol: icon.symbol,
        name: icon.name,
        color: icon.color,
        isFlipped: false,
        isMatched: false
      });
      deck.push({
        id: idx * 2 + 1,
        symbol: icon.symbol,
        name: icon.name,
        color: icon.color,
        isFlipped: false,
        isMatched: false
      });
    });

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedIndices([]);
    setIsLocked(false);
    setMoves(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setElapsedTime(0);
    setGameState('PLAYING');
    retroAudio.coin();
  }, []);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      setElapsedTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Handle Card Click
  const handleCardClick = (index: number) => {
    if (isLocked || gameState !== 'PLAYING') return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    retroAudio.cardFlip();

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setIsLocked(true);
      setMoves(m => m + 1);

      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // MATCH!
        setTimeout(() => {
          retroAudio.cardMatch();
          setCards(prev => {
            const updated = prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isMatched: true, isFlipped: true } : c
            );

            // Check if all cards are matched
            const allMatched = updated.every(c => c.isMatched);
            if (allMatched) {
              setTimeout(() => {
                retroAudio.victory();
                setGameState('VICTORY');

                // Final score bonus for speed and efficiency
                const timeBonus = Math.max(0, 500 - elapsedTime * 5);
                const movesBonus = Math.max(0, 500 - moves * 15);
                setScore(s => {
                  const finalPts = s + timeBonus + movesBonus;
                  onScoreUpdate(finalPts);
                  saveHighScore('memory', finalPts);
                  onGameOver(finalPts);
                  return finalPts;
                });
              }, 400);
            }

            return updated;
          });

          setFlippedIndices([]);
          setIsLocked(false);

          setStreak(st => {
            const nextStreak = st + 1;
            setMaxStreak(ms => Math.max(ms, nextStreak));
            const multiplier = Math.min(4, nextStreak);
            const pts = 100 * multiplier;

            setScore(s => {
              const updated = s + pts;
              onScoreUpdate(updated);
              saveHighScore('memory', updated);
              return updated;
            });

            return nextStreak;
          });
        }, 350);
      } else {
        // MISMATCH
        setStreak(0);
        setTimeout(() => {
          retroAudio.buzzer();
          setCards(prev =>
            prev.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedIndices([]);
          setIsLocked(false);
        }, 900);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD */}
      <div className="w-full max-w-lg mb-3 flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">PONTUAÇÃO</span>
            <span className="text-amber-400 font-bold text-base">{score}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">JOGADAS</span>
            <span className="text-white font-bold text-base">{moves}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">TEMPO</span>
            <span className="text-emerald-400 font-bold text-base flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {elapsedTime}s
            </span>
          </div>

          {streak > 1 && (
            <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded text-amber-300 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">COMBO x{Math.min(4, streak)}</span>
            </div>
          )}
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
            <button
              key={d}
              onClick={() => {
                setDifficulty(d);
                initializeGame(d);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                difficulty === d ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {d === 'EASY' ? 'Fácil (12)' : d === 'MEDIUM' ? 'Médio (16)' : 'Desafio (24)'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Board Container */}
      <div className="relative w-full max-w-lg bg-slate-950 border-4 border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl min-h-[420px] flex flex-col justify-center items-center">
        {/* Idle Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl">
            <span className="text-5xl mb-2">🕹️</span>
            <h3 className="text-2xl font-black text-purple-400 tracking-tight">JOGO DA MEMÓRIA RETRÔ</h3>
            <p className="text-slate-300 text-xs max-w-xs mt-2 mb-6">
              Encontre todos os pares de ícones retrô pixelados, mantenha sequências de combo e complete no menor tempo!
            </p>
            <button
              onClick={() => initializeGame(difficulty)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>INICIAR EMBARALHAMENTO</span>
            </button>
          </div>
        )}

        {/* Victory Modal */}
        {gameState === 'VICTORY' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl animate-fade-in">
            <Trophy className="w-14 h-14 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-white">MEMÓRIA PERFEITA!</h3>
            <p className="text-slate-400 text-xs mt-1">Todos os cartuchos foram emparelhados!</p>

            <div className="my-4 grid grid-cols-3 gap-3 w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-center">
              <div>
                <div className="text-[10px] text-slate-400">JOGADAS</div>
                <div className="text-sm font-bold text-white">{moves}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">TEMPO</div>
                <div className="text-sm font-bold text-emerald-400">{elapsedTime}s</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">MAIOR COMBO</div>
                <div className="text-sm font-bold text-amber-400">x{maxStreak}</div>
              </div>
            </div>

            <div className="text-xl font-bold text-amber-300 font-mono mb-4">
              Pontuação Final: {score}
            </div>

            <button
              onClick={() => initializeGame(difficulty)}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl flex items-center gap-2 shadow-md transition-transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>JOGAR NOVAMENTE</span>
            </button>
          </div>
        )}

        {/* Card Grid */}
        <div
          className={`grid gap-2.5 sm:gap-3 w-full ${
            difficulty === 'EASY'
              ? 'grid-cols-4 max-w-md'
              : difficulty === 'MEDIUM'
              ? 'grid-cols-4 max-w-md'
              : 'grid-cols-6 max-w-lg'
          }`}
        >
          {cards.map((card, index) => {
            const isRevealed = card.isFlipped || card.isMatched;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(index)}
                disabled={isRevealed || isLocked}
                className={`aspect-square rounded-xl border-2 transition-all duration-300 transform flex flex-col items-center justify-center p-1 sm:p-2 cursor-pointer select-none ${
                  card.isMatched
                    ? 'bg-purple-950/70 border-emerald-500 text-emerald-300 shadow-md scale-95'
                    : isRevealed
                    ? 'bg-slate-800 border-amber-400 shadow-lg scale-100 rotate-y-180'
                    : 'bg-slate-900 border-slate-700 hover:border-purple-500 hover:bg-slate-800/80 active:scale-95'
                }`}
              >
                {isRevealed ? (
                  <div className="flex flex-col items-center justify-center animate-fade-in">
                    <span className="text-2xl sm:text-3xl filter drop-shadow">{card.symbol}</span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-slate-300 font-bold mt-1 text-center truncate max-w-[50px]">
                      {card.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-600">8-BIT</span>
                    <span className="text-slate-700 text-lg">?</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Controls */}
      <div className="w-full max-w-lg mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
        <button
          onClick={() => initializeGame(difficulty)}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Embaralhar Novo Tabuleiro</span>
        </button>

        <span className="text-[11px] text-slate-500">
          Dica: Acertos em sequência dão combos de pontos x2, x3 e x4!
        </span>
      </div>
    </div>
  );
}
