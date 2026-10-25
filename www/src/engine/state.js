/*
 * NationZero — Estado central do jogo.
 * Tudo é serializável em JSON (save/load/export).
 */

export const VERSION = 1;

/* ------------------------------------------------------------------ */
/* Definições de atributos */
/* ------------------------------------------------------------------ */

export const STATS = {
 // Economia
 economia: { label: 'Economia', icon: 'trending-up', group: 'economia', max: 100, good: 'up' },
 crescimento: { label: 'Crescimento', icon: 'sprout', group: 'economia', max: 15, min: -20, good: 'up', fmt: 'signedPct' },
 inflacao: { label: 'Inflação', icon: 'flame', group: 'economia', max: 300, good: 'down', fmt: 'pct' },
 desemprego: { label: 'Desemprego', icon: 'receipt', group: 'economia', max: 60, good: 'down', fmt: 'pct' },
 divida: { label: 'Dívida pública', icon: 'credit-card', group: 'economia', max: 400, good: 'down', fmt: 'pct' },
 tesouro: { label: 'Tesouro', icon: 'coins', group: 'economia', max: 9999, min: -9999, good: 'up', fmt: 'money' },

 // Sociedade
 aprovacao: { label: 'Aprovação', icon: 'thumbs-up', group: 'sociedade', max: 100, good: 'up' },
 estabilidade: { label: 'Estabilidade', icon: 'brick-wall', group: 'sociedade', max: 100, good: 'up' },
 agitacao: { label: 'Agitação', icon: 'megaphone', group: 'sociedade', max: 100, good: 'down' },
 corrupcao: { label: 'Corrupção', icon: 'circle-dot', group: 'sociedade', max: 100, good: 'down' },
 criminalidade: { label: 'Criminalidade', icon: 'siren', group: 'sociedade', max: 100, good: 'down' },
 liberdades: { label: 'Liberdades', icon: 'feather', group: 'sociedade', max: 100, good: 'up' },
 repressao: { label: 'Repressão', icon: 'link', group: 'sociedade', max: 100, good: 'down' },

 // Serviços
 educacao: { label: 'Educação', icon: 'graduation-cap', group: 'servicos', max: 100, good: 'up' },
 saude: { label: 'Saúde', icon: 'hospital', group: 'servicos', max: 100, good: 'up' },
 infraestrutura: { label: 'Infraestrutura', icon: 'bridge', group: 'servicos', max: 100, good: 'up' },
 tecnologia: { label: 'Tecnologia', icon: 'flask-conical', group: 'servicos', max: 100, good: 'up' },
 meioAmbiente: { label: 'Meio ambiente', icon: 'tree-deciduous', group: 'servicos', max: 100, good: 'up' },

 // Poder
 poder: { label: 'Poder', icon: 'zap', group: 'poder', max: 100, good: 'up' },
 legitimidade: { label: 'Legitimidade', icon: 'scroll-text', group: 'poder', max: 100, good: 'up' },
 medo: { label: 'Medo', icon: 'frown', group: 'poder', max: 100, good: 'flat' },
 influencia: { label: 'Influência', icon: 'handshake', group: 'poder', max: 100, good: 'up' },

 // Militar
 poderMilitar: { label: 'Poder militar', icon: 'medal', group: 'militar', max: 100, good: 'up' },
 lealdadeMilitar:{ label: 'Lealdade militar',icon: 'shield', group: 'militar', max: 100, good: 'up' },
 arsenalNuclear: { label: 'Arsenal nuclear', icon: 'radiation', group: 'militar', max: 20, good: 'up', fmt: 'int' },

 // Mundo
 reputacao: { label: 'Reputação', icon: 'globe', group: 'mundo', max: 100, good: 'up' },
 sancoes: { label: 'Sanções', icon: 'ban', group: 'mundo', max: 100, good: 'down' },
 populacao: { label: 'População', icon: 'users', group: 'mundo', max: 2000, good: 'up', fmt: 'pop' },
};

export const STAT_GROUPS = {
 economia: 'Economia',
 sociedade: 'Sociedade',
 servicos: 'Serviços públicos',
 poder: 'Poder pessoal',
 militar: 'Forças armadas',
 mundo: 'Mundo',
};

/* Facções que observam você. `weight` pesa na aprovação geral. */
export const FACTIONS = {
 empresariado: { label: 'Empresariado', icon: 'factory', weight: 1.2, desc: 'Donos de indústrias, comércio e grandes negócios.' },
 financeiro: { label: 'Mercado financeiro',icon: 'landmark', weight: 1.1, desc: 'Bancos, fundos e investidores.' },
 trabalhadores:{ label: 'Trabalhadores', icon: 'wrench', weight: 1.4, desc: 'Sindicatos e trabalhadores formais.' },
 camponeses: { label: 'Camponeses', icon: 'wheat', weight: 0.9, desc: 'Trabalhadores rurais e agricultores.' },
 militares: { label: 'Militares', icon: 'medal', weight: 1.5, desc: 'Oficiais e tropas. Quem faz e desfaz governos.' },
 igreja: { label: 'Igrejas', icon: 'church', weight: 0.9, desc: 'Lideranças religiosas e fiéis organizados.' },
 imprensa: { label: 'Imprensa', icon: 'newspaper', weight: 0.8, desc: 'Jornais, TVs e influenciadores.' },
 juventude: { label: 'Juventude', icon: 'headphones', weight: 1.0, desc: 'Estudantes e jovens urbanos.' },
 intelectuais: { label: 'Intelectuais', icon: 'library', weight: 0.7, desc: 'Academia, cientistas e artistas.' },
 minorias: { label: 'Minorias', icon: 'hand-heart', weight: 0.9, desc: 'Grupos historicamente marginalizados.' },
 nacionalistas:{ label: 'Nacionalistas', icon: 'flag', weight: 1.0, desc: 'Movimento patriótico e militarista.' },
 policia: { label: 'Polícia', icon: 'badge', weight: 0.8, desc: 'Corpora policiais e sistema de segurança.' },
};

/* Eixos ideológicos: -100 (esquerda/liberdade/...) a +100 */
export const AXES = {
 economico: { label: 'Economia', neg: 'Coletivista', pos: 'Mercado', desc: 'Estado forte na economia × livre mercado.' },
 social: { label: 'Ordem', neg: 'Libertário', pos: 'Autoritário', desc: 'Liberdades individuais × controle do Estado.' },
 nacionalismo: { label: 'Nação', neg: 'Globalista', pos: 'Nacionalista', desc: 'Integração global × soberania e protecionismo.' },
 religiao: { label: 'Religião', neg: 'Secular', pos: 'Confessional', desc: 'Estado laico × Estado religioso.' },
 ecologia: { label: 'Ecologia', neg: 'Produtivista',pos: 'Ecológico', desc: 'Extração a todo custo × sustentabilidade.' },
 tradicao: { label: 'Costumes', neg: 'Progressista',pos: 'Tradicional', desc: 'Mudança cultural × preservação de costumes.' },
};

export const ROLES = {
 cidadao: { label: 'Cidadão', icon: 'user', order: 0, desc: 'Um nome entre milhões. Por enquanto.' },
 ativista: { label: 'Ativista', icon: 'hand', order: 1, desc: 'Você já mobiliza gente nas ruas.' },
 lider_partido:{ label: 'Líder de partido', icon: 'hat-glasses', order: 2, desc: 'Uma sigla, um programa, uma ambição.' },
 deputado: { label: 'Deputado', icon: 'landmark', order: 3, desc: 'Você tem voz e voto no parlamento.' },
 ministro: { label: 'Ministro', icon: 'folder', order: 4, desc: 'Você comanda uma pasta do Estado.' },
 vice: { label: 'Vice-presidente', icon: 'award', order: 5, desc: 'A um passo do topo — literalmente.' },
 presidente: { label: 'Presidente', icon: 'medal', order: 6, desc: 'Chefe do Estado e do governo.' },
 ditador: { label: 'Ditador', icon: 'crown', order: 7, desc: 'Você não responde a ninguém. Ainda.' },
 monarca: { label: 'Monarca', icon: 'crown', order: 7, desc: 'Coroa, dinastia e vontade absoluta.' },
 deposto: { label: 'Deposto', icon: 'link', order: -1, desc: 'Você caiu. Só resta escrever memórias.' },
};

export const REGIMES = {
 democracia: { label: 'Democracia', icon: 'vote', desc: 'Eleições disputadas, parlamento ativo, imprensa viva.' },
 semidemocracia:{ label: 'Semidemocracia', icon: 'scale', desc: 'Eleições existem, mas o campo não está nivelado.' },
 autoritarismo:{ label: 'Autoritarismo', icon: 'shield', desc: 'Decretos substituem leis. Oposição é tolerada por conveniência.' },
 partido_unico:{ label: 'Partido único', icon: 'flag', desc: 'Só uma sigla é legal. As outras viraram "movimentos".' },
 teocracia: { label: 'Teocracia', icon: 'church', desc: 'A lei sagrada acima da lei civil.' },
 tecnocracia: { label: 'Tecnocracia', icon: 'brain', desc: 'Especialistas decidem. Eleições são "consultas".' },
 monarquia: { label: 'Monarquia', icon: 'crown', desc: 'O trono define o Estado.' },
 junta: { label: 'Junta militar', icon: 'medal', desc: 'Os quartéis governam por decreto.' },
 colapso: { label: 'Colapso', icon: 'skull', desc: 'O Estado não existe mais como tal.' },
};

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const LIMITS = {
 treasury: [-5000, 20000],
 generico: [0, 100],
};

/* ------------------------------------------------------------------ */
/* Estado inicial */
/* ------------------------------------------------------------------ */

export function createState(opts = {}) {
 const stats = {};
 Object.keys(STATS).forEach((k) => {
 const def = STATS[k];
 stats[k] = def.min !== undefined && def.min < 0 ? 0 : 0;
 });

 Object.assign(stats, {
 economia: 48, crescimento: 1.6, inflacao: 4.2, desemprego: 9.5, divida: 64, tesouro: 420,
 aprovacao: 34, estabilidade: 56, agitacao: 22, corrupcao: 48, criminalidade: 41,
 liberdades: 58, repressao: 8,
 educacao: 46, saude: 44, infraestrutura: 45, tecnologia: 42, meioAmbiente: 49,
 poder: 4, legitimidade: 15, medo: 0, influencia: 8,
 poderMilitar: 42, lealdadeMilitar: 52, arsenalNuclear: 0,
 reputacao: 52, sancoes: 0, populacao: 128,
 });

 const factions = {};
 Object.keys(FACTIONS).forEach((k) => (factions[k] = 50));

 const state = {
 version: VERSION,
 meta: {
 nationName: opts.nationName || 'NationZero',
 capital: opts.capital || 'Aurora',
 leaderName: opts.leaderName || 'Você',
 anthem: opts.anthem || 'Hino da Unidade',
 colors: opts.colors || ['#19e08a', '#f5c542', '#e0405a'],
 motto: opts.motto || 'Ordem, Pão e Futuro',
 startYear: 2026,
 createdAt: Date.now(),
 },
 turn: 0,
 role: 'cidadao',
 regime: 'democracia',
 stats,
 factions,
 ideology: { economico: 0, social: 0, nacionalismo: 0, religiao: 0, ecologia: 0, tradicao: 0 },
 party: null,
 policies: {}, // id da lei -> { since }
 custom: [], // decretos personalizados criados pelo jogador
 taxes: { renda: 25, empresas: 25, consumo: 15, patrimonio: 5, tarifas: 10 },
 spending: { saude: 15, educacao: 15, infraestrutura: 10, militar: 10, seguranca: 8, ciencia: 5, cultura: 3, previdencia: 12 },
 institutions: { midia: 12, judiciario: 12, policia: 15, militar: 12, eleitoral: 12 },
 flags: {},
 cooldowns: {},
 log: [],
 pendingEvents: [],
 seenEvents: {},
 elections: { nextTurn: 48, seats: 300, parliament: {}, lastResult: null, rigged: false },
 wars: [],
 relations: {},
 legacy: { daysInPower: 0, lawsPassed: 0, coups: 0, purges: 0, nukes: 0, executed: 0, wars: 0 },
 over: null,
 achievements: {},
 };

 // Relações internacionais iniciais
 return state;
}

/* ------------------------------------------------------------------ */
/* Utilidades */
/* ------------------------------------------------------------------ */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function statKeyLimit(key) {
 const def = STATS[key];
 if (!def) return [0, 100];
 return [def.min !== undefined ? def.min : 0, def.max !== undefined ? def.max : 100];
}

export function currentDate(state) {
 const total = state.meta.startYear * 12 + state.turn;
 return { year: Math.floor(total / 12), month: total % 12 };
}

export function dateLabel(state) {
 const d = currentDate(state);
 return `${MONTHS[d.month]}/${d.year}`;
}

export function fmt(value, kind) {
 switch (kind) {
 case 'money':
 return `${value < 0 ? '−' : ''}N$ ${Math.abs(value).toFixed(0)} bi`;
 case 'pct':
 return `${value.toFixed(1)}%`;
 case 'signedPct':
 return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
 case 'int':
 return `${Math.round(value)}`;
 case 'pop':
 return `${value.toFixed(1)} mi`;
 default:
 return `${Math.round(value)}`;
 }
}

export function statLabel(key, value) {
 const def = STATS[key];
 if (!def) return String(value);
 return fmt(value, def.fmt);
}

export function totalSeats(state) {
 return state.elections.seats || 300;
}

export function playerSeats(state) {
 const p = state.elections.parliament || {};
 return p[state.party?.sigla] || 0;
}

export function hasMajority(state) {
 return playerSeats(state) > totalSeats(state) / 2;
}

export function isRuler(state) {
 return state.role === 'presidente' || state.role === 'ditador' || state.role === 'monarca';
}

export function isAuthoritarian(state) {
 return ['autoritarismo', 'partido_unico', 'teocracia', 'junta', 'monarquia'].includes(state.regime) || state.role === 'ditador' || state.role === 'monarca';
}

export function roleAtLeast(state, role) {
 return (ROLES[state.role]?.order ?? -1) >= (ROLES[role]?.order ?? 99);
}

export function factionAverage(state) {
 let sum = 0;
 let weight = 0;
 for (const [k, def] of Object.entries(FACTIONS)) {
 sum += (state.factions[k] ?? 50) * def.weight;
 weight += def.weight;
 }
 return sum / weight;
}

/* Custo de governo mensal em bilhões */
export function monthlyRevenue(state) {
 const t = state.taxes;
 const avgTax = t.renda * 0.35 + t.empresas * 0.35 + t.consumo * 0.2 + t.patrimonio * 0.1;
 const evasion = clamp((state.stats.corrupcao - 40) * 0.006, 0, 0.35);
 const size = 0.85 + state.stats.economia / 120;
 return state.stats.economia * 1.7 * (avgTax / 25) * size * (1 - evasion);
}

export function monthlySpending(state) {
 return Object.values(state.spending).reduce((a, b) => a + b, 0);
}

export function budgetBalance(state) {
 return monthlyRevenue(state) - monthlySpending(state);
}

export function avgTaxRate(state) {
 const t = state.taxes;
 return (t.renda * 0.35 + t.empresas * 0.35 + t.consumo * 0.2 + t.patrimonio * 0.1);
}

/* ------------------------------------------------------------------ */
/* Log */
/* ------------------------------------------------------------------ */

export function pushLog(state, text, tone = 'info', icon = '•') {
 state.log.unshift({ turn: state.turn, date: dateLabel(state), text, tone, icon, id: Math.random().toString(36).slice(2) });
 if (state.log.length > 400) state.log.length = 400;
}

/* ------------------------------------------------------------------ */
/* Aplicador de efeitos */
/* ------------------------------------------------------------------ */

/**
 * Efeito:
 * {
 * stats: { aprovacao: 5 },
 * factions: { militares: 10 },
 * control: { midia: 5 },
 * ideology: { social: 4 },
 * set: { regime: 'autoritarismo' },
 * flags: { golpe: true },
 * grant: ['acao.id'],
 * policy: { add: ['id'], remove: ['id'] },
 * text: 'mensagem',
 * tone: 'good' | 'bad' | 'warn' | 'info' | 'epic',
 * icon: 'zap'
 * }
 */
export function applyEffect(state, effect = {}, opts = {}) {
 if (!effect) return [];
 const notes = [];

 if (effect.stats) {
 for (const [key, delta] of Object.entries(effect.stats)) {
 if (!(key in state.stats)) continue;
 const [min, max] = statKeyLimit(key);
 const before = state.stats[key];
 state.stats[key] = clamp(before + delta, min, max);
 if (Math.abs(delta) >= 1 && STATS[key]) {
 notes.push(`${STATS[key].icon} ${STATS[key].label} ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
 }
 }
 }

 if (effect.treasury) {
 state.stats.tesouro = clamp(state.stats.tesouro + effect.treasury, LIMITS.treasury[0], LIMITS.treasury[1]);
 notes.push(` Tesouro ${effect.treasury > 0 ? '+' : ''}${effect.treasury.toFixed(0)} bi`);
 }

 if (effect.factions) {
 for (const [key, delta] of Object.entries(effect.factions)) {
 if (!(key in state.factions)) continue;
 state.factions[key] = clamp(state.factions[key] + delta, 0, 100);
 notes.push(`${FACTIONS[key].icon} ${FACTIONS[key].label} ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
 }
 }

 if (effect.control) {
 for (const [key, delta] of Object.entries(effect.control)) {
 if (!(key in state.institutions)) continue;
 state.institutions[key] = clamp(state.institutions[key] + delta, 0, 100);
 notes.push(` Controle de ${key} ${delta > 0 ? '+' : ''}${Math.round(delta)}`);
 }
 }

 if (effect.ideology) {
 for (const [key, delta] of Object.entries(effect.ideology)) {
 if (!(key in state.ideology)) continue;
 state.ideology[key] = clamp(state.ideology[key] + delta, -100, 100);
 }
 }

 if (effect.set) {
 for (const [key, value] of Object.entries(effect.set)) {
 if (key === 'role') state.role = value;
 else if (key === 'regime') state.regime = value;
 else if (key === 'party') state.party = value;
 else state[key] = value;
 }
 }

 if (effect.flags) {
 for (const [k, v] of Object.entries(effect.flags)) state.flags[k] = v;
 }

 if (effect.policy) {
 if (effect.policy.add) effect.policy.add.forEach((id) => { state.policies[id] = { since: state.turn }; });
 if (effect.policy.remove) effect.policy.remove.forEach((id) => { delete state.policies[id]; });
 }

 if (effect.log !== false) {
 const text = effect.text || notes.join(' · ');
 if (text) pushLog(state, text, effect.tone || (opts.tone || 'info'), effect.icon || opts.icon || '•');
 }

 return notes;
}

/* ------------------------------------------------------------------ */
/* Persistência */
/* ------------------------------------------------------------------ */

const SAVE_KEY = 'nationzero.save.v1';

export function saveState(state) {
 try {
 localStorage.setItem(SAVE_KEY, JSON.stringify(state));
 return true;
 } catch (e) {
 console.warn('Falha ao salvar', e);
 return false;
 }
}

export function loadState() {
 try {
 const raw = localStorage.getItem(SAVE_KEY);
 if (!raw) return null;
 const data = JSON.parse(raw);
 if (!data || typeof data !== 'object') return null;
 return migrate(data);
 } catch (e) {
 console.warn('Falha ao carregar', e);
 return null;
 }
}

export function clearSave() {
 try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
}

export function migrate(data) {
 const base = createState();
 const merged = { ...base, ...data };
 merged.stats = { ...base.stats, ...(data.stats || {}) };
 merged.factions = { ...base.factions, ...(data.factions || {}) };
 merged.ideology = { ...base.ideology, ...(data.ideology || {}) };
 merged.taxes = { ...base.taxes, ...(data.taxes || {}) };
 merged.spending = { ...base.spending, ...(data.spending || {}) };
 merged.institutions = { ...base.institutions, ...(data.institutions || {}) };
 merged.meta = { ...base.meta, ...(data.meta || {}) };
 merged.elections = { ...base.elections, ...(data.elections || {}) };
 merged.legacy = { ...base.legacy, ...(data.legacy || {}) };
 merged.flags = data.flags || {};
 merged.policies = data.policies || {};
 merged.cooldowns = data.cooldowns || {};
 merged.log = data.log || [];
 merged.pendingEvents = data.pendingEvents || [];
 merged.seenEvents = data.seenEvents || {};
 merged.relations = data.relations || {};
 merged.custom = data.custom || [];
 return merged;
}

export function exportState(state) {
 return JSON.stringify(state, null, 2);
}

export function importState(text) {
 const data = JSON.parse(text);
 if (!data || typeof data !== 'object' || !data.stats) throw new Error('Arquivo inválido');
 return migrate(data);
}
