/*
 * Motor político: progressão de carreira, eleições, golpes, purgas.
 */

import { clamp, applyEffect, pushLog, factionAverage, dateLabel, isRuler, isAuthoritarian, playerSeats, totalSeats } from './state.js';
import { ACTION_BY_ID, PURGE_STYLES, SPEECH_TOPICS } from '../data/actions.js';
import { LAW_BY_ID } from '../data/laws.js';

export const NPC_PARTIES = [
  { sigla: 'PLD', name: 'Partido Liberal Democrata', ideology: { economico: 60, social: -30, nacionalismo: -20 }, base: 26 },
  { sigla: 'MST', name: 'Movimento Social dos Trabalhadores', ideology: { economico: -65, social: -20, nacionalismo: 10 }, base: 24 },
  { sigla: 'CDN', name: 'Centro Democrático Nacional', ideology: { economico: 10, social: 5, nacionalismo: 20 }, base: 22 },
  { sigla: 'AFN', name: 'Aliança Nacionalista', ideology: { economico: 20, social: 60, nacionalismo: 75 }, base: 18 },
  { sigla: 'VRE', name: 'Verde Renovação', ideology: { economico: -10, social: -35, ecologia: 80 }, base: 10 },
];

/* ------------------------------------------------------------------ */
/* Custo / disponibilidade                                              */
/* ------------------------------------------------------------------ */

export function actionCost(state, action) {
  const cost = { ...(action.cost || {}) };
  // Poder reduz custo de influência
  if (cost.influencia) {
    const discount = 1 - clamp(state.stats.legitimidade / 400, 0, 0.3) - clamp(state.stats.medo / 500, 0, 0.2);
    cost.influencia = Math.max(0, Math.round(cost.influencia * discount));
  }
  return cost;
}

export function canAfford(state, action) {
  const cost = actionCost(state, action);
  if (cost.tesouro && state.stats.tesouro < cost.tesouro) return { ok: false, reason: `Tesouro insuficiente (N$ ${cost.tesouro} bi)` };
  if (cost.poder && state.stats.poder < cost.poder) return { ok: false, reason: `Poder insuficiente (${cost.poder})` };
  if (cost.influencia && state.stats.influencia < cost.influencia) return { ok: false, reason: `Influência insuficiente (${cost.influencia})` };
  if (cost.lealdadeMilitarMin && state.stats.lealdadeMilitar < cost.lealdadeMilitarMin) return { ok: false, reason: `Lealdade militar baixa (precisa ${cost.lealdadeMilitarMin})` };
  return { ok: true };
}

const ROLE_ORDER = { cidadao: 0, ativista: 1, lider_partido: 2, deputado: 3, ministro: 4, vice: 5, presidente: 6, ditador: 7, monarca: 7 };

export function checkRequire(state, action) {
  const req = action.require || {};
  if (req.roleExact && !req.roleExact.includes(state.role)) return false;
  if (req.role) {
    const need = Math.min(...req.role.map((r) => ROLE_ORDER[r] ?? 0));
    if ((ROLE_ORDER[state.role] ?? -1) < need) return false;
  }
  if (req.regime && !req.regime.includes(state.regime)) return false;
  if (req.party && !state.party) return false;
  if (req.noParty && state.party) return false;
  if (req.stats) {
    for (const [k, min] of Object.entries(req.stats)) if ((state.stats[k] ?? 0) < min) return false;
  }
  if (req.statsMax) {
    for (const [k, max] of Object.entries(req.statsMax)) if ((state.stats[k] ?? 0) > max) return false;
  }
  if (req.flags) {
    for (const [k, v] of Object.entries(req.flags)) if ((state.flags[k] ?? false) !== v) return false;
  }
  if (req.notFlags) {
    for (const [k, v] of Object.entries(req.notFlags)) if ((state.flags[k] ?? false) === v) return false;
  }
  return true;
}

export function cooldownLeft(state, action) {
  const last = state.cooldowns[action.id];
  if (last === undefined) return 0;
  const cd = action.cooldown || 0;
  return Math.max(0, cd - (state.turn - last));
}

export function availableActions(state) {
  return Object.values(ACTION_BY_ID).map((a) => {
    const cd = cooldownLeft(state, a);
    const req = checkRequire(state, a);
    const afford = canAfford(state, a);
    return { action: a, cooldown: cd, allowed: req && cd === 0, afford };
  });
}

/* ------------------------------------------------------------------ */
/* Partido                                                              */
/* ------------------------------------------------------------------ */

export function createParty(state, data) {
  const sigla = (data.sigla || 'NZ').toUpperCase().slice(0, 6);
  state.party = {
    name: data.name || 'Partido Nacional',
    sigla,
    color: data.color || '#19e08a',
    symbol: data.symbol || '★',
    ideology: { ...state.ideology },
    members: 1200,
    funds: 20,
    founded: state.turn,
    slogan: data.slogan || 'Por um país novo.',
  };
  state.role = 'lider_partido';
  state.elections.parliament = state.elections.parliament || {};
  state.elections.parliament[sigla] = state.elections.parliament[sigla] || 0;
  applyEffect(state, {
    stats: { influencia: 12, poder: 6, aprovacao: 2 },
    factions: { juventude: 3 },
    log: true, text: `Partido ${sigla} — ${state.party.name} — fundado.`, tone: 'good', icon: '🎩',
  });
  pushLog(state, `Ideologia: ${ideologyLabel(state.party.ideology)}`, 'info', '🧭');
  return state.party;
}

export function ideologyLabel(ideo) {
  const econ = ideo.economico > 25 ? 'direita econômica' : ideo.economico < -25 ? 'esquerda econômica' : 'centro econômico';
  const soc = ideo.social > 30 ? 'autoritário' : ideo.social < -30 ? 'libertário' : 'moderado';
  const nac = ideo.nacionalismo > 40 ? 'nacionalista' : ideo.nacionalismo < -40 ? 'globalista' : '';
  return [nac, econ, soc].filter(Boolean).join(' · ');
}

/* ------------------------------------------------------------------ */
/* Eleições                                                             */
/* ------------------------------------------------------------------ */

/** Ideologia média do eleitorado, puxada pelo estado do país. */
function publicMood(state) {
  return {
    economico: clamp((state.stats.desemprego - 8) * 2 - (state.stats.economia - 50) * 0.6, -80, 80),
    social: clamp(state.stats.criminalidade * 0.8 + state.stats.agitacao * 0.5 - state.stats.liberdades * 0.3, -60, 80),
    nacionalismo: clamp(state.stats.sancoes * 0.6 + (40 - state.stats.reputacao) * 0.3, -60, 80),
    ecologia: clamp(state.stats.meioAmbiente * -0.3 + 20, -40, 60),
    religiao: clamp(state.stats.criminalidade * 0.4, -40, 60),
    tradicao: clamp(state.stats.agitacao * 0.4, -50, 60),
  };
}

function ideologicalFit(a, b) {
  const keys = ['economico', 'social', 'nacionalismo', 'ecologia', 'religiao', 'tradicao'];
  let total = 0;
  for (const k of keys) total += Math.abs((a[k] || 0) - (b[k] || 0));
  return clamp(1 - total / 600, 0.1, 1);
}

export function electionForecast(state) {
  const total = totalSeats(state);
  const mood = publicMood(state);
  const rig = clamp(state.institutions.eleitoral - 20, 0, 80) * 0.55; // 0..44

  const parties = NPC_PARTIES.map((p) => {
    const fit = ideologicalFit(p.ideology, mood);
    return { sigla: p.sigla, name: p.name, score: p.base * fit, npc: true, color: '#8899aa' };
  });

  if (state.party) {
    const fit = ideologicalFit(state.party.ideology, mood);
    const approvalComp = 0.5 + (state.stats.aprovacao / 100) * 0.7;
    const factionComp = 0.6 + (factionAverage(state) / 150);
    const org = clamp(0.8 + (state.party.members || 1000) / 120000, 0.8, 1.35);
    const money = clamp(0.9 + (state.party.funds || 0) / 600, 0.9, 1.3);
    const score = 30 * fit * approvalComp * factionComp * org * money + rig;
    parties.push({ sigla: state.party.sigla, name: state.party.name, score, npc: false, color: state.party.color });
  }

  const sum = parties.reduce((a, p) => a + p.score, 0) || 1;
  let seatsLeft = total;
  parties.sort((a, b) => b.score - a.score);
  parties.forEach((p, i) => {
    p.share = p.score / sum;
    p.seats = Math.floor(p.share * total);
    seatsLeft -= p.seats;
    p.order = i;
  });
  // resto para o maior
  if (seatsLeft > 0) parties[0].seats += seatsLeft;

  return { parties, mood, rig, total };
}

export function runElection(state, opts = {}) {
  const forecast = electionForecast(state);
  const result = { turn: state.turn, date: dateLabel(state), parties: forecast.parties, playerShare: 0, won: false, presidency: null, rigged: !!state.elections.rigged };

  state.elections.parliament = {};
  for (const p of forecast.parties) state.elections.parliament[p.sigla] = p.seats;

  const player = forecast.parties.find((p) => !p.npc);
  result.playerShare = player ? player.share : 0;

  const façade = isRuler(state) && isAuthoritarian(state);
  const canRunForPresident = state.party && ['lider_partido', 'deputado', 'ministro', 'vice', 'presidente', 'ditador', 'monarca'].includes(state.role);

  if (façade) {
    // Eleição de fachada: o resultado é o que você decidir
    const p = forecast.parties.find((x) => !x.npc);
    if (p) {
      const boost = Math.max(0, forecast.total * 0.62 - p.seats);
      state.elections.parliament[p.sigla] = Math.max(state.elections.parliament[p.sigla] || 0, p.seats + boost);
      result.playerShare = (state.elections.parliament[p.sigla] / forecast.total);
    }
    result.presidency = true;
    result.won = true;
    result.facade = true;
    result.threshold = 0;
    state.elections.nextTurn = state.turn + 48;
    applyEffect(state, {
      stats: { legitimidade: 2, agitacao: 2, aprovacao: -1, liberdades: -1 },
      text: 'Eleições realizadas sob seu regime. O resultado, convenientemente, confirmou você no poder.',
      tone: 'warn', icon: '🗳️',
    });
    state.elections.lastResult = result;
    return result;
  }

  if (canRunForPresident) {
    const npcTop = Math.max(...forecast.parties.filter((p) => p.npc).map((p) => p.share), 0);
    const threshold = Math.max(0.3, npcTop);
    result.presidency = !!player && player.share >= threshold && player.share >= npcTop;
    result.threshold = threshold;
    if (result.presidency) {
      const previous = state.role;
      state.role = 'presidente';
      state.elections.nextTurn = state.turn + 48;
      result.won = true;
      applyEffect(state, {
        stats: { legitimidade: 18, poder: 12, aprovacao: 4, influencia: 10 },
        factions: { militares: 2, imprensa: 3 },
        flags: { eleito: true },
        text: `Você venceu a eleição presidencial com ${(player.share * 100).toFixed(1)}% dos votos.`,
        tone: 'epic', icon: '🎖️',
      });
      if (previous === 'presidente') pushLog(state, 'Reeleito para novo mandato.', 'good', '🔁');
    } else {
      if (isRuler(state)) {
        state.role = 'lider_partido';
        applyEffect(state, {
          stats: { legitimidade: -20, poder: -25, aprovacao: -5 },
          text: 'Você perdeu a eleição e entregou o poder.',
          tone: 'bad', icon: '📉',
        });
      } else {
        applyEffect(state, { stats: { legitimidade: -3 }, text: `Eleição perdida: ${(player.share * 100).toFixed(1)}% dos votos.`, tone: 'warn', icon: '🗳️' });
      }
      state.elections.nextTurn = state.turn + 48;
    }
  } else {
    state.elections.nextTurn = state.turn + 48;
    pushLog(state, 'Eleições realizadas. Sem partido e sem cargo, você apenas assistiu.', 'info', '🗳️');
    if (isRuler(state)) {
      state.role = 'cidadao';
      pushLog(state, 'Você deixou o poder no pleito.', 'bad', '🚪');
    }
  }

  // Congresso fechado: parlamento fica congelado
  if (state.flags.congresso_fechado) {
    pushLog(state, 'Congresso permanece fechado: resultado eleitoral ignorado.', 'warn', '🔒');
  }

  state.elections.lastResult = result;
  return result;
}

export function scheduleElection(state) {
  state.elections.nextTurn = state.turn + 48;
}

export function rigElections(state, level) {
  state.institutions.eleitoral = clamp(state.institutions.eleitoral + level * 8, 0, 100);
  state.elections.rigged = level > 0;
  applyEffect(state, {
    stats: { liberdades: -level * 4, legitimidade: -level * 2, corrupcao: level * 2 },
    control: { eleitoral: level * 4 },
    factions: { imprensa: -level * 5, juventude: -level * 3 },
    text: level > 0 ? 'Sistema eleitoral adulterado.' : 'Sistema eleitoral limpo.',
    tone: level > 0 ? 'bad' : 'good', icon: '🧮',
  });
}

/* ------------------------------------------------------------------ */
/* Golpe                                                                */
/* ------------------------------------------------------------------ */

export function coupOdds(state, type) {
  let base = 0;
  base += state.stats.lealdadeMilitar * 0.9;
  base += state.institutions.militar * 0.6;
  base += state.stats.poder * 0.5;
  base += state.factions.militares * 0.4;
  base += state.stats.medo * 0.2;
  base += state.institutions.policia * 0.2;
  base -= state.stats.estabilidade * 0.5;
  base -= state.stats.liberdades * 0.15;
  base -= (state.stats.aprovacao > 55 ? (state.stats.aprovacao - 55) * 1.2 : 0);
  if (type === 'autogolpe') base += 15;
  if (type === 'proclamar') base += 12;
  if (type === 'militar') base -= 8;
  return clamp(base / 2.2, 5, 95);
}

/**
 * Resolve um golpe. type: 'autogolpe' | 'militar' | 'proclamar'
 */
export function resolveCoup(state, type, opts = {}) {
  const chance = coupOdds(state, type);
  const roll = Math.random() * 100;
  const success = roll < chance;
  const result = { chance, roll, success, type, text: '' };

  if (success) {
    const regime = type === 'militar' ? 'junta' : 'autoritarismo';
    state.role = type === 'militar' ? 'ditador' : 'ditador';
    state.regime = regime;
    state.flags.golpe = true;
    state.legacy.coups = (state.legacy.coups || 0) + 1;
    applyEffect(state, {
      stats: {
        liberdades: -30, repressao: 20, medo: 25, legitimidade: -12, estabilidade: -5,
        agitacao: 15, reputacao: -20, poder: 25, aprovacao: -5,
      },
      control: { militar: 18, policia: 10, judiciario: 8, eleitoral: 12 },
      factions: { militares: 12, nacionalistas: 6, imprensa: -20, juventude: -18, trabalhadores: -12 },
      text: type === 'militar'
        ? 'Os tanques cercaram o palácio. Junta militar instalada — com você no comando.'
        : 'Golpe bem-sucedido. Você assume poderes absolutos.',
      tone: 'epic', icon: '⚡',
    });
    pushLog(state, `Golpe consolidado. Chance era ${chance.toFixed(0)}%.`, 'epic', '🎖️');
    result.text = 'Golpe vitorioso.';
    state.over = null;
  } else {
    // falha
    const harsh = roll > chance + 20;
    applyEffect(state, {
      stats: { agitacao: 18, estabilidade: -12, aprovacao: -12, poder: -20, legitimidade: -15, liberdades: -5 },
      factions: { militares: -16, imprensa: -6, juventude: -8 },
      text: 'O golpe fracassou. Oficiais leais cercaram os conspiradores.',
      tone: 'bad', icon: '🚨',
    });
    if (harsh) {
      state.role = 'deposto';
      state.over = {
        type: 'deposto',
        title: 'Deposto',
        text: 'Seu golpe falhou e as Forças Armadas se voltaram contra você. Você foi preso e julgado por traição à pátria.',
        icon: '⛓️',
      };
    } else {
      state.stats.poder = clamp(state.stats.poder, 0, 100);
      pushLog(state, 'Você sobreviveu politicamente, mas ficou sob vigilância.', 'warn', '👁️');
    }
    result.text = 'Golpe fracassou.';
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Purgas                                                               */
/* ------------------------------------------------------------------ */

export const PURGE_TARGETS = [
  { id: 'ministros', label: 'Ministros dissidentes', icon: '🗂️', risk: 1.0, factions: { imprensa: -2 } },
  { id: 'juizes', label: 'Juízes independentes', icon: '⚖️', risk: 1.4, factions: { imprensa: -5, intelectuais: -4 } },
  { id: 'generais', label: 'Generais rivais', icon: '🎖️', risk: 1.9, factions: { militares: -8 } },
  { id: 'jornalistas', label: 'Jornalistas', icon: '📰', risk: 1.6, factions: { imprensa: -12, intelectuais: -6 } },
  { id: 'sindicalistas', label: 'Líderes sindicais', icon: '🔧', risk: 1.3, factions: { trabalhadores: -10 } },
  { id: 'opositores', label: 'Líderes da oposição', icon: '🎩', risk: 1.2, factions: { imprensa: -6, juventude: -4 } },
  { id: 'empresarios', label: 'Empresários incômodos', icon: '🏭', risk: 1.5, factions: { empresariado: -12, financeiro: -8 } },
  { id: 'familia', label: 'Sua própria família', icon: '👪', risk: 2.2, factions: { igreja: -8, imprensa: -10 } },
];

export function resolvePurge(state, targetId, styleId) {
  const target = PURGE_TARGETS.find((t) => t.id === targetId) || PURGE_TARGETS[0];
  const style = PURGE_STYLES.find((s) => s.id === styleId) || PURGE_STYLES[0];
  const risk = clamp(style.risk * target.risk * 100 * (1 - state.stats.poder / 180), 2, 85);
  const success = Math.random() * 100 > risk;

  const effect = JSON.parse(JSON.stringify(style.effect));
  effect.factions = { ...(effect.factions || {}) };
  for (const [k, v] of Object.entries(target.factions || {})) effect.factions[k] = (effect.factions[k] || 0) + v;
  effect.stats = { ...(effect.stats || {}) };
  effect.stats.medo = (effect.stats.medo || 0) + 4;

  if (success) {
    effect.text = `${target.label}: ${style.label.toLowerCase()} — ${style.effect.text}`;
    effect.tone = 'warn';
    effect.icon = target.icon;
    applyEffect(state, effect);
    state.legacy.purges = (state.legacy.purges || 0) + 1;
    state.flags[`purga_${targetId}`] = true;
  } else {
    applyEffect(state, {
      stats: { aprovacao: -6, estabilidade: -5, agitacao: 6, legitimidade: -4, reputacao: -5 },
      factions: { imprensa: -4, militares: -2 },
      text: `A purga de ${target.label.toLowerCase()} vazou para a imprensa. Crise política.`,
      tone: 'bad', icon: '💧',
    });
    if (risk > 60 && Math.random() < 0.3) {
      state.over = {
        type: 'deposto', title: 'Queda',
        text: 'A purga desastrada virou o estopim: o país se levantou e você caiu.',
        icon: '💥',
      };
    }
  }
  return { success, risk };
}

/* ------------------------------------------------------------------ */
/* Discurso                                                             */
/* ------------------------------------------------------------------ */

export function giveSpeech(state, topicId, intensity = 1) {
  const topic = SPEECH_TOPICS.find((t) => t.id === topicId) || SPEECH_TOPICS[0];
  const effect = JSON.parse(JSON.stringify(topic.effect));
  effect.stats = { ...(effect.stats || {}) };
  for (const k of Object.keys(effect.stats)) effect.stats[k] = Math.round(effect.stats[k] * intensity * 10) / 10;
  effect.text = `Discurso sobre "${topic.label}" transmitido em rede nacional.`;
  effect.tone = 'info';
  effect.icon = '🎤';
  applyEffect(state, effect);
  return topic;
}

/* ------------------------------------------------------------------ */
/* Regeneração de poder                                                 */
/* ------------------------------------------------------------------ */

export function regenerateCapital(state) {
  // Poder: vem de legitimidade, controle de instituições e medo
  const controlAvg = Object.values(state.institutions).reduce((a, b) => a + b, 0) / Object.values(state.institutions).length;
  let powerGain = 0.6 + state.stats.legitimidade * 0.035 + controlAvg * 0.022 + state.stats.medo * 0.02;
  if (isRuler(state)) powerGain += 1.2;
  if (state.role === 'ditador' || state.role === 'monarca') powerGain += 1.2;
  if (isAuthoritarian(state)) powerGain += 0.4;
  state.stats.poder = clamp(state.stats.poder + powerGain, 0, 100);

  // Influência: vem de aprovação, partido e reputação
  let infGain = 0.5 + state.stats.aprovacao * 0.02 + state.stats.reputacao * 0.012;
  if (state.party) infGain += 0.4 + (state.party.members || 0) / 40000;
  state.stats.influencia = clamp(state.stats.influencia + infGain, 0, 100);

  // Membros e fundos do partido crescem com aprovação
  if (state.party) {
    const growth = Math.round((state.stats.aprovacao / 100) * 900 - 120 + (state.stats.influencia / 10));
    state.party.members = Math.max(200, Math.round((state.party.members || 1000) * (1 + growth / 12000)));
    state.party.funds = clamp((state.party.funds || 0) + growth / 60, 0, 500);
  }
}

/* ------------------------------------------------------------------ */
/* Leis                                                                 */
/* ------------------------------------------------------------------ */

export function lawRequirement(state, law) {
  const req = law.require || {};
  const reasons = [];
  if (req.roleExact && !req.roleExact.includes(state.role)) reasons.push('Requer cargo específico: ' + req.roleExact.join(' ou '));
  if (req.role) {
    const need = Math.min(...req.role.map((r) => ROLE_ORDER[r] ?? 0));
    if ((ROLE_ORDER[state.role] ?? -1) < need) {
      const labels = req.role.map((r) => ({ presidente: 'Presidente', ditador: 'Ditador', monarca: 'Monarca', ministro: 'Ministro', vice: 'Vice', deputado: 'Deputado', lider_partido: 'Líder de partido' }[r] || r));
      reasons.push(`Requer cargo: ${labels.join(' ou ')}`);
    }
  }
  if (req.regime && !req.regime.includes(state.regime)) {
    reasons.push(`Requer regime: ${req.regime.join(', ')}`);
  }
  if (req.party && !state.party) reasons.push('Requer um partido fundado');
  if (req.stats) for (const [k, v] of Object.entries(req.stats)) if ((state.stats[k] ?? 0) < v) reasons.push(`Requer ${k} ≥ ${v}`);
  if (law.cost) {
    if (law.cost.tesouro && state.stats.tesouro < law.cost.tesouro) reasons.push(`Tesouro insuficiente (N$ ${law.cost.tesouro} bi)`);
    if (law.cost.poder && state.stats.poder < law.cost.poder) reasons.push(`Poder insuficiente (${law.cost.poder})`);
    if (law.cost.influencia && state.stats.influencia < law.cost.influencia) reasons.push(`Influência insuficiente (${law.cost.influencia})`);
  }
  return { ok: reasons.length === 0, reasons };
}

export function enactLaw(state, lawId) {
  const law = LAW_BY_ID[lawId];
  if (!law) return { ok: false, reason: 'Lei desconhecida' };
  if (state.policies[lawId] && !law.repeatable) return { ok: false, reason: 'Lei já está em vigor' };
  const req = lawRequirement(state, law);
  if (!req.ok) return { ok: false, reason: req.reasons[0] };

  if (law.cost?.tesouro) state.stats.tesouro = clamp(state.stats.tesouro - law.cost.tesouro, -5000, 20000);
  if (law.cost?.poder) state.stats.poder = clamp(state.stats.poder - law.cost.poder, 0, 100);
  if (law.cost?.influencia) state.stats.influencia = clamp(state.stats.influencia - law.cost.influencia, 0, 100);

  state.policies[lawId] = { since: state.turn };
  const effect = JSON.parse(JSON.stringify(law.enact || {}));
  effect.text = effect.text || `"${law.name}" sancionada.`;
  effect.tone = effect.tone || 'info';
  effect.icon = effect.icon || law.icon;
  applyEffect(state, effect);
  state.legacy.lawsPassed = (state.legacy.lawsPassed || 0) + 1;

  // alinhamento ideológico do jogador se move com a lei
  if (law.align) {
    for (const [k, v] of Object.entries(law.align)) {
      state.ideology[k] = clamp((state.ideology[k] || 0) + Math.sign(v) * Math.min(6, Math.abs(v) / 8), -100, 100);
    }
  }
  // partido acompanha
  if (state.party) {
    for (const [k, v] of Object.entries(law.align || {})) {
      state.party.ideology[k] = clamp((state.party.ideology[k] || 0) + Math.sign(v) * Math.min(5, Math.abs(v) / 10), -100, 100);
    }
  }
  return { ok: true, law };
}

export function repealLaw(state, lawId) {
  const law = LAW_BY_ID[lawId];
  if (!law) return { ok: false, reason: 'Lei desconhecida' };
  if (!state.policies[lawId]) return { ok: false, reason: 'Lei não está em vigor' };
  state.stats.influencia = clamp(state.stats.influencia - 5, 0, 100);
  delete state.policies[lawId];
  applyEffect(state, {
    text: `"${law.name}" revogada.`,
    tone: 'warn', icon: '↩️',
    stats: { estabilidade: -1 },
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Executar ação                                                        */
/* ------------------------------------------------------------------ */

export function performAction(state, actionId) {
  const action = ACTION_BY_ID[actionId];
  if (!action) return { ok: false, reason: 'Ação desconhecida' };
  if (action.dialog) return { ok: false, reason: 'Esta ação requer uma decisão', dialog: true };
  const cd = cooldownLeft(state, action);
  if (cd > 0) return { ok: false, reason: `Disponível em ${cd} mês(es)` };
  if (!checkRequire(state, action)) return { ok: false, reason: 'Requisitos não atendidos' };
  const afford = canAfford(state, action);
  if (!afford.ok) return { ok: false, reason: afford.reason };

  const cost = actionCost(state, action);
  if (cost.tesouro) state.stats.tesouro = clamp(state.stats.tesouro - cost.tesouro, -5000, 20000);
  if (cost.poder) state.stats.poder = clamp(state.stats.poder - cost.poder, 0, 100);
  if (cost.influencia) state.stats.influencia = clamp(state.stats.influencia - cost.influencia, 0, 100);

  state.cooldowns[actionId] = state.turn;
  const effect = JSON.parse(JSON.stringify(action.effect || {}));
  effect.icon = effect.icon || action.icon;
  applyEffect(state, effect);
  if (effect.legacy) for (const [k, v] of Object.entries(effect.legacy)) state.legacy[k] = (state.legacy[k] || 0) + v;
  return { ok: true, action };
}
