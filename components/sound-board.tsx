'use client';

import React, { useState } from 'react';
import { retroAudio } from '@/lib/sound';
import { Volume2, Sparkles, Activity, Zap, Play, Disc } from 'lucide-react';

interface SoundItem {
  id: string;
  name: string;
  category: string;
  description: string;
  wave: string;
  freq: string;
  color: string;
  trigger: () => void;
}

export default function SoundBoard() {
  const [activeSound, setActiveSound] = useState<string | null>(null);

  const sounds: SoundItem[] = [
    {
      id: 'coin',
      name: 'Ficha (Coin Drop)',
      category: 'Moeda & Início',
      description: 'Som clássico das máquinas ao detectar moeda na ranhura.',
      wave: 'Square Wave (B5 → E6)',
      freq: '988 Hz → 1319 Hz',
      color: 'from-amber-500 to-yellow-400 text-slate-950',
      trigger: () => retroAudio.coin()
    },
    {
      id: 'laser',
      name: 'Disparo Laser',
      category: 'Invasores & Galáxia',
      description: 'Varredura rápida descendente de canhão espacial.',
      wave: 'Sawtooth Sweep',
      freq: '880 Hz → 180 Hz',
      color: 'from-cyan-500 to-blue-400 text-slate-950',
      trigger: () => retroAudio.laser()
    },
    {
      id: 'explosion',
      name: 'Explosão 8-Bit',
      category: 'Combate & Naves',
      description: 'Gerador de ruído branco com filtro passa-baixa.',
      wave: 'Noise Buffer / Lowpass',
      freq: '600 Hz → 40 Hz',
      color: 'from-rose-500 to-orange-500 text-white',
      trigger: () => retroAudio.explosion()
    },
    {
      id: 'jump',
      name: 'Pulo / Salto',
      category: 'Plataforma & Frogger',
      description: 'Curva ascendente clássica de pulo de personagens.',
      wave: 'Square Ramp',
      freq: '150 Hz → 600 Hz',
      color: 'from-emerald-500 to-teal-400 text-slate-950',
      trigger: () => retroAudio.jump()
    },
    {
      id: 'bonus',
      name: 'Item de Bônus',
      category: 'Pac-Man & Cobrinha',
      description: 'Arpejo cintilante de 4 notas em progressão harmônica.',
      wave: 'Major Arpeggio (C-E-G-C)',
      freq: '523 Hz → 1046 Hz',
      color: 'from-purple-500 to-pink-400 text-white',
      trigger: () => retroAudio.bonus()
    },
    {
      id: 'microswitch',
      name: 'Clique Microswitch',
      category: 'Controles Físicos',
      description: 'Sensação tátil de botão de fliperama Sanwa sendo acionado.',
      wave: 'Square Transient',
      freq: '680 Hz (15ms)',
      color: 'from-slate-700 to-slate-600 text-amber-300',
      trigger: () => retroAudio.microswitchClick(680)
    },
    {
      id: 'hit',
      name: 'Impacto / Quebra',
      category: 'Breakout & Pong',
      description: 'Rebatida dura e quebra de tijolos pixelados.',
      wave: 'Sawtooth Transient',
      freq: '280 Hz → 120 Hz',
      color: 'from-amber-600 to-rose-600 text-white',
      trigger: () => retroAudio.hit()
    },
    {
      id: 'gameover',
      name: 'Fim de Jogo (Game Over)',
      category: 'Derrota & Continua',
      description: 'Jingle melancólico e desacelerado ao perder todas as vidas.',
      wave: 'Descending Triad',
      freq: '440 Hz → 110 Hz',
      color: 'from-indigo-600 to-violet-800 text-white',
      trigger: () => retroAudio.gameOver()
    }
  ];

  const handlePlaySound = (sound: SoundItem) => {
    setActiveSound(sound.id);
    sound.trigger();
    setTimeout(() => {
      setActiveSound(null);
    }, 450);
  };

  return (
    <section id="som" className="w-full scroll-mt-20 py-16 border-t border-slate-800/80 bg-gradient-to-b from-[#06080e] via-[#090d18] to-[#06080e]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-mono text-amber-400 mb-1 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5" />
              <span>SINTETIZADOR WEB AUDIO NATIVO · SEM ARQUIVOS EXTERNOS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-heading">
              Mesa de Efeitos & Chiptunes 8-Bit
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Todos os sons dos jogos são gerados em tempo real pelo navegador usando osciladores eletrônicos virtuais (Square, Sawtooth, Triangle e Noise). Clique nas teclas para testar os efeitos sonoros originais dos fliperamas!
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Oscilador Ativo: <strong className="text-white">44.1 kHz</strong></span>
          </div>
        </div>

        {/* Sound Pads Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sounds.map(sound => {
            const isPlaying = activeSound === sound.id;

            return (
              <button
                key={sound.id}
                onClick={() => handlePlaySound(sound)}
                className={`group relative text-left p-5 rounded-2xl border transition-all duration-150 flex flex-col justify-between overflow-hidden shadow-lg active:scale-95 ${
                  isPlaying
                    ? 'border-amber-400 ring-2 ring-amber-400/50 -translate-y-1 bg-slate-900'
                    : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700 hover:-translate-y-0.5'
                }`}
              >
                {/* Active Indicator Glow */}
                {isPlaying && (
                  <div className="absolute inset-0 bg-amber-400/10 pointer-events-none animate-pulse" />
                )}

                <div>
                  {/* Category and Wave Type */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                    <span className="text-amber-400 font-semibold">{sound.category}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{sound.wave}</span>
                  </div>

                  {/* Sound Name */}
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors font-heading flex items-center gap-2">
                    <span>{sound.name}</span>
                  </h3>

                  {/* Description */}
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {sound.description}
                  </p>
                </div>

                {/* Bottom Frequency Bar and Button */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-slate-400">
                    {sound.freq}
                  </div>

                  <span
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-transform bg-gradient-to-r shadow-sm flex items-center gap-1.5 ${sound.color} ${
                      isPlaying ? 'scale-105' : 'group-hover:scale-105'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Tocar</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
