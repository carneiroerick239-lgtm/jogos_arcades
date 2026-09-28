import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Arcade Clássicos 198X - 17 Jogos Retrô de Fliperama',
  description: 'Jogue 17 grandes clássicos retrô no seu navegador: Futebol Retrô, Super Corrida Turbo, Super Kart GP, Jogo da Memória, Forca 8-Bit, Cobrinha, Pac-Man, Asteroids, Pong, Frogger, Quebra-Blocos, Invasores do Espaço, Tetra Blocks e Campo Minado com sintetizador 8-bit.',
  openGraph: {
    title: 'Arcade Clássicos 198X - 17 Jogos Retrô de Fliperama',
    description: 'Jogue 17 grandes clássicos retrô no seu navegador: Futebol Retrô, Super Corrida Turbo, Super Kart GP, Jogo da Memória, Forca 8-Bit, Cobrinha, Pac-Man, Asteroids, Pong, Frogger, Quebra-Blocos, Invasores do Espaço, Tetra Blocks e Campo Minado com sintetizador 8-bit.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arcade Clássicos 198X - 17 Jogos Retrô de Fliperama',
    description: 'Jogue 17 grandes clássicos retrô no seu navegador: Futebol Retrô, Super Corrida Turbo, Super Kart GP, Jogo da Memória, Forca 8-Bit, Cobrinha, Pac-Man, Asteroids, Pong, Frogger, Quebra-Blocos, Invasores do Espaço, Tetra Blocks e Campo Minado com sintetizador 8-bit.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
