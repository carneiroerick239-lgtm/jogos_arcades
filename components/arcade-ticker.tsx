'use client';

import React from 'react';
import { Sparkles, Trophy, Flame, Coins, Gamepad2 } from 'lucide-react';

export default function ArcadeTicker() {
  const tickerItems = [
    '★ BEM-VINDO AO FLIPERAMA RETRÔ 198X',
    '★ 17 CARTUCHOS CLÁSSICOS DOS ANOS 80 & 90',
    '★ 100% GRATUITO E SEM DOWNLOAD NO NAVEGADOR',
    '★ SINTETIZADOR 8-BIT NATIVO WEB AUDIO (SEM ARQUIVOS MP3)',
    '★ FUTEBOL RETRÔ · SUPER CORRIDA TURBO · SUPER KART GP',
    '★ COBRINHA · PAC-MAN · QUEBRA-BLOCOS · INVASORES DO ESPAÇO',
    '★ PRESS START TO PLAY · INSIRA SUA FICHA NO GABINETE',
    '★ MODO CRT COM TUBO DE IMAGEM E SCANLINES ANALÓGICAS',
    '★ NOVO RECORDE DISPONÍVEL NO HALL DA FAMA'
  ];

  return (
    <div className="w-full bg-[#0a0714] border-y border-amber-500/30 overflow-hidden py-2 select-none">
      <div className="flex items-center gap-8 whitespace-nowrap animate-marquee font-mono text-[11px] font-bold text-amber-400 tracking-wider">
        {[...tickerItems, ...tickerItems].map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
