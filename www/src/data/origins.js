/* Origem do líder: define vantagens iniciais e sabores de jogo. */

export const ORIGINS = {
  sindicalista: {
    label: 'Sindicalista', icon: '🔧',
    desc: 'Você passou anos organizando greves. Sabe como parar um país — e como negociar.',
    effect: { stats: { influencia: 14, aprovacao: 5, poder: 2 }, factions: { trabalhadores: 22, empresariado: -6 } },
    speech: 'Justiça social',
  },
  empresario: {
    label: 'Empresário', icon: '🏭',
    desc: 'Fortuna construída em família. Você conhece o poder do capital.',
    effect: { treasury: 90, stats: { influencia: 8, economia: 2 }, factions: { empresariado: 22, financeiro: 16, trabalhadores: -8 } },
    speech: 'Economia e emprego',
  },
  militar: {
    label: 'Oficial', icon: '🎖️',
    desc: 'Quartéis, disciplina e uma rede de lealdades fardadas.',
    effect: { stats: { poderMilitar: 8, lealdadeMilitar: 14, poder: 6, liberdades: -3 }, factions: { militares: 26, nacionalistas: 10 } },
    speech: 'Lei e ordem',
  },
  estudante: {
    label: 'Estudante', icon: '🎧',
    desc: 'Liderou ocupações e virou fenômeno nas redes.',
    effect: { stats: { influencia: 12, aprovacao: 6, tecnologia: 2 }, factions: { juventude: 24, intelectuais: 12 } },
    speech: 'Ciência e futuro',
  },
  pastor: {
    label: 'Pastor', icon: '⛪',
    desc: 'Milhões ouvem sua voz todo domingo.',
    effect: { stats: { aprovacao: 4, legitimidade: 6 }, factions: { igreja: 28, minorias: -8, nacionalistas: 6 } },
    speech: 'Fé e família',
  },
  tecnocrata: {
    label: 'Tecnocrata', icon: '🧠',
    desc: 'Economista respeitado, obcecado por planilhas e eficiência.',
    effect: { stats: { tecnologia: 6, educacao: 3, economia: 2, aprovacao: 2 }, factions: { intelectuais: 20, financeiro: 10, trabalhadores: -4 } },
    speech: 'Ciência e futuro',
  },
  populista: {
    label: 'Populista', icon: '📣',
    desc: 'Você fala a língua da multidão — e ela responde.',
    effect: { stats: { aprovacao: 10, agitacao: 6, influencia: 10, liberdades: -2 }, factions: { trabalhadores: 12, nacionalistas: 14, camponeses: 10, imprensa: -8 } },
    speech: 'Soberania e pátria',
  },
  herdeiro: {
    label: 'Herdeiro', icon: '💎',
    desc: 'Uma das maiores fortunas do país. Política é o próximo hobby.',
    effect: { treasury: 180, stats: { influencia: 6, corrupcao: 5 }, factions: { empresariado: 14, financeiro: 14, trabalhadores: -10, imprensa: 6 } },
    speech: 'Economia e emprego',
  },
  ativista: {
    label: 'Ativista', icon: '✊',
    desc: 'Anos de militância em causas sociais e enfrentamentos.',
    effect: { stats: { influencia: 12, liberdades: 4, repressao: -2 }, factions: { minorias: 22, juventude: 14, intelectuais: 8, militares: -8 } },
    speech: 'Justiça social',
  },
};

export const DIFFICULTIES = {
  facil: { label: 'Fácil', icon: '🌤️', desc: 'Tesouro maior, país mais estável e eventos mais leves.', treasury: 300, estabilidade: 10, aprovacao: 8 },
  normal: { label: 'Normal', icon: '⚖️', desc: 'Um país comum, com problemas comuns.', treasury: 0, estabilidade: 0, aprovacao: 0 },
  dificil: { label: 'Difícil', icon: '🌩️', desc: 'Crise herdada: caixa curto, ruas inquietas e desconfiança geral.', treasury: -220, estabilidade: -10, aprovacao: -8, agitacao: 8, divida: 20 },
};

export const FLAGS = ['🏛️', '🦅', '🌾', '⚙️', '🌊', '🔥', '🐉', '⭐', '🌳', '🛡️', '☀️', '🦁', '🐺', '⚡', '🌹', '🗿'];
export const PARTY_COLORS = ['#19e08a', '#7fd8ff', '#f5c542', '#ff8a5c', '#ff5d6c', '#a97bff', '#9ad84f', '#ff7ac6', '#e0e0e0'];
export const PARTY_SYMBOLS = ['★', '⚡', '🌹', '🦅', '✊', '☀️', '⚙️', '🌾', '🐺', '🔨', '🕊️', '🛡️'];
