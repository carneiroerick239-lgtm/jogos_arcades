'use client';

import React from 'react';

interface EraMilestone {
  year: number;
  title: string;
  game: string;
  developer: string;
  impact: string;
}

const MILESTONES: EraMilestone[] = [
  {
    year: 1972,
    title: 'A Centelha Inicial',
    game: 'Pong',
    developer: 'Atari / Allan Alcorn',
    impact: 'Instalado pela primeira vez no Andy Capp\'s Tavern na Califórnia, travou na primeira noite porque a caixa de moedas transbordou de tantas fichas jogadas.'
  },
  {
    year: 1976,
    title: 'A Destruição e o Labirinto',
    game: 'Breakout & Blockade (Snake)',
    developer: 'Steve Wozniak & Gremlin Industries',
    impact: 'Wozniak desenhou o circuito do Breakout em apenas 4 dias para Steve Jobs. No mesmo ano, Blockade originou o gênero Snake que conquistaria o mundo nos celulares.'
  },
  {
    year: 1978,
    title: 'A Febre dos Fliperamas',
    game: 'Space Invaders',
    developer: 'Taito / Tomohiro Nishikado',
    impact: 'O estrondoso sucesso gerou uma escassez temporária de moedas de 100 ienes no Japão e inspirou a criação de salões de fliperama dedicados exclusivamente a videogames.'
  },
  {
    year: 1984,
    title: 'A Harmonia Geométrica',
    game: 'Tetris',
    developer: 'Alexey Pajitnov',
    impact: 'Programado no computador soviético Elektronika 60, Tetris provou que a mente humana é apaixonada por organizar formas e se tornou o jogo mais distribuído da história.'
  },
  {
    year: 1989,
    title: 'O Companheiro dos Computadores',
    game: 'Campo Minado (Minesweeper)',
    developer: 'Robert Donner & Curt Johnson',
    impact: 'Incluído originalmente no Windows para ensinar usuários a utilizar com precisão os botões esquerdo e direito do mouse, tornou-se o maior vício de escritórios dos anos 90.'
  }
];

export default function RetroHistory() {
  return (
    <section id="historia" className="w-full scroll-mt-20 py-16 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-4">
        {/* Editorial Section Header */}
        <div className="text-center mb-12">
          <div className="text-xs font-mono text-amber-400 mb-2">CRÔNICAS DA ERA DOURADA</div>
          <h2 className="text-3xl font-black text-white tracking-tight text-balance">
            A Revolução dos Jogos Eletrônicos
          </h2>
          <p className="mt-3 text-sm text-slate-400 max-w-xl mx-auto">
            Como circuitos integrados simples, fósforo verde e sons sintetizados em chips de 8 bits transformaram o entretenimento global para sempre.
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-8 relative before:absolute before:inset-0 before:left-3 sm:before:left-1/2 before:w-0.5 before:bg-slate-800 before:-translate-x-1/2">
          {MILESTONES.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <div
                key={item.year}
                className={`relative flex flex-col sm:flex-row items-start sm:items-center ${
                  isEven ? 'sm:flex-row-reverse' : ''
                } gap-6`}
              >
                {/* Year Marker Pin */}
                <div className="absolute left-3 sm:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-amber-500 flex items-center justify-center text-xs font-mono font-bold text-amber-400 z-10 shadow-lg">
                  {item.year.toString().slice(2)}
                </div>

                {/* Content Box */}
                <div
                  className={`w-full sm:w-[calc(50%-2rem)] ml-10 sm:ml-0 p-5 rounded-xl bg-slate-900 border border-slate-800 ${
                    isEven ? 'sm:text-right' : 'sm:text-left'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs font-mono text-slate-400 mb-1 ${
                      isEven ? 'sm:justify-end' : ''
                    }`}
                  >
                    <span className="font-bold text-amber-400">{item.year}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.game}</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>

                  <p className="text-xs text-slate-300 leading-relaxed">{item.impact}</p>

                  <div className="mt-3 text-[11px] text-slate-500 font-mono">
                    Desenvolvido por {item.developer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
