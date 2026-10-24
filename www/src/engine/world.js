/*
 * Relações internacionais, diplomacia, espionagem e guerra.
 */

import { clamp, applyEffect, pushLog } from './state.js';
import { COUNTRIES, TREATIES } from '../data/world.js';

export function ensureRelations(state) {
  if (!state.relations) state.relations = {};
  for (const c of COUNTRIES) {
    if (!state.relations[c.id]) {
      state.relations[c.id] = { relation: c.relation, treaties: {}, threat: 0, spies: 0 };
    }
  }
  return state.relations;
}

export function countryById(id) {
  return COUNTRIES.find((c) => c.id === id);
}

export function relationLabel(v) {
  if (v >= 85) return { label: 'Aliado incondicional', tone: 'good' };
  if (v >= 70) return { label: 'Aliado', tone: 'good' };
  if (v >= 55) return { label: 'Amigável', tone: 'good' };
  if (v >= 45) return { label: 'Neutro', tone: 'info' };
  if (v >= 30) return { label: 'Tenso', tone: 'warn' };
  if (v >= 15) return { label: 'Hostil', tone: 'bad' };
  return { label: 'Inimigo declarado', tone: 'bad' };
}

function changeRelation(state, id, delta) {
  ensureRelations(state);
  const r = state.relations[id];
  r.relation = clamp(r.relation + delta, 0, 100);
  return r.relation;
}

/* ------------------------------------------------------------------ */
/* Diplomacia                                                           */
/* ------------------------------------------------------------------ */

export function signTreaty(state, countryId, treatyId) {
  const c = countryById(countryId);
  const t = TREATIES[treatyId];
  if (!c || !t) return { ok: false, reason: 'Tratado inválido' };
  ensureRelations(state);
  const rel = state.relations[countryId];
  if (treatyId in (rel.treaties || {})) return { ok: false, reason: 'Tratado já assinado' };
  if (rel.relation < 40) return { ok: false, reason: `${c.name} não negocia com você (relação ${rel.relation})` };
  if (state.stats.influencia < 10) return { ok: false, reason: 'Influência insuficiente' };

  rel.treaties[treatyId] = state.turn;
  state.stats.influencia = clamp(state.stats.influencia - 10, 0, 100);

  const effects = {
    comercio: { stats: { economia: 1.5, reputacao: 3 }, factions: { empresariado: 6, camponeses: -2 }, text: `Acordo comercial assinado com ${c.name}.` },
    alianca: { stats: { reputacao: 4, estabilidade: 2, poderMilitar: 2 }, factions: { militares: 4 }, text: `Aliança militar firmada com ${c.name}.` },
    extradicao: { stats: { medo: 4, liberdades: -3 }, factions: { imprensa: -3 }, text: `Tratado de extradição com ${c.name}.` },
    energia: { stats: { economia: 2, inflacao: -0.6 }, text: `Contrato de energia fechado com ${c.name}.` },
    nuclear: { stats: { tecnologia: 3 }, flags: { programa_nuclear: true }, text: `Cooperação nuclear com ${c.name} iniciada.` },
    vigilancia: { stats: { repressao: 4, liberdades: -4 }, control: { policia: 4 }, text: `Pacto de vigilância com ${c.name} ativado.` },
  };
  const e = effects[treatyId] || { text: `Tratado com ${c.name}.` };
  changeRelation(state, countryId, 8);
  applyEffect(state, { ...e, tone: 'good', icon: t.icon });
  return { ok: true };
}

export function breakTreaty(state, countryId, treatyId) {
  const c = countryById(countryId);
  ensureRelations(state);
  const rel = state.relations[countryId];
  if (!(treatyId in (rel.treaties || {}))) return { ok: false, reason: 'Tratado inexistente' };
  delete rel.treaties[treatyId];
  changeRelation(state, countryId, -18);
  applyEffect(state, { stats: { reputacao: -3 }, text: `Você rompeu o tratado de ${TREATIES[treatyId]?.label} com ${c.name}.`, tone: 'bad', icon: '✂️' });
  return { ok: true };
}

export function giftCountry(state, countryId, amount) {
  const c = countryById(countryId);
  if (state.stats.tesouro < amount) return { ok: false, reason: 'Tesouro insuficiente' };
  state.stats.tesouro -= amount;
  const gain = clamp(amount / 8, 1, 20);
  changeRelation(state, countryId, gain);
  applyEffect(state, {
    stats: { reputacao: Math.min(4, amount / 40) },
    text: `Você enviou N$ ${amount} bi em ajuda a ${c.name}. Relação +${gain.toFixed(0)}.`,
    tone: 'info', icon: '💵',
  });
  return { ok: true };
}

export function sanctionCountry(state, countryId) {
  const c = countryById(countryId);
  ensureRelations(state);
  const rel = state.relations[countryId];
  if (rel.treaties.sancoes) return { ok: false, reason: 'Já sancionado' };
  rel.treaties.sancoes = state.turn;
  changeRelation(state, countryId, -25);
  applyEffect(state, {
    stats: { economia: -0.5, precos: 0 }, treasury: 4,
    text: `Sanções econômicas impostas a ${c.name}.`,
    tone: 'warn', icon: '🚫',
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Espionagem                                                           */
/* ------------------------------------------------------------------ */

export function resolveEspionage(state, actionId, countryId) {
  const c = countryById(countryId);
  ensureRelations(state);
  const rel = state.relations[countryId];
  if (!c) return { ok: false, reason: 'Alvo inválido' };

  const skill = clamp(
    0.35 + state.stats.tecnologia / 220 + state.stats.poder / 300 + state.institutions.militar / 400 - c.power / 350,
    0.1, 0.92
  );
  const roll = Math.random();
  const success = roll < skill;
  const caught = !success && Math.random() < 0.45;

  switch (actionId) {
    case 'espionar_pais': {
      if (success) {
        rel.spies = (rel.spies || 0) + 1;
        applyEffect(state, {
          stats: { influencia: 4, tecnologia: 1 },
          text: `Espionagem bem-sucedida em ${c.name}: você mapeou as vulnerabilidades do país.`,
          tone: 'good', icon: '🕵️',
        });
        return { ok: true, success: true, intel: intelFor(c, rel) };
      }
      return failedIntel(state, c, caught, 'espionagem');
    }
    case 'sabotar': {
      if (success) {
        changeRelation(state, countryId, -10);
        applyEffect(state, {
          stats: { economia: 0.8, reputacao: -2 },
          text: `Sabotagem econômica em ${c.name} funcionou. A economia deles cambaleia.`,
          tone: 'good', icon: '💣',
        });
        return { ok: true, success: true };
      }
      return failedIntel(state, c, caught, 'sabotagem');
    }
    case 'desinformar': {
      if (success) {
        changeRelation(state, countryId, -6);
        applyEffect(state, {
          stats: { aprovacao: 1, reputacao: -1, medo: 2 },
          factions: { imprensa: -1 },
          text: `Operação de desinformação contra ${c.name} funcionou.`,
          tone: 'info', icon: '📡',
        });
        return { ok: true, success: true };
      }
      return failedIntel(state, c, caught, 'desinformação');
    }
    case 'comprar_aliado': {
      const amount = 60;
      if (state.stats.tesouro < amount) return { ok: false, reason: 'Tesouro insuficiente' };
      state.stats.tesouro -= amount;
      if (success || !caught) {
        changeRelation(state, countryId, 22);
        applyEffect(state, { stats: { reputacao: 2, influencia: 4 }, text: `${c.name} aceitou seu "empréstimo generoso". Relação +22.`, tone: 'good', icon: '💵' });
        return { ok: true, success: true };
      }
      return failedIntel(state, c, caught, 'compra de aliado');
    }
    case 'boicote': {
      changeRelation(state, countryId, -15);
      applyEffect(state, {
        stats: { economia: -0.8, inflacao: 0.2, aprovacao: 2 },
        factions: { nacionalistas: 4, empresariado: -3 },
        text: `Boicote comercial contra ${c.name} em vigor.`,
        tone: 'warn', icon: '🚫',
      });
      return { ok: true, success: true };
    }
    case 'exportar_revolucao': {
      if (success) {
        changeRelation(state, countryId, -20);
        applyEffect(state, {
          stats: { influencia: 6, reputacao: -5, poder: 4 },
          factions: { nacionalistas: 4, imprensa: -3 },
          text: `Você exportou a revolução: grupos alinhados tomaram o poder em ${c.name}.`,
          tone: 'epic', icon: '🚩',
        });
        state.flags.exportou_revolucao = true;
        if (state.relations[countryId]) state.relations[countryId].relation = clamp(state.relations[countryId].relation + 5, 0, 100);
        return { ok: true, success: true };
      }
      return failedIntel(state, c, caught, 'exportação da revolução');
    }
    case 'assassinar': {
      if (success) {
        changeRelation(state, countryId, -40);
        applyEffect(state, {
          stats: { reputacao: -14, sancoes: 10, medo: 8, poder: 6 },
          factions: { imprensa: -8, militares: 5, nacionalistas: 5 },
          flags: { assassino: true },
          text: `O líder de ${c.name} foi eliminado. O mundo aponta o dedo para você.`,
          tone: 'bad', icon: '🎯',
        });
        return { ok: true, success: true };
      }
      return failedIntel(state, c, true, 'assassinato');
    }
    case 'golpe_externo': {
      if (success) {
        changeRelation(state, countryId, 10);
        applyEffect(state, {
          stats: { influencia: 10, reputacao: -8, poder: 8 },
          text: `Golpe orquestrado com sucesso em ${c.name}. Novo governo é seu aliado.`,
          tone: 'epic', icon: '🌍',
        });
        return { ok: true, success: true };
      }
      return failedIntel(state, c, true, 'golpe');
    }
    default:
      return { ok: false, reason: 'Ação desconhecida' };
  }
}

function failedIntel(state, c, caught, what) {
  if (caught) {
    applyEffect(state, {
      stats: { reputacao: -6, sancoes: 3 },
      text: `Sua operação de ${what} em ${c.name} foi descoberta. Crise diplomática.`,
      tone: 'bad', icon: '🚨',
    });
    changeRelation(state, c.id, -15);
  } else {
    applyEffect(state, {
      stats: { influencia: -1 },
      text: `A operação de ${what} em ${c.name} falhou, mas ninguém soube.`,
      tone: 'warn', icon: '💨',
    });
  }
  return { ok: true, success: false, caught };
}

function intelFor(c, rel) {
  return [
    `Poder militar estimado: ${c.power}`,
    `Economia: ${c.economy}`,
    `Relação atual: ${rel.relation}`,
    `Tratados: ${Object.keys(rel.treaties || {}).length}`,
    c.trait,
  ];
}

/* ------------------------------------------------------------------ */
/* Guerra                                                               */
/* ------------------------------------------------------------------ */

export function declareWar(state, countryId) {
  const c = countryById(countryId);
  if (!c) return { ok: false, reason: 'País inválido' };
  if (state.wars.find((w) => w.countryId === countryId)) return { ok: false, reason: 'Já está em guerra' };
  ensureRelations(state);
  const rel = state.relations[countryId];
  if (rel.relation > 70) applyEffect(state, { stats: { aprovacao: -6, agitacao: 6 }, text: `A opinião pública rejeita atacar um aliado como ${c.name}.`, tone: 'bad', icon: '😠' });
  changeRelation(state, countryId, -50);
  state.wars.push({ countryId, since: state.turn, progress: 0, casualties: 0, front: 'fronteira' });
  state.legacy.wars = (state.legacy.wars || 0) + 1;
  applyEffect(state, {
    stats: { economia: -2, reputacao: -10, sancoes: 8, agitacao: 5, poderMilitar: -2, medo: 5 },
    factions: { militares: 6, nacionalistas: 10, imprensa: -6, juventude: -8 },
    text: `Guerra declarada contra ${c.name}.`,
    tone: 'bad', icon: '⚔️',
  });
  return { ok: true };
}

export function resolveWarTick(state, war) {
  const c = countryById(war.countryId);
  if (!c) return null;
  const own = state.stats.poderMilitar * 1.0 + state.factions.militares * 0.3 + (state.flags.nuclear_testado ? 15 : 0) + state.stats.arsenalNuclear * 4;
  const enemy = c.power * 1.0 + (state.relations[war.countryId]?.treaties?.alianca ? 0 : 0) + 15;
  const roll = (own - enemy) / 10 + (Math.random() * 12 - 6);
  war.progress = clamp(war.progress + roll * 0.5, -100, 100);
  war.casualties += Math.round(Math.abs(roll) * 900 + 1500);

  const effect = { stats: {}, factions: {}, text: '' };
  if (roll > 4) {
    effect.stats = { poderMilitar: -0.5, aprovacao: 1.5, medo: 1, economia: -0.4 };
    effect.factions = { militares: 2, nacionalistas: 2 };
    effect.text = `Frente contra ${c.name}: avanço das suas tropas.`;
    effect.tone = 'good'; effect.icon = '🎖️';
  } else if (roll < -4) {
    effect.stats = { poderMilitar: -1.5, aprovacao: -2, agitacao: 2, economia: -0.6 };
    effect.factions = { militares: -2, imprensa: -2 };
    effect.text = `Frente contra ${c.name}: suas tropas recuam.`;
    effect.tone = 'bad'; effect.icon = '💥';
  } else {
    effect.stats = { poderMilitar: -0.8, economia: -0.3 };
    effect.text = `Frente contra ${c.name}: guerra de trincheira, sem avanço.`;
    effect.tone = 'warn'; effect.icon = '🪖';
  }
  applyEffect(state, effect);

  if (war.progress >= 60) return endWar(state, war, 'victory');
  if (war.progress <= -60) return endWar(state, war, 'defeat');
  return null;
}

export function endWar(state, war, outcome) {
  const c = countryById(war.countryId);
  state.wars = state.wars.filter((w) => w.countryId !== war.countryId);
  if (outcome === 'victory') {
    changeRelation(state, war.countryId, 15);
    applyEffect(state, {
      treasury: 120,
      stats: { poderMilitar: 3, aprovacao: 8, reputacao: 3, estabilidade: 3, poder: 6 },
      factions: { militares: 8, nacionalistas: 10, imprensa: 2 },
      text: `Vitória! ${c.name} se rendeu. Territórios e indenizações anexados.`,
      tone: 'epic', icon: '🏆',
    });
    return { outcome, text: `Vitória sobre ${c.name}` };
  }
  if (outcome === 'defeat') {
    applyEffect(state, {
      treasury: -80,
      stats: { poderMilitar: -8, aprovacao: -12, estabilidade: -10, agitacao: 10, reputacao: -8, sancoes: 6 },
      factions: { militares: -12, nacionalistas: -10 },
      text: `Derrota para ${c.name}. Tratado de paz humilhante assinado.`,
      tone: 'bad', icon: '🏳️',
    });
    if (state.stats.agitacao > 70 && isRulerSafe(state)) {
      state.over = { type: 'deposto', title: 'Derrota', text: `A derrota na guerra contra ${c.name} derrubou seu governo.`, icon: '🏳️' };
    }
    return { outcome, text: `Derrota para ${c.name}` };
  }
  return { outcome, text: 'Guerra encerrada' };
}

function isRulerSafe(state) {
  return ['presidente', 'ditador', 'monarca', 'vice', 'ministro'].includes(state.role);
}

export function peaceTreaty(state, countryId) {
  const war = state.wars.find((w) => w.countryId === countryId);
  if (!war) return { ok: false, reason: 'Não há guerra' };
  return endWar(state, war, war.progress > 20 ? 'victory' : war.progress < -20 ? 'defeat' : 'peace');
}

export function diplomaticIncident(state) {
  // Chamado pela simulação: países hostis reagem
  ensureRelations(state);
  const hostile = Object.entries(state.relations).filter(([, r]) => r.relation < 25);
  if (!hostile.length) return null;
  const [id] = hostile[Math.floor(Math.random() * hostile.length)];
  const c = countryById(id);
  const roll = Math.random();
  if (roll < 0.4) {
    applyEffect(state, {
      stats: { sancoes: 4, economia: -0.6, reputacao: -2 },
      text: `${c.name} impõe sanções em resposta à sua política externa.`,
      tone: 'warn', icon: '🚫',
    });
  } else if (roll < 0.7) {
    applyEffect(state, {
      stats: { agitacao: 3, estabilidade: -2 },
      text: `${c.name} financia protestos contra seu governo.`,
      tone: 'warn', icon: '📢',
    });
  } else {
    applyEffect(state, {
      stats: { medo: 2, poderMilitar: 1 },
      factions: { militares: 2 },
      text: `${c.name} faz manobras militares na sua fronteira.`,
      tone: 'warn', icon: '🎖️',
    });
  }
  return c.name;
}
