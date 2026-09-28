import { useSyncExternalStore, useMemo } from 'react';

export type GameId =
  | 'snake'
  | 'pong'
  | 'breakout'
  | 'invaders'
  | 'tetris'
  | 'minesweeper'
  | 'pacman'
  | 'asteroids'
  | 'frogger'
  | 'flappy'
  | 'lander'
  | 'connect4'
  | 'soccer'
  | 'racing'
  | 'kart'
  | 'memory'
  | 'hangman';

export type GameCategory = 'todos' | 'arcade' | 'acao' | 'raciocinio' | 'multijogador';

export interface GameInfo {
  id: GameId;
  title: string;
  originalTitle: string;
  year: number;
  developer: string;
  category: GameCategory;
  shortDesc: string;
  fullDesc: string;
  instructions: string[];
  controls: { key: string; action: string }[];
  tags: string[];
  image: string;
  accentColor: string;
}

export const GAMES_CATALOG: GameInfo[] = [
  {
    id: 'snake',
    title: 'Cobrinha Retrô',
    originalTitle: 'Snake',
    year: 1976,
    developer: 'Gremlin Industries / Nokia',
    category: 'arcade',
    shortDesc: 'Controle a cobra faminta, devore maçãs suculentas e evite colidir com o próprio corpo ou com as paredes.',
    fullDesc: 'O lendário jogo que popularizou os videogames portáteis nos anos 90. Guie a cobra pela arena pixelada, coma frutas para crescer e colete maçãs douradas raras para pontuação dobrada!',
    instructions: [
      'Use as setas do teclado ou WASD para mudar a direção.',
      'Coma maçãs vermelhas para crescer e ganhar 10 pontos.',
      'Colete maçãs douradas temporárias para 50 pontos extras.',
      'Não bata nas paredes (se o modo borda estiver ativo) nem no próprio corpo!'
    ],
    controls: [
      { key: '↑ / W', action: 'Subir' },
      { key: '↓ / S', action: 'Descer' },
      { key: '← / A', action: 'Esquerda' },
      { key: '→ / D', action: 'Direita' },
      { key: 'P / Espaço', action: 'Pausar' }
    ],
    tags: ['Arcade', 'Clássico 8-Bit', '1 Jogador'],
    image: '/images/arcade_game_snake_1790199129093.jpg',
    accentColor: '#10B981'
  },
  {
    id: 'pacman',
    title: 'Labirinto Comilão',
    originalTitle: 'Pac-Man',
    year: 1980,
    developer: 'Toru Iwatani / Namco',
    category: 'arcade',
    shortDesc: 'Devore todas as pastilhas no labirinto neon, colete super pastilhas e persiga os fantasmas!',
    fullDesc: 'O maior ícone dos fliperamas dos anos 80. Percorra os corredores do labirinto coletando pastilhas energéticas e frutas de bônus, enquanto despista Blinky, Pinky, Inky e Clyde em uma perseguição eletrizante.',
    instructions: [
      'Colete todas as pastilhas para limpar o labirinto e avançar de nível.',
      'Devore as 4 grandes pílulas de força nos cantos para enfraquecer os fantasmas.',
      'Coma fantasmas azuis assustados para multiplicar bônus (200, 400, 800, 1600 pts).',
      'Use o túnel de escape lateral para atravessar instantaneamente para o outro lado!'
    ],
    controls: [
      { key: '↑ / W', action: 'Ir para cima' },
      { key: '↓ / S', action: 'Ir para baixo' },
      { key: '← / A', action: 'Ir para esquerda' },
      { key: '→ / D', action: 'Ir para direita' },
      { key: 'P', action: 'Pausar partida' }
    ],
    tags: ['Ícone Máximo', 'Fliperama 1980', 'Labirinto'],
    image: '/images/arcade_game_pacman_1790201506895.jpg',
    accentColor: '#FACC15'
  },
  {
    id: 'asteroids',
    title: 'Chuva de Asteroides',
    originalTitle: 'Asteroids',
    year: 1979,
    developer: 'Lyle Rains & Ed Logg / Atari',
    category: 'acao',
    shortDesc: 'Pilote sua nave em um cinturão de asteroides, destrua rochas cósmicas e desvie dos discos voadores.',
    fullDesc: 'O marco dos gráficos vetoriais espaciais da Atari. Voe no vácuo do espaço com física inercial verídica, dispare canhões laser para fragmentar asteroides gigantes em pedaços e use o salto no hiperespaço!',
    instructions: [
      'Controle a inércia da nave acionando o propulsor e girando a fuselagem.',
      'Atire nos asteroides: rochas grandes se dividem em duas médias, e médias em duas pequenas.',
      'Telas com rolagem toroidal (wrap-around): saia por uma borda para voltar pela oposta.',
      'Destrua naves invasoras vermelhas antes que seus disparos atinjam sua nave!'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Girar nave' },
      { key: '↑ ou W', action: 'Propulsor de empuxo' },
      { key: 'Espaço', action: 'Disparo de canhão' },
      { key: '↓ ou S', action: 'Salto Hiperespaço' },
      { key: 'P', action: 'Pausar' }
    ],
    tags: ['Física Vetorial', 'Espaço Sideral', 'Atari 1979'],
    image: '/images/arcade_game_asteroids_1790201522472.jpg',
    accentColor: '#38BDF8'
  },
  {
    id: 'pong',
    title: 'Pong Arcade',
    originalTitle: 'Pong',
    year: 1972,
    developer: 'Allan Alcorn / Atari',
    category: 'multijogador',
    shortDesc: 'O pai de todos os videogames. Rebata a bola com sua raquete e vença contra a máquina ou um amigo!',
    fullDesc: 'Lançado pela Atari em 1972, Pong foi o pioneiro que deu origem à indústria dos jogos eletrônicos. Simula tênis de mesa com física angular empolgante que acelera a cada golpe.',
    instructions: [
      'Escolha entre 1 Jogador (contra o computador) ou 2 Jogadores no mesmo teclado.',
      'A bola acelera a cada rebatida bem-sucedida.',
      'Rebata na quina da raquete para dar efeito angular surpresa.',
      'Primeiro a atingir a pontuação alvo (5 ou 10) é o grande campeão!'
    ],
    controls: [
      { key: 'W / S', action: 'Mover Jogador 1 (Esquerda)' },
      { key: '↑ / ↓', action: 'Mover Jogador 2 (Direita)' },
      { key: 'P', action: 'Pausar partida' }
    ],
    tags: ['Multijogador', 'Fliperama', 'Esporte Retrô'],
    image: '/images/arcade_art_pixel_hub_1790199104544.jpg',
    accentColor: '#38BDF8'
  },
  {
    id: 'frogger',
    title: 'Sapo na Estrada',
    originalTitle: 'Frogger',
    year: 1981,
    developer: 'Konami / Sega',
    category: 'arcade',
    shortDesc: 'Ajude os sapinhos a atravessar rodovias de alta velocidade e rios traiçoeiros cheios de toras.',
    fullDesc: 'O clássico supremo de timing e reflexo criado pela Konami. Cruze 5 faixas de asfalto desviando de caminhões, carros esportivos e tratores, e atravesse o rio caudaloso saltando sobre troncos e tartarugas.',
    instructions: [
      'Observe os padrões de velocidade dos veículos e avance pelas faixas no momento certo.',
      'No rio, pule sobre toras de madeira e cascos de tartaruga sem cair na correnteza.',
      'Fique atento às tartarugas que mergulham temporariamente na água!',
      'Preencha com segurança as 5 baías verdes no topo da tela para vencer a fase.'
    ],
    controls: [
      { key: '↑ / W', action: 'Salto para frente' },
      { key: '↓ / S', action: 'Salto para trás' },
      { key: '← / A', action: 'Salto para esquerda' },
      { key: '→ / D', action: 'Salto para direita' },
      { key: 'P', action: 'Pausar' }
    ],
    tags: ['Timing Preciso', 'Konami 1981', 'Travessia'],
    image: '/images/arcade_game_frogger_1790201532204.jpg',
    accentColor: '#22C55E'
  },
  {
    id: 'breakout',
    title: 'Quebra-Blocos',
    originalTitle: 'Breakout',
    year: 1976,
    developer: 'Steve Wozniak & Nolan Bushnell',
    category: 'arcade',
    shortDesc: 'Destrua todas as fileiras de tijolos coloridos rebatendo a esfera metálica com sua raquete.',
    fullDesc: 'Projetado originalmente por Steve Wozniak para a Atari, Breakout revolucionou os jogos de reflexo. Colete itens especiais que caem dos tijolos: multibola, expansor de raquete e canhão laser!',
    instructions: [
      'Mova a raquete horizontalmente para rebater a bola.',
      'Tijolos de diferentes cores possuem pontos e resistências distintas.',
      'Capture itens de poder que caem para ganhar vantagens.',
      'Não deixe a bola cair no abismo inferior!'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Mover Raquete' },
      { key: 'Mouse / Toque', action: 'Seguir Cursor' },
      { key: 'Espaço', action: 'Lançar bola / Atirar laser' }
    ],
    tags: ['Destruição', 'Física', 'Power-ups'],
    image: '/images/arcade_hero_cabinet_1790199093017.jpg',
    accentColor: '#F59E0B'
  },
  {
    id: 'invaders',
    title: 'Invasores do Espaço',
    originalTitle: 'Space Invaders',
    year: 1978,
    developer: 'Tomohiro Nishikado / Taito',
    category: 'acao',
    shortDesc: 'Defenda a Terra da invasão alienígena pixelada marchando em direção ao solo!',
    fullDesc: 'O fenômeno mundial da Taito causou escassez de moedas de 100 ienes no Japão em 1978! Controle seu canhão laser, utilize as barricadas para se proteger e destrua a Nave-Mãe bônus.',
    instructions: [
      'Mova o canhão laser lateralmente e dispare contra a esquadrilha alienígena.',
      'As barricadas verdes protegem contra tiros, mas sofrem desgaste a cada impacto.',
      'Conforme elimina os alienígenas, a marcha dos sobreviventes fica mais rápida e frenética!',
      'Acerte a nave misteriosa vermelha no topo para ganhar até 300 pontos de bônus.'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Mover Nave' },
      { key: 'Espaço / Toque', action: 'Disparar Canhão' },
      { key: 'P', action: 'Pausar' }
    ],
    tags: ['Ação Espacial', 'Tiro 8-Bit', 'Clássico Imortal'],
    image: '/images/arcade_game_invaders_1790199116375.jpg',
    accentColor: '#EC4899'
  },
  {
    id: 'flappy',
    title: 'Pássaro Pixel',
    originalTitle: 'Flappy Pixel',
    year: 1986,
    developer: 'Retro Arcade Vintage',
    category: 'arcade',
    shortDesc: 'Toque para bater asas, controle o arco da gravidade e passe pelas frestas dos canos!',
    fullDesc: 'O teste definitivo de calma e ritmo. Ajuste a trajetória do pássaro pixelado através de colunas verticais estreitas. Colete moedas e ganhe medalhas de honra ao alcançar grandes distâncias.',
    instructions: [
      'Pressione Espaço ou clique na tela para dar um impulso vertical.',
      'Gerencie a gravidade para flutuar suavemente pelos vãos.',
      'Cada coluna de canos superada concede 1 ponto de pontuação.',
      'Qualquer toque nos canos ou no solo encerra a tentativa!'
    ],
    controls: [
      { key: 'Espaço / Clique / Toque', action: 'Bater Asas / Impulso' },
      { key: 'P', action: 'Pausar voo' }
    ],
    tags: ['Física de Salto', 'Ritmo Puro', 'Desafio Instantâneo'],
    image: '/images/arcade_game_flappy_1790201542188.jpg',
    accentColor: '#F97316'
  },
  {
    id: 'lander',
    title: 'Módulo Lunar',
    originalTitle: 'Lunar Lander',
    year: 1979,
    developer: 'Howard Delman / Atari',
    category: 'acao',
    shortDesc: 'Gerencie o combustível da nave e pouse com extrema suavidade na superfície da Lua!',
    fullDesc: 'Inspirado na corrida espacial da NASA, Lunar Lander foi o primeiro simulador com física gravitacional vetorial realista. Regule a potência do motor e nivele o módulo sobre zonas planas de pontuação.',
    instructions: [
      'Monitore a velocidade vertical e horizontal no painel de voo.',
      'Use o motor principal com moderação para não esgotar todo o combustível.',
      'Gire a nave para alinhar perfeitamente o trem de pouso antes de tocar o solo.',
      'Pousos bem-sucedidos em plataformas menores garantem multiplicadores de 2x, 3x e 5x!'
    ],
    controls: [
      { key: '↑ ou W / Espaço', action: 'Acionar Motor de Empuxo' },
      { key: '← / → ou A / D', action: 'Girar Jatos Laterais' },
      { key: 'P', action: 'Pausar Voo' }
    ],
    tags: ['Simulador Vintage', 'Física Espacial', 'Atari 1979'],
    image: '/images/arcade_game_lander_1790201550915.jpg',
    accentColor: '#06B6D4'
  },
  {
    id: 'connect4',
    title: 'Quatro em Linha',
    originalTitle: 'Connect 4',
    year: 1974,
    developer: 'Milton Bradley / Hasbro',
    category: 'multijogador',
    shortDesc: 'O duelo vertical definitivo! Alinhe 4 fichas da sua cor antes do adversário.',
    fullDesc: 'O clássico tabuleiro azul de 7 colunas e 6 linhas que conquistou famílias e campeonatos mundiais. Jogue individualmente contra uma IA estratégica inteligente ou dispute contra um amigo no mesmo dispositivo!',
    instructions: [
      'Selecione uma das 7 colunas do tabuleiro para derrubar uma ficha colorida.',
      'A ficha cairá pela gravidade na posição mais baixa disponível daquela coluna.',
      'Conecte 4 fichas consecutivas na horizontal, vertical ou diagonal para vencer.',
      'Antecipe os passos do oponente para bloquear suas linhas de 3 fichas!'
    ],
    controls: [
      { key: 'Clique / Toque na Coluna', action: 'Soltar Ficha' },
      { key: 'Teclas 1 a 7', action: 'Soltar na Coluna correspondente' },
      { key: '← / → e Espaço', action: 'Mover mira e soltar ficha' }
    ],
    tags: ['Estratégia Pura', '1 vs 1 ou IA', 'Raciocínio'],
    image: '/images/arcade_art_pixel_hub_1790199104544.jpg',
    accentColor: '#EF4444'
  },
  {
    id: 'tetris',
    title: 'Tetra Blocks',
    originalTitle: 'Tetris',
    year: 1984,
    developer: 'Alexey Pajitnov',
    category: 'raciocinio',
    shortDesc: 'Encaixe os blocos geométricos que caem para completar linhas completas e marcar pontos massivos.',
    fullDesc: 'Criado pelo engenheiro russo Alexey Pajitnov na Academia de Ciências de Moscou. O quebra-cabeça definitivo que desafiou gerações com sua simplicidade elegante e profundidade tática.',
    instructions: [
      'Gire e posicione os 7 tipos de peças geométricas (Tetraminós).',
      'Complete linhas horizontais sem vãos para limpá-las da tela.',
      'Eliminar 4 linhas simultâneas com a barra longa realiza um glorioso TETRA!',
      'Use a função "Guardar" (Hold) com a tecla C para salvar uma peça para o momento ideal.'
    ],
    controls: [
      { key: '← / →', action: 'Mover lateralmente' },
      { key: '↑ / X', action: 'Girar bloco' },
      { key: '↓', action: 'Queda suave' },
      { key: 'Espaço', action: 'Queda instantânea (Hard drop)' },
      { key: 'C / Shift', action: 'Guardar peça (Hold)' }
    ],
    tags: ['Quebra-cabeça', 'Estratégia', 'Foco'],
    image: '/images/arcade_art_pixel_hub_1790199104544.jpg',
    accentColor: '#8B5CF6'
  },
  {
    id: 'minesweeper',
    title: 'Campo Minado',
    originalTitle: 'Minesweeper',
    year: 1989,
    developer: 'Robert Donner & Curt Johnson',
    category: 'raciocinio',
    shortDesc: 'Use dedução lógica e números de proximidade para desarmar todas as minas sem detonar nenhuma!',
    fullDesc: 'O eterno companheiro dos computadores dos anos 90. Cada número indica quantas minas estão adjacentes àquela casa. Marque as suspeitas com bandeirinhas e limpe o tabuleiro.',
    instructions: [
      'Clique com botão esquerdo para abrir uma célula do tabuleiro.',
      'O primeiro clique NUNCA é uma mina!',
      'Clique com botão direito (ou ative o modo bandeira no celular) para sinalizar minas.',
      'Os números indicam quantas minas existem nas 8 casas adjacentes.'
    ],
    controls: [
      { key: 'Clique Esquerdo', action: 'Abrir casa' },
      { key: 'Clique Direito', action: 'Colocar bandeira' },
      { key: 'Modo Mobile', action: 'Botão alternador Revelar/Bandeira' }
    ],
    tags: ['Lógica Pura', 'Mistério', 'Clássico PC'],
    image: '/images/arcade_hero_cabinet_1790199093017.jpg',
    accentColor: '#EAB308'
  },
  {
    id: 'soccer',
    title: 'Futebol Retrô 8-Bit',
    originalTitle: 'Retro Soccer Cup',
    year: 1985,
    developer: 'Tehkan / Sensible Software',
    category: 'arcade',
    shortDesc: 'Aponte, calibre a força e curve o chute para marcar golaços no goleiro e vencer a Copa de Pênaltis e Faltas!',
    fullDesc: 'A emoção dos gramados com a magia dos 8 bits! Controle o cobrador de pênaltis e faltas, posicione a mira no ângulo da trave, ajuste a barra de força e aplique efeito curvo de trivela para vencer o goleiro rival.',
    instructions: [
      'Use as setas ← / → para mover o ponteiro de mira nas traves.',
      'Pressione e segure o botão de chute ou Espaço para dosar a barra de potência na zona verde.',
      'Selecione o efeito desejado (Curva à Esquerda, Reto ou Curva à Direita).',
      'Vença os 5 rounds da disputa para levantar a Taça dos Campeões!'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Mover Mira do Chute' },
      { key: 'Espaço / Toque', action: 'Calibrar Força e Chutar' },
      { key: 'Q / E ou 1 / 2 / 3', action: 'Aplicar Efeito de Curva' },
      { key: 'P', action: 'Pausar Partida' }
    ],
    tags: ['Esporte Retrô', 'Pênaltis & Faltas', 'Copa 8-Bit'],
    image: '/images/arcade_art_pixel_hub_1790199104544.jpg',
    accentColor: '#10B981'
  },
  {
    id: 'racing',
    title: 'Super Corrida Turbo',
    originalTitle: 'Retro Highway Racer',
    year: 1986,
    developer: 'OutRunners / Taito',
    category: 'acao',
    shortDesc: 'Acelere seu bólido esportivo na rodovia, desvie do tráfego intenso e ative o nitro para quebrar recordes!',
    fullDesc: 'Inspirado nos lendários fliperamas de corrida dos anos 80. Sinta a adrenalina do asfalto quente com ultrapassagens no limite, trocas de marcha, derrapagens controladas e queima de óxido nitroso a mais de 280 km/h.',
    instructions: [
      'Acelere com ↑ ou W e esterce para a esquerda e direita.',
      'Pressione Espaço para acionar o Turbo Nitro e disparar em velocidade máxima!',
      'Desvie de caminhões lentos, viaturas e manchas de óleo na pista.',
      'Cruze os checkpoints antes que o tempo se esgote para avançar de setor.'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Direção do Carro' },
      { key: '↑ ou W', action: 'Acelerar' },
      { key: '↓ ou S', action: 'Frear' },
      { key: 'Espaço / Shift', action: 'Ativar Turbo Nitro' },
      { key: 'P', action: 'Pausar' }
    ],
    tags: ['Velocidade Máxima', 'Turbo Nitro', 'Arcade 1986'],
    image: '/images/arcade_neon_hall_1790632983182.jpg',
    accentColor: '#EF4444'
  },
  {
    id: 'kart',
    title: 'Super Kart GP',
    originalTitle: 'Super Kart Grand Prix',
    year: 1992,
    developer: 'Nintendo EAD',
    category: 'arcade',
    shortDesc: 'Acelere karts pixelados, colete caixas surpresa, atire cascos, solte bananas e dispute a bandeirada!',
    fullDesc: 'Uma vibrante homenagem ao clássico Super Mario Kart do SNES em perspectiva retro! Dispute 3 voltas acirradas contra rivais, pegue caixas misteriosas na pista e use cascos verdes, cascos vermelhos teleguiados, cascas de banana e cogumelos turbo para ser o primeiro colocado.',
    instructions: [
      'Faça curvas fechadas e solte o acelerador para fazer drift sem sair da pista.',
      'Passe sobre as caixas com "?" para sortear itens aleatórios.',
      'Pressione Espaço para usar o item: Casco Verde (tiro reto), Casco Vermelho (teleguiado), Banana (armadilha) ou Cogumelo (super arrancada).',
      'Complete as 3 voltas e suba no topo do pódio!'
    ],
    controls: [
      { key: '← / → ou A / D', action: 'Curva / Direção' },
      { key: '↑ ou W', action: 'Acelerar Kart' },
      { key: '↓ ou S', action: 'Frear / Marcha Ré' },
      { key: 'Espaço / Toque Item', action: 'Usar Item Coletado' },
      { key: 'P', action: 'Pausar Corrida' }
    ],
    tags: ['Corrida de Kart', 'Itens & Cascos', 'Poderes Clássicos'],
    image: '/images/arcade_joystick_deck_1790633004677.jpg',
    accentColor: '#F59E0B'
  },
  {
    id: 'memory',
    title: 'Jogo da Memória Retrô',
    originalTitle: 'Pixel Memory Match',
    year: 1988,
    developer: 'Retro Byte Labs',
    category: 'raciocinio',
    shortDesc: 'Encontre todos os pares de ícones retrô pixelados: cogumelos, moedas, fantasmas, joysticks e estrelas!',
    fullDesc: 'Exercite sua memória com nostalgia pura! Vire cartas com arte pixelada de itens icônicos dos anos 80 e 90. Mantenha combos de acertos consecutivos para multiplicar sua pontuação e tente bater o relógio com o menor número de tentativas.',
    instructions: [
      'Clique ou toque nas cartas para virá-las e revelar a figura pixelada.',
      'Encontre os pares correspondentes para mantê-los abertos.',
      'Acertos em sequência ativam multiplicadores de combo (x2, x3, x4)!',
      'Escolha entre os modos Fácil (12 cartas), Médio (16 cartas) e Especialista (24 cartas).'
    ],
    controls: [
      { key: 'Clique / Toque', action: 'Virar Carta' },
      { key: 'Espaço', action: 'Novo Embaralhamento' },
      { key: 'Teclas 1, 2, 3', action: 'Mudar Dificuldade' }
    ],
    tags: ['Memória & Foco', 'Combos de Pontos', 'Arte Pixelada'],
    image: '/images/arcade_retro_cartridges_1790632994211.jpg',
    accentColor: '#A855F7'
  },
  {
    id: 'hangman',
    title: 'Forca Retrô 8-Bit',
    originalTitle: 'Pixel Hangman Classic',
    year: 1982,
    developer: 'Retro Wordworks',
    category: 'raciocinio',
    shortDesc: 'Adivinhe as palavras secretas sobre videogames clássicos, cinema dos anos 80/90 e tecnologia vintage!',
    fullDesc: 'O tradicional jogo da forca recriado com estética arcade nostálgica. Uma forca em pixel art é construída peça a peça a cada erro enquanto você tenta salvar o herói retrô. Centenas de palavras clássicas divididas em 4 categorias nostálgicas com dicas opcionais.',
    instructions: [
      'Escolha uma das 4 categorias: Videogames, Filmes 80/90, Tecnologia Retrô ou Personagens.',
      'Digite ou clique nas letras do teclado para adivinhar a palavra secreta.',
      'Você tem 6 chances antes que o personagem seja capturado!',
      'Use o botão de Dica para receber uma pista histórica exclusiva.'
    ],
    controls: [
      { key: 'Teclado A-Z', action: 'Escolher Letra' },
      { key: 'Botão de Dica', action: 'Revelar Pista da Palavra' },
      { key: 'Espaço / Enter', action: 'Nova Rodada' }
    ],
    tags: ['Adivinhação', 'Nostalgia Gamer', 'Vocabulário Retrô'],
    image: '/images/arcade_hero_cabinet_1790199093017.jpg',
    accentColor: '#06B6D4'
  }
];

export interface HighScoreRecord {
  gameId: GameId;
  score: number;
  date: string;
  detail?: string;
}

export const DEFAULT_SCORES: Record<GameId, number> = {
  snake: 0,
  pong: 0,
  breakout: 0,
  invaders: 0,
  tetris: 0,
  minesweeper: 0,
  pacman: 0,
  asteroids: 0,
  frogger: 0,
  flappy: 0,
  lander: 0,
  connect4: 0,
  soccer: 0,
  racing: 0,
  kart: 0,
  memory: 0,
  hangman: 0
};

export function getHighScores(): Record<GameId, number> {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SCORES };
  }
  try {
    const raw = localStorage.getItem('retro_arcade_highscores');
    if (!raw) {
      return { ...DEFAULT_SCORES };
    }
    return { ...DEFAULT_SCORES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SCORES };
  }
}

export function saveHighScore(gameId: GameId, score: number): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const current = getHighScores();
    if (score > (current[gameId] || 0)) {
      current[gameId] = score;
      localStorage.setItem('retro_arcade_highscores', JSON.stringify(current));
      window.dispatchEvent(new Event('retro_highscores_changed'));
      return true;
    }
  } catch {
    // LocalStorage write fail handled
  }
  return false;
}

export function resetHighScores(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('retro_arcade_highscores');
    window.dispatchEvent(new Event('retro_highscores_changed'));
  } catch {
    // handled
  }
}

const defaultScoresJson = JSON.stringify(DEFAULT_SCORES);

function subscribeHighScores(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('retro_highscores_changed', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('retro_highscores_changed', callback);
  };
}

function getScoresSnapshot(): string {
  if (typeof window === 'undefined') return defaultScoresJson;
  return localStorage.getItem('retro_arcade_highscores') || defaultScoresJson;
}

function getServerScoresSnapshot(): string {
  return defaultScoresJson;
}

export function useHighScores(): Record<GameId, number> {
  const json = useSyncExternalStore(subscribeHighScores, getScoresSnapshot, getServerScoresSnapshot);
  return useMemo(() => {
    try {
      return { ...DEFAULT_SCORES, ...JSON.parse(json) };
    } catch {
      return { ...DEFAULT_SCORES };
    }
  }, [json]);
}
