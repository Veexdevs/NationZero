/*
 * Simulação mensal de NationZero.
 */

import {
  clamp, applyEffect, pushLog, dateLabel, factionAverage, isRuler, isAuthoritarian,
  monthlyRevenue, monthlySpending, totalSeats,
} from './state.js';
import { LAWS, LAW_BY_ID } from '../data/laws.js';
import { EVENTS, EVENT_BY_ID } from '../data/events.js';
import { regenerateCapital, runElection, checkRequire, electionForecast, resolveCoup, coupOdds } from './politics.js';
import { resolveWarTick, diplomaticIncident, ensureRelations, countryById } from './world.js';
import { COUNTRIES } from '../data/world.js';

const drift = (current, target, rate) => current + (target - current) * rate;

/* ------------------------------------------------------------------ */
/* Efeito de leis em vigor                                              */
/* ------------------------------------------------------------------ */

export function applyLawTicks(state) {
  const totals = { stats: {}, factions: {}, control: {}, treasury: 0 };
  for (const id of Object.keys(state.policies)) {
    const law = LAW_BY_ID[id];
    if (!law?.tick) continue;
    const t = law.tick;
    if (t.stats) for (const [k, v] of Object.entries(t.stats)) totals.stats[k] = (totals.stats[k] || 0) + v;
    if (t.factions) for (const [k, v] of Object.entries(t.factions)) totals.factions[k] = (totals.factions[k] || 0) + v;
    if (t.control) for (const [k, v] of Object.entries(t.control)) totals.control[k] = (totals.control[k] || 0) + v;
    if (t.treasury) totals.treasury += t.treasury;
  }
  return totals;
}

/* ------------------------------------------------------------------ */
/* Orçamento                                                            */
/* ------------------------------------------------------------------ */

export function applyBudget(state) {
  const revenue = monthlyRevenue(state);
  const spending = monthlySpending(state);
  const balance = revenue - spending;
  state.stats.tesouro = clamp(state.stats.tesouro + balance, -5000, 20000);

  if (balance < 0) {
    state.stats.divida = clamp(state.stats.divida + Math.abs(balance) / 35, 0, 400);
    if (state.stats.tesouro < 0) {
      state.stats.economia = clamp(state.stats.economia - 0.15, 0, 100);
      state.stats.inflacao = clamp(state.stats.inflacao + 0.08, 0, 300);
    }
  } else {
    state.stats.divida = clamp(state.stats.divida - balance / 60, 0, 400);
  }

  // Juros da dívida
  const interest = state.stats.divida * 0.09;
  state.stats.tesouro = clamp(state.stats.tesouro - interest, -5000, 20000);

  return { revenue, spending, balance, interest };
}

/* ------------------------------------------------------------------ */
/* Serviços públicos e carga tributária                                 */
/* ------------------------------------------------------------------ */

export function applyServices(state) {
  const s = state.spending;
  const targets = {
    saude: 25 + s.saude * 1.9,
    educacao: 25 + s.educacao * 1.9,
    infraestrutura: 28 + s.infraestrutura * 2.2,
    tecnologia: 22 + s.ciencia * 3.0 + state.stats.educacao * 0.15,
    meioAmbiente: 60 - s.infraestrutura * 1.1 - s.militar * 0.4 + s.cultura * 1.2,
  };
  state.stats.saude = drift(state.stats.saude, clamp(targets.saude, 10, 95), 0.06);
  state.stats.educacao = drift(state.stats.educacao, clamp(targets.educacao, 10, 95), 0.05);
  state.stats.infraestrutura = drift(state.stats.infraestrutura, clamp(targets.infraestrutura, 10, 95), 0.05);
  state.stats.tecnologia = drift(state.stats.tecnologia, clamp(targets.tecnologia, 10, 95), 0.045);
  state.stats.meioAmbiente = drift(state.stats.meioAmbiente, clamp(targets.meioAmbiente, 10, 95), 0.04);

  // Criminalidade
  const crimeTarget = 55 - state.stats.educacao * 0.2 - state.stats.saude * 0.1
    + state.stats.desemprego * 0.9 + (state.stats.repressao > 30 ? -8 : 0)
    - (state.spending.seguranca - 8) * 0.8;
  state.stats.criminalidade = drift(state.stats.criminalidade, clamp(crimeTarget, 3, 95), 0.06);
}

/* ------------------------------------------------------------------ */
/* Humor social                                                         */
/* ------------------------------------------------------------------ */

export function applySociety(state) {
  const services = (state.stats.saude + state.stats.educacao + state.stats.infraestrutura + state.stats.tecnologia + state.stats.meioAmbiente) / 5;
  const factionAvg = factionAverage(state);

  // Aprovação
  const approvalTarget =
    12 + factionAvg * 0.5 + services * 0.15 + (state.stats.economia - 45) * 0.15 +
    (state.stats.reputacao - 50) * 0.05 - state.stats.agitacao * 0.18 -
    state.stats.corrupcao * 0.1 + (isRuler(state) ? 5 : 0) + (state.stats.medo * 0.06);
  state.stats.aprovacao = clamp(drift(state.stats.aprovacao, approvalTarget, 0.16), 0, 100);

  // Estabilidade
  const stabTarget =
    40 + state.stats.legitimidade * 0.24 + state.stats.lealdadeMilitar * 0.14 +
    (state.stats.economia - 50) * 0.14 - state.stats.agitacao * 0.3 -
    state.stats.criminalidade * 0.1 + (isAuthoritarian(state) ? 6 : 0) + services * 0.06;
  state.stats.estabilidade = clamp(drift(state.stats.estabilidade, stabTarget, 0.16), 0, 100);

  // Agitação
  const agitTarget =
    12 + (100 - state.stats.aprovacao) * 0.3 + state.stats.inflacao * 1.5 +
    state.stats.desemprego * 0.9 + state.stats.repressao * 0.35 -
    state.stats.liberdades * 0.18 - (state.stats.servicosProxy || services) * 0.05;
  state.stats.agitacao = clamp(drift(state.stats.agitacao, clamp(agitTarget, 0, 100), 0.18), 0, 100);

  // Corrupção
  const corrTarget = 34 + (100 - state.stats.liberdades) * 0.18 - state.stats.educacao * 0.12 + (state.stats.poder * 0.08);
  state.stats.corrupcao = clamp(drift(state.stats.corrupcao, clamp(corrTarget, 3, 95), 0.05), 0, 100);

  // Repressão
  if (!state.flags.lei_marcial_ativa) {
    state.stats.repressao = clamp(drift(state.stats.repressao, isAuthoritarian(state) ? state.stats.repressao : 4, 0.02), 0, 100);
  }

  // Liberdades: empurradas pelo regime e pelas leis
  const libertyTarget = isAuthoritarian(state) ? 22 : state.regime === 'semidemocracia' ? 48 : 66;
  const libertyLawBonus = countLaws(state, ['liberdade_imprensa', 'casamento_igualitario', 'internet_livre', 'iberdade_religiosa', 'liberdade_religiosa']) * 4;
  const libertyLawPenalty = countLaws(state, ['censura', 'vigilancia_massa', 'lei_moral', 'partido_unico_lei', 'estado_emergencia', 'controle_internet']) * 6;
  state.stats.liberdades = clamp(drift(state.stats.liberdades, clamp(libertyTarget + libertyLawBonus - libertyLawPenalty, 0, 100), 0.05), 0, 100);

  // Legitimidade
  const legitTarget = isAuthoritarian(state)
    ? 20 + state.stats.medo * 0.3 + state.stats.aprovacao * 0.25
    : 35 + state.stats.aprovacao * 0.35 + state.stats.reputacao * 0.1;
  state.stats.legitimidade = clamp(drift(state.stats.legitimidade, clamp(legitTarget, 0, 100), 0.07), 0, 100);

  // Medo decai lentamente
  state.stats.medo = clamp(state.stats.medo - 0.35 + state.stats.repressao * 0.02, 0, 100);

  // População cresce com saúde e economia
  const popGrowth = 0.03 + (state.stats.saude - 40) * 0.0015 + (state.stats.economia - 40) * 0.0008;
  state.stats.populacao = clamp(state.stats.populacao + popGrowth, 5, 2000);
}

function countLaws(state, ids) {
  return ids.filter((id) => state.policies[id]).length;
}

/* ------------------------------------------------------------------ */
/* Economia                                                             */
/* ------------------------------------------------------------------ */

export function applyEconomy(state) {
  const taxBurden = (state.taxes.renda + state.taxes.empresas + state.taxes.consumo + state.taxes.patrimonio) / 4;
  const stimulus = state.spending.infraestrutura + state.spending.ciencia + state.spending.educacao;

  let growth =
    1.2 + (state.stats.infraestrutura - 50) * 0.035 + (state.stats.educacao - 50) * 0.03 +
    (state.stats.tecnologia - 50) * 0.03 - (state.stats.corrupcao - 40) * 0.03 -
    (state.stats.inflacao - 5) * 0.16 - Math.max(0, taxBurden - 30) * 0.05 +
    Math.max(0, state.stats.reputacao - 50) * 0.02 - state.stats.sancoes * 0.06 +
    (state.stats.estabilidade - 50) * 0.02 - state.wars.length * 0.8 +
    (state.institutions.midia > 60 ? -0.1 : 0.05);

  state.stats.crescimento = clamp(growth, -25, 18);
  state.stats.economia = clamp(state.stats.economia + state.stats.crescimento * 0.14, 0, 100);

  // Inflação
  const demandPressure = Math.max(0, state.spending.infraestrutura + state.spending.saude) * 0.004;
  const deficit = monthlySpending(state) - monthlyRevenue(state);
  let infl = state.stats.inflacao;
  infl += (deficit > 0 ? deficit * 0.012 : deficit * 0.004);
  infl += demandPressure;
  infl += state.stats.crescimento * 0.05;
  infl -= (state.stats.desemprego - 9) * 0.03;
  infl += (state.policies.impressao_dinheiro ? 0.22 : 0);
  infl += state.stats.sancoes * 0.02;
  // Convergência suave para ~4% quando não há pressão
  infl += (4.2 - infl) * 0.06;
  state.stats.inflacao = clamp(infl, 0, 300);

  // Desemprego
  const unempTarget = clamp(5.5 - state.stats.crescimento * 0.45 + (state.stats.inflacao > 30 ? 2.5 : 0), 2, 55);
  state.stats.desemprego = clamp(drift(state.stats.desemprego, unempTarget, 0.09), 1, 60);
}

/* ------------------------------------------------------------------ */
/* Facções                                                              */
/* ------------------------------------------------------------------ */

export function applyFactions(state) {
  const ideo = state.ideology;
  const s = state.stats;
  const mood = {
    empresariado: (ideo.economico * 0.05) + (s.economia - 50) * 0.12 - Math.max(0, (state.taxes.empresas - 25)) * 0.4 + (s.corrupcao > 60 ? 2 : 0),
    financeiro: (ideo.economico * 0.06) + (s.inflacao < 8 ? 1.5 : -1) + (state.policies.banco_central_independente ? 2 : 0) - (state.policies.controle_capitais ? 2 : 0) + (s.divida > 120 ? -1.5 : 0),
    trabalhadores: (ideo.economico * -0.05) + (s.desemprego < 9 ? 1 : -1.5) + (state.spending.saude + state.spending.educacao - 30) * 0.12 + (state.policies.direito_greve ? 2 : 0),
    camponeses: (state.spending.infraestrutura - 10) * 0.12 + (state.policies.reforma_agraria ? 2 : 0) - (state.policies.exploracao_total ? 1 : 0) + (s.inflacao > 20 ? -1.5 : 0),
    militares: (state.spending.militar - 10) * 0.35 + (ideo.nacionalismo * 0.03) + (s.poderMilitar - 45) * 0.06 + (state.policies.lei_marcial ? 2 : -0.5) + (state.policies.milicia_paralela ? -1.5 : 0),
    igreja: (ideo.religiao * 0.05) + (ideo.tradicao * 0.03) - (state.policies.casamento_igualitario ? 2 : 0),
    imprensa: (s.liberdades - 50) * 0.14 - (s.repressao * 0.08) + (ideo.social * -0.03),
    juventude: (ideo.tradicao * -0.04) + (s.desemprego - 10) * -0.2 + (s.liberdades - 50) * 0.06,
    intelectuais: (state.spending.ciencia - 5) * 0.25 + (s.educacao - 50) * 0.12 + (ideo.social * -0.03),
    minorias: (s.liberdades - 50) * 0.16 + (ideo.tradicao * -0.05) + (state.policies.cotas ? 1.5 : 0),
    nacionalistas: (ideo.nacionalismo * 0.05) + (s.reputacao < 50 ? 0.8 : -0.4) + (s.poderMilitar - 45) * 0.05,
    policia: (state.spending.seguranca - 8) * 0.3 + (s.criminalidade - 40) * -0.12 + (s.repressao * 0.05),
  };

  for (const key of Object.keys(state.factions)) {
    const delta = mood[key] ?? 0;
    state.factions[key] = clamp(state.factions[key] + delta * 0.32, 0, 100);
    // puxa suavemente para o neutro
    state.factions[key] = drift(state.factions[key], 50, 0.02);
  }
}

/* ------------------------------------------------------------------ */
/* Instituições                                                         */
/* ------------------------------------------------------------------ */

export function applyInstitutions(state) {
  const total = totalSeats(state);
  const p = state.elections.parliament || {};
  const playerSeatsCount = state.party ? (p[state.party.sigla] || 0) : 0;
  const majority = playerSeatsCount > total / 2;

  if (!state.flags.congresso_fechado) {
    for (const k of Object.keys(state.institutions)) {
      const pull = k === 'midia' ? 22 : 20;
      const controlled = isAuthoritarian(state) ? 0.02 : 0.05;
      state.institutions[k] = drift(state.institutions[k], pull, controlled);
    }
    if (majority) state.institutions.eleitoral = drift(state.institutions.eleitoral, 25, 0.03);
  } else {
    // sem congresso, controle cresce sozinho
    state.institutions.eleitoral = clamp(state.institutions.eleitoral + 0.4, 0, 100);
  }

  // Poder militar decai sem investimento
  const milTarget = 20 + state.spending.militar * 2.4 + (state.policies.programa_atomico ? 8 : 0);
  state.stats.poderMilitar = drift(state.stats.poderMilitar, clamp(milTarget, 5, 100), 0.045);

  // Lealdade militar: cai se você é muito esquerdista/libertário sem pagar bem
  const loyaltyTarget = 45 + (state.spending.militar - 10) * 1.8 + (state.ideology.nacionalismo * 0.08) + (state.stats.medo * 0.05) - (state.ideology.social < -30 ? 8 : 0);
  state.stats.lealdadeMilitar = drift(state.stats.lealdadeMilitar, clamp(loyaltyTarget, 0, 100), 0.06);
}

/* ------------------------------------------------------------------ */
/* Mundo                                                                */
/* ------------------------------------------------------------------ */

export function applyWorld(state) {
  ensureRelations(state);
  for (const c of COUNTRIES) {
    const rel = state.relations[c.id];
    if (!rel) continue;
    const align = ideologicalAlignment(state.ideology, c.align || {});
    const base = 45 + align * 18 + (state.stats.reputacao - 50) * 0.3 - state.stats.sancoes * 0.2 - state.stats.repressao * 0.15;
    rel.relation = clamp(drift(rel.relation, clamp(base, 5, 95), 0.03), 0, 100);
    if (rel.treaties?.alianca) rel.relation = clamp(rel.relation + 0.1, 0, 100);
  }

  // Sanções caem com reputação e diplomacia
  if (state.stats.sancoes > 0) {
    const decay = 0.15 + (state.stats.reputacao > 55 ? 0.25 : 0) + (state.institutions.midia > 40 ? 0.1 : 0);
    state.stats.sancoes = clamp(state.stats.sancoes - decay, 0, 100);
  }

  // Reputação segue liberdades, sanções e tratados
  const treaties = Object.values(state.relations).reduce((a, r) => a + Object.keys(r.treaties || {}).length, 0);
  const repTarget = 40 + state.stats.liberdades * 0.25 + treaties * 1.5 - state.stats.sancoes * 0.5 - state.stats.repressao * 0.25 + (state.stats.arsenalNuclear > 0 ? -6 : 0);
  state.stats.reputacao = clamp(drift(state.stats.reputacao, clamp(repTarget, 0, 100), 0.05), 0, 100);
}

function ideologicalAlignment(a, b) {
  const keys = ['economico', 'social', 'nacionalismo'];
  let total = 0;
  let n = 0;
  for (const k of keys) {
    if (b[k] === undefined) continue;
    total += Math.abs((a[k] || 0) - b[k]) / 100;
    n++;
  }
  if (!n) return 0;
  return 1 - total / n;
}

/* ------------------------------------------------------------------ */
/* Eventos                                                              */
/* ------------------------------------------------------------------ */

export function eventEligible(state, event) {
  if (event.require) {
    if (event.require.role && !event.require.role.includes(state.role)) {
      const order = { cidadao: 0, ativista: 1, lider_partido: 2, deputado: 3, ministro: 4, vice: 5, presidente: 6, ditador: 7, monarca: 7 };
      const need = Math.min(...event.require.role.map((r) => order[r] ?? 0));
      if ((order[state.role] ?? 0) < need) return false;
    }
    if (event.require.stats) for (const [k, v] of Object.entries(event.require.stats)) if ((state.stats[k] ?? 0) < v) return false;
    if (event.require.statsMax) for (const [k, v] of Object.entries(event.require.statsMax)) if ((state.stats[k] ?? 0) > v) return false;
    if (event.require.regime && !event.require.regime.includes(state.regime)) return false;
    if (event.require.flags) for (const [k, v] of Object.entries(event.require.flags)) if ((state.flags[k] ?? false) !== v) return false;
  }
  if (event.once && state.seenEvents[event.id]) return false;
  const lastSeen = state.seenEvents[event.id];
  if (lastSeen && state.turn - lastSeen < 18) return false;
  return true;
}

export function rollEvent(state, chance = 0.55) {
  if (state.pendingEvents.length) return null;
  if (Math.random() > chance) return null;
  const pool = EVENTS.filter((e) => eventEligible(state, e));
  if (!pool.length) return null;
  const totalWeight = pool.reduce((a, e) => a + (e.weight || 5), 0);
  let r = Math.random() * totalWeight;
  for (const e of pool) {
    r -= e.weight || 5;
    if (r <= 0) {
      state.seenEvents[e.id] = state.turn;
      return e;
    }
  }
  return pool[pool.length - 1];
}

export function resolveEventChoice(state, eventId, choiceIndex) {
  const event = EVENT_BY_ID[eventId];
  if (!event) return null;
  const choice = event.choices[choiceIndex];
  if (!choice) return null;
  const effect = JSON.parse(JSON.stringify(choice.effect || {}));
  if (!effect.text) effect.text = `${event.title}: ${choice.label}.`;
  effect.tone = effect.tone || 'info';
  effect.icon = choice.icon || event.icon;
  applyEffect(state, effect);
  state.pendingEvents = state.pendingEvents.filter((e) => e !== eventId);

  // Efeitos especiais
  if (choice.special === 'impeachment_risk') {
    if (state.stats.agitacao > 55 || state.stats.aprovacao < 28) {
      state.over = {
        type: 'impeachment', title: 'Impeachment',
        text: 'O parlamento aprovou o impeachment. Você foi removido do cargo e perdeu os direitos políticos por oito anos.',
        icon: '⚖️',
      };
    } else {
      pushLog(state, 'O pedido de impeachment foi arquivado por falta de votos.', 'good', '⚖️');
    }
  }
  if (choice.special === 'coup_risk') {
    if (Math.random() < 0.45) {
      const res = resolveCoup(state, 'militar');
      pushLog(state, res.success ? 'Os conspiradores agiram primeiro — e você estava pronto.' : 'Os conspiradores agiram e seu governo caiu.', res.success ? 'epic' : 'bad', '🚨');
    } else {
      pushLog(state, 'A conspiração se dissolveu sem ação.', 'good', '🕊️');
    }
  }
  if (choice.special === 'coverup') {
    pushLog(state, 'Os diplomatas aceitaram o "incentivo". Processo engavetado.', 'warn', '💼');
  }
  return effect;
}

/* ------------------------------------------------------------------ */
/* Game over                                                            */
/* ------------------------------------------------------------------ */

export function checkGameOver(state) {
  if (state.over) return state.over;

  if (state.stats.estabilidade <= 3 && state.stats.agitacao > 85) {
    state.over = {
      type: 'revolucao', title: 'Revolução',
      text: 'O Estado perdeu o controle. Multidões tomaram os prédios públicos e o governo foi dissolvido por um levante popular.',
      icon: '🔥',
    };
  } else if (state.stats.inflacao > 180 && state.stats.aprovacao < 25) {
    state.over = {
      type: 'hiperinflacao', title: 'Hiperinflação',
      text: 'O dinheiro perdeu o valor. A economia virou escambo, o governo caiu e você fugiu.',
      icon: '💸',
    };
  } else if (state.stats.economia < 6 && state.stats.desemprego > 42) {
    state.over = {
      type: 'colapso', title: 'Colapso econômico',
      text: 'A economia parou completamente. O país foi dividido entre credores e senhores da guerra locais.',
      icon: '💀',
    };
  } else if (state.stats.aprovacao < 4 && state.stats.agitacao > 80) {
    state.over = {
      type: 'renuncia', title: 'Renúncia forçada',
      text: 'Sem apoio popular e sem saída institucional, você renunciou sob pressão.',
      icon: '🚪',
    };
  } else if (isRuler(state) && isAuthoritarian(state) && state.stats.lealdadeMilitar < 8 && state.factions.militares < 15) {
    state.over = {
      type: 'golpe', title: 'Contragolpe',
      text: 'Os militares que você julgava leais cercaram o palácio. Você foi deposto em questão de horas.',
      icon: '🪖',
    };
  }
  return state.over;
}

/* ------------------------------------------------------------------ */
/* Tick principal                                                       */
/* ------------------------------------------------------------------ */

export function advanceTurn(state, opts = {}) {
  const summary = { turn: state.turn, events: [], notes: [] };

  state.turn += 1;
  state.legacy.daysInPower = (state.legacy.daysInPower || 0) + 30;

  const budget = applyBudget(state);
  applyServices(state);
  const lawTicks = applyLawTicks(state);
  if (lawTicks.treasury) state.stats.tesouro = clamp(state.stats.tesouro + lawTicks.treasury, -5000, 20000);
  if (Object.keys(lawTicks.stats).length || Object.keys(lawTicks.factions).length || Object.keys(lawTicks.control).length) {
    applyEffect(state, { stats: lawTicks.stats, factions: lawTicks.factions, control: lawTicks.control, log: false });
  }

  applyEconomy(state);
  applySociety(state);
  applyFactions(state);
  applyInstitutions(state);
  applyWorld(state);
  regenerateCapital(state);

  // Guerra
  for (const war of [...state.wars]) {
    const outcome = resolveWarTick(state, war);
    if (outcome) summary.notes.push(outcome.text);
  }

  // Incidentes diplomáticos
  if (Math.random() < 0.18) {
    const inc = diplomaticIncident(state);
    if (inc) summary.notes.push(`Incidente com ${inc}`);
  }

  // Eleições
  if (!opts.skipElection && state.turn >= (state.elections.nextTurn || 48) && !state.over) {
    summary.election = runElection(state);
  }

  // Evento
  const ev = rollEvent(state, 0.5);
  if (ev) {
    state.pendingEvents.push(ev.id);
    summary.events.push(ev.id);
  }

  checkGameOver(state);
  summary.budget = budget;
  summary.date = dateLabel(state);
  return summary;
}

/* ------------------------------------------------------------------ */
/* Previsões para a UI                                                  */
/* ------------------------------------------------------------------ */

export function forecast(state) {
  const f = electionForecast(state);
  return {
    election: f,
    nextElectionIn: Math.max(0, (state.elections.nextTurn || 48) - state.turn),
    coupChance: coupOdds(state, 'militar'),
    budget: { revenue: monthlyRevenue(state), spending: monthlySpending(state) },
    atWar: state.wars.length > 0,
  };
}
