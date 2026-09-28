'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Lightbulb, Heart, Sparkles, HelpCircle } from 'lucide-react';
import { retroAudio } from '@/lib/sound';
import { saveHighScore } from '@/lib/game-types';

interface HangmanGameProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  highScore: number;
}

type HangmanCategory = 'GAMES' | 'MOVIES' | 'TECH' | 'CHARACTERS';

interface WordItem {
  word: string;
  hint: string;
  category: HangmanCategory;
}

const WORDS_DATABASE: WordItem[] = [
  // Videogames Clássicos
  { word: 'TOP GEAR', hint: 'Lendário jogo de corrida com trilha sonora inesquecível do SNES', category: 'GAMES' },
  { word: 'CHRONO TRIGGER', hint: 'RPG supremo de viagem no tempo com arte de Akira Toriyama', category: 'GAMES' },
  { word: 'STREET FIGHTER', hint: 'Hadouken e Shoryuken nos fliperamas do mundo inteiro', category: 'GAMES' },
  { word: 'DONKEY KONG', hint: 'O gorila que jogava barris nos arcades e florestas', category: 'GAMES' },
  { word: 'METROID', hint: 'Samus Aran enfrentando piratas espaciais em Zebes', category: 'GAMES' },
  { word: 'SONIC', hint: 'O ouriço azul veloz que coleciona argolas de ouro', category: 'GAMES' },
  { word: 'CASTLEVANIA', hint: 'Chicote sagrado contra as criaturas do conde Drácula', category: 'GAMES' },
  { word: 'MORTAL KOMBAT', hint: 'Fatality, Scorpion e Sub-Zero no torneio sangrento', category: 'GAMES' },
  { word: 'MEGA MAN', hint: 'O robô azul que absorve os poderes dos chefões derrotados', category: 'GAMES' },
  { word: 'ZELDA', hint: 'A lenda da espada Master Sword e do reino de Hyrule', category: 'GAMES' },
  { word: 'POKEMON', hint: 'Pikachu, Charizard e a missão de se tornar um mestre', category: 'GAMES' },
  { word: 'GOLDENEYE', hint: 'O clássico tiro em primeira pessoa do agente 007 no Nintendo 64', category: 'GAMES' },

  // Cinema Anos 80/90
  { word: 'DE VOLTA PARA O FUTURO', hint: 'O carro DeLorean que viaja no tempo a 88 milhas por hora', category: 'MOVIES' },
  { word: 'OS GOONIES', hint: 'Grupo de garotos em busca do tesouro do pirata Willy Caolho', category: 'MOVIES' },
  { word: 'JURASSIC PARK', hint: 'Dinossauros recriados a partir do DNA em âmbar', category: 'MOVIES' },
  { word: 'MATRIX', hint: 'Pílula azul para continuar dormindo ou vermelha para acordar', category: 'MOVIES' },
  { word: 'EXTERMINADOR DO FUTURO', hint: 'O ciborgue T-800 enviado do futuro: "Hasta la vista, baby!"', category: 'MOVIES' },
  { word: 'CACAFANTASMAS', hint: 'Não cruze os raios de prótons contra monstros de ectoplasma', category: 'MOVIES' },
  { word: 'BLADE RUNNER', hint: 'Caçador de androides replicantes no futuro cyberpunk', category: 'MOVIES' },
  { word: 'INDIANA JONES', hint: 'O arqueólogo do chicote e chapéu em busca da Arca Perdida', category: 'MOVIES' },
  { word: 'STAR WARS', hint: 'Cavaleiros Jedi, sabres de luz e o lado sombrio da Força', category: 'MOVIES' },

  // Tecnologia Retrô
  { word: 'FITA CASSETE', hint: 'Mídia magnética que se rebobinava usando uma caneta esferográfica', category: 'TECH' },
  { word: 'DISQUETE', hint: 'Disco magnético quadrado de três polegadas e meia com 1.44 MB', category: 'TECH' },
  { word: 'MODEM DIAL UP', hint: 'Aparelho que emitia barulho de chiado e ocupava a linha telefônica', category: 'TECH' },
  { word: 'WALKMAN', hint: 'O revolucionário reprodutor de fitas portátil da Sony com fones', category: 'TECH' },
  { word: 'CARTUCHO', hint: 'A fita de videogame que muitos assopravam antes de encaixar', category: 'TECH' },
  { word: 'MONITOR CRT', hint: 'Os pesados tubos de imagem com tubo de raios catódicos e scanlines', category: 'TECH' },
  { word: 'BIP OU PAGER', hint: 'Aparelho preso na cintura que recebia mensagens de texto curtas', category: 'TECH' },
  { word: 'TAMAGOTCHI', hint: 'O bichinho virtual japonês que você precisava alimentar todo dia', category: 'TECH' },

  // Personagens Clássicos
  { word: 'SUPER MARIO', hint: 'O encanador italiano de bigode com macacão azul e chapéu vermelho', category: 'CHARACTERS' },
  { word: 'PAC MAN', hint: 'A esfera amarela dos labirintos perseguida por quatro fantasmas', category: 'CHARACTERS' },
  { word: 'CRASH BANDICOOT', hint: 'O marsupial giratório que quebra caixas do PlayStation', category: 'CHARACTERS' },
  { word: 'LINK', hint: 'O herói de túnica verde que empunha o escudo hyliano', category: 'CHARACTERS' },
  { word: 'BOWSER', hint: 'O rei dos Koopas que sequestra a princesa no castelo', category: 'CHARACTERS' },
  { word: 'SOLID SNAKE', hint: 'O espião tático infiltrado que se esconde em caixas de papelão', category: 'CHARACTERS' }
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function HangmanGame({
  onScoreUpdate,
  onGameOver,
  highScore
}: HangmanGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [selectedCategory, setSelectedCategory] = useState<HangmanCategory>('GAMES');
  const [currentWord, setCurrentWord] = useState<WordItem>(WORDS_DATABASE[0]);
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [maxMistakes] = useState(6);
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');

  // Pick a random word from category
  const selectNewWord = useCallback((cat: HangmanCategory) => {
    const pool = WORDS_DATABASE.filter(w => w.category === cat);
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(chosen);
    setGuessedLetters(new Set());
    setMistakes(0);
    setShowHint(false);
    setGameState('PLAYING');
    retroAudio.coin();
  }, []);

  // Start new match
  const startNewGame = (cat?: HangmanCategory) => {
    const targetCat = cat || selectedCategory;
    setSelectedCategory(targetCat);
    setScore(0);
    setStreak(0);
    selectNewWord(targetCat);
  };

  // Guess letter
  const makeGuess = useCallback((letter: string) => {
    if (gameState !== 'PLAYING' || guessedLetters.has(letter)) return;

    const normalizedTarget = currentWord.word.toUpperCase();
    const newGuessed = new Set(guessedLetters);
    newGuessed.add(letter);
    setGuessedLetters(newGuessed);

    if (normalizedTarget.includes(letter)) {
      // Correct letter!
      retroAudio.blip(500);

      // Check if all letters in word are guessed
      const isComplete = normalizedTarget
        .split('')
        .every(char => char === ' ' || newGuessed.has(char));

      if (isComplete) {
        retroAudio.victory();
        setGameState('WON');
        const streakBonus = (streak + 1) * 150;
        const hintsPenalty = showHint ? -50 : 0;
        const pts = Math.max(100, 300 + streakBonus + hintsPenalty);

        setStreak(st => st + 1);
        setScore(s => {
          const next = s + pts;
          onScoreUpdate(next);
          saveHighScore('hangman', next);
          return next;
        });
      }
    } else {
      // Wrong letter!
      retroAudio.buzzer();
      setMistakes(m => {
        const nextM = m + 1;
        if (nextM >= maxMistakes) {
          retroAudio.gameOver();
          setGameState('LOST');
          setStreak(0);
          onGameOver(score);
        }
        return nextM;
      });
    }
  }, [gameState, guessedLetters, currentWord, streak, showHint, maxMistakes, score, onScoreUpdate, onGameOver]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'IDLE' || gameState === 'WON' || gameState === 'LOST') {
        if (e.key === ' ' || e.key === 'Enter') {
          if (gameState === 'WON') {
            selectNewWord(selectedCategory);
          } else {
            startNewGame();
          }
        }
        return;
      }

      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        makeGuess(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, makeGuess, selectNewWord, selectedCategory]);

  // Draw Gallows & Retro Pixel Guy Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 320, 240);

    // 1. Grassy Mound / Horizon
    ctx.fillStyle = '#15803D';
    ctx.fillRect(0, 200, 320, 40);
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 215, 320, 25);

    // 2. Wooden Gallows Scaffold (Stages 1 & 2)
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 6;
    ctx.lineCap = 'square';

    // Base beam
    ctx.beginPath();
    ctx.moveTo(30, 200);
    ctx.lineTo(130, 200);
    ctx.stroke();

    if (mistakes >= 1) {
      // Vertical main beam
      ctx.beginPath();
      ctx.moveTo(60, 200);
      ctx.lineTo(60, 40);
      ctx.stroke();
    }

    if (mistakes >= 2) {
      // Horizontal top beam + diagonal bracket + hanging rope
      ctx.beginPath();
      ctx.moveTo(57, 40);
      ctx.lineTo(190, 40);
      ctx.stroke();

      // Support bracket
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, 75);
      ctx.lineTo(95, 40);
      ctx.stroke();

      // Noose Rope
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(180, 43);
      ctx.lineTo(180, 80);
      ctx.stroke();
    }

    // 3. Pixel Character Body Parts (Stages 3 to 6)
    if (mistakes >= 3) {
      // Head (Retro 8-bit hero cap & face)
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath();
      ctx.arc(180, 94, 12, 0, Math.PI * 2);
      ctx.fill();

      // Hero Red Cap
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(168, 80, 24, 7);

      // Scared / Normal eyes
      ctx.fillStyle = '#0F172A';
      if (mistakes >= 6) {
        // X X eyes on game over
        ctx.font = 'bold 10px monospace';
        ctx.fillText('x', 173, 97);
        ctx.fillText('x', 183, 97);
      } else {
        ctx.fillRect(174, 91, 3, 3);
        ctx.fillRect(183, 91, 3, 3);
        // Mouth
        ctx.fillRect(177, 99, 6, 2);
      }
    }

    if (mistakes >= 4) {
      // Torso with overalls
      ctx.fillStyle = '#2563EB'; // Blue overalls
      ctx.fillRect(172, 107, 16, 28);
      ctx.fillStyle = '#DC2626'; // Red shirt sleeves
      ctx.fillRect(174, 107, 12, 10);
    }

    if (mistakes >= 5) {
      // Arms
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 4;
      // Left arm waving
      ctx.beginPath();
      ctx.moveTo(172, 112);
      ctx.lineTo(155, 125);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(188, 112);
      ctx.lineTo(205, 125);
      ctx.stroke();
    }

    if (mistakes >= 6) {
      // Legs
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 4.5;
      // Left leg
      ctx.beginPath();
      ctx.moveTo(175, 135);
      ctx.lineTo(168, 165);
      ctx.stroke();
      // Right leg
      ctx.beginPath();
      ctx.moveTo(185, 135);
      ctx.lineTo(192, 165);
      ctx.stroke();

      // Shoes
      ctx.fillStyle = '#78350F';
      ctx.fillRect(163, 165, 9, 5);
      ctx.fillRect(189, 165, 9, 5);
    }
  }, [mistakes]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top HUD */}
      <div className="w-full max-w-lg mb-3 flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 font-mono text-xs">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">PONTUAÇÃO</span>
            <span className="text-amber-400 font-bold text-base">{score}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px]">CHANCES</span>
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: maxMistakes }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-3.5 h-3.5 ${
                    idx < maxMistakes - mistakes ? 'text-rose-500 fill-current' : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 rounded text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold">VITÓRIAS: {streak}</span>
            </div>
          )}
        </div>

        {/* Category switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {(
            [
              { id: 'GAMES', label: 'Games' },
              { id: 'MOVIES', label: 'Cinema' },
              { id: 'TECH', label: 'Retro Tech' },
              { id: 'CHARACTERS', label: 'Heróis' }
            ] as const
          ).map(c => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCategory(c.id);
                selectNewWord(c.id);
              }}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                selectedCategory === c.id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scaffold Canvas & Word Area */}
      <div className="relative w-full max-w-lg bg-slate-950 border-4 border-slate-800 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
        {/* Idle Start Overlay */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl">
            <span className="text-5xl mb-2">📜</span>
            <h3 className="text-2xl font-black text-cyan-400 tracking-tight">FORCA RETRÔ 8-BIT</h3>
            <p className="text-slate-300 text-xs max-w-xs mt-2 mb-6">
              Adivinhe as palavras sobre jogos clássicos, tecnologia nostálgica e cinema dos anos 80/90 antes de esgotar as 6 chances!
            </p>
            <button
              onClick={() => startNewGame()}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition-transform active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>JOGAR FORCA</span>
            </button>
          </div>
        )}

        {/* Won Overlay */}
        {gameState === 'WON' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl">
            <Trophy className="w-12 h-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-2xl font-black text-emerald-400">PALAVRA DESCOBERTA!</h3>
            <p className="text-lg font-bold text-white font-mono my-2">{currentWord.word}</p>
            <p className="text-xs text-slate-300 max-w-xs mb-4">{currentWord.hint}</p>
            <button
              onClick={() => selectNewWord(selectedCategory)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center gap-2 transition-transform active:scale-95"
            >
              <span>PRÓXIMA PALAVRA</span>
            </button>
          </div>
        )}

        {/* Lost Overlay */}
        {gameState === 'LOST' && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-2xl">
            <h3 className="text-2xl font-black text-rose-500 mb-1">ENFORCADO!</h3>
            <p className="text-xs text-slate-400">A palavra secreta era:</p>
            <p className="text-xl font-bold text-amber-400 font-mono my-2 tracking-wider">{currentWord.word}</p>
            <p className="text-xs text-slate-300 max-w-xs mb-4">{currentWord.hint}</p>
            <button
              onClick={() => startNewGame()}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl flex items-center gap-2 transition-transform active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>TENTAR NOVAMENTE</span>
            </button>
          </div>
        )}

        {/* Gallows Canvas */}
        <canvas
          ref={canvasRef}
          width={320}
          height={210}
          className="w-full max-w-[320px] h-auto rounded-lg"
        />

        {/* Secret Word Letters Underlines */}
        <div className="my-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 px-2">
          {currentWord.word.split('').map((char, index) => {
            if (char === ' ') {
              return <span key={index} className="w-4 sm:w-6" />;
            }
            const isRevealed = guessedLetters.has(char) || gameState === 'LOST';
            return (
              <div
                key={index}
                className={`w-7 h-9 sm:w-8 sm:h-11 border-b-4 flex items-center justify-center text-lg sm:text-xl font-black font-mono transition-colors ${
                  isRevealed
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-slate-600 text-transparent'
                }`}
              >
                {isRevealed ? char : '_'}
              </div>
            );
          })}
        </div>

        {/* Hint Tooltip */}
        <div className="w-full max-w-md flex items-center justify-between gap-2 px-2 py-1 mb-3">
          <button
            onClick={() => {
              setShowHint(!showHint);
              retroAudio.blip(300);
            }}
            className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${
              showHint
                ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>{showHint ? 'Ocultar Dica' : 'Ver Pista Histórica'}</span>
          </button>

          {showHint && (
            <span className="text-[11px] text-amber-300/90 font-mono italic animate-fade-in flex-1 text-right">
              {currentWord.hint}
            </span>
          )}
        </div>

        {/* Alphabet Keyboard */}
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 w-full max-w-md">
          {ALPHABET.map(letter => {
            const isGuessed = guessedLetters.has(letter);
            const isCorrect = isGuessed && currentWord.word.toUpperCase().includes(letter);
            return (
              <button
                key={letter}
                onClick={() => makeGuess(letter)}
                disabled={isGuessed || gameState !== 'PLAYING'}
                className={`h-9 sm:h-10 text-xs sm:text-sm font-bold font-mono rounded-lg border transition-all active:scale-95 ${
                  isCorrect
                    ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300 opacity-60'
                    : isGuessed
                    ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-cyan-400'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
