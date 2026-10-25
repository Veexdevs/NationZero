/*
 * Campanha: une o mapa-múndi (províncias, exércitos, IA) ao Estado político
 * (leis, partidos, golpes). Tudo é serializável em JSON.
 */

import { createState, dateLabel, clamp, isRuler, factionAverage } from './state.js';
import { advanceTurn } from './simulation.js';
import { getMap } from './worldmap.js';
import {
  createWorld, nationsOf, nationIncome, nationPower, nationUpkeep, atWar, declareWar,
  makePeace, changeRelation, relation, recruitArmy, moveArmy, disbandArmy, armyAt,
  changeOwner, playerNation,
} from './nations.js';
import { runAI } from './ai.js';

export const SAVE_KEY = 'nz.campaign.v2';

/* ------------------------------------------------------------------ */
/* Criação                                                             */
/* ------------------------------------------------------------------ */

export function newCampaign({ nationIdx, leaderName, nationName, motto, difficulty = 'normal', origin }) {
  const map = getMap();
  if (!map) throw new Error('Mapa não carregado');

  const world = createWorld(map, nationIdx);
  const country = map.countries[nationIdx];
  const provs = country.provinces;

  const state = createState({
    nationName: nationName || country.name,
    capital: map.provinces[country.provinces[0]].capital ? map.provinces[country.provinces[0]].name : country.name,
    leaderName: leaderName || 'Você',
    motto: motto || 'Ordem, Pão e Futuro',
  });

  const diff = {
    facil: { treasury: 400, stability: 12, approval: 10 },
    normal: {},
    dificil: { treasury: -150, stability: -10, approval: -8 },
    brutal: { treasury: -300, stability: -18, approval: -15 },
  }[difficulty] || {};

  state.role = 'presidente';
  state.regime = 'democracia';
  state.stats.legitimidade = 55;
  state.stats.poder = 22;
  state.stats.influencia = 20;
  state.meta.countryIdx = nationIdx;
  state.meta.iso = country.iso2;
  state.meta.difficulty = difficulty;
  state.meta.origin = origin || 'sindicalista';
  state.meta.startYear = 2026;

  // herda atributos do país real
  state.stats.economia = clamp(Math.round(country.dev * 0.9 + 10), 5, 95);
  state.stats.educacao = clamp(Math.round(country.dev * 0.85), 5, 95);
  state.stats.saude = clamp(Math.round(country.dev * 0.8), 5, 95);
  state.stats.infraestrutura = clamp(Math.round(country.dev * 0.85), 5, 95);
  state.stats.tecnologia = clamp(Math.round(country.dev * 0.8), 3, 95);
  state.stats.populacao = Math.round(country.pop / 1e6);
  state.stats.tesouro = Math.round(340 + country.dev * 6 + (diff.treasury || 0));
  state.stats.estabilidade = clamp(55 + (diff.stability || 0), 5, 95);
  state.stats.aprovacao = clamp(35 + (diff.approval || 0), 3, 95);
  state.stats.poderMilitar = clamp(Math.round(18 + Math.sqrt(country.pop) / 260), 3, 92);
  state.meta.flag = 'flag';

  // a nação do jogador no mapa espelha o Estado
  const nation = world.nations[nationIdx];
  nation.name = state.meta.nationName;
  nation.treasury = state.stats.tesouro;
  nation.stability = state.stats.estabilidade;
  nation.manpower = Math.round(country.pop / 700);

  // vassalagem inicial: exército em cada província de fronteira
  const border = provs.filter((p) => map.provinces[p].neighbors.some((q) => world.owners[q] !== nationIdx));
  const start = border.length ? border : provs;
  for (let i = 0; i < Math.min(2, start.length); i++) {
    recruitArmy(world, nationIdx, start[i], Math.min(9000, Math.max(600, Math.round(nation.manpower * 0.02))));
  }

  // relações iniciais com os vizinhos
  for (const n of world.nations) {
    if (!n.alive || n.i === nationIdx) continue;
    n.relations[nationIdx] = ((n.i * 7) % 40) - 10;
    nation.relations[n.i] = n.relations[nationIdx];
  }
  for (const n of world.nations) n.startProv = n.provCount;

  state.log = [{
    turn: 0,
    date: 'Jan/2026',
    tone: 'epic',
    icon: 'flag',
    text: `${state.meta.nationName} assume o controle de ${provs.length} províncias. ${leaderName && leaderName !== 'Você' ? `${leaderName} chega ao poder` : 'Você chega ao poder'} — e o mundo está observando.`,
    id: 'start',
  }];

  return { state, world, map, version: 2 };
}

/* ------------------------------------------------------------------ */
/* Sincronização Estado ⇄ mapa                                         */
/* ------------------------------------------------------------------ */

export function syncWorldFromState(camp) {
  const { state, world } = camp;
  const nation = world.nations[world.player];
  if (!nation) return;
  nation.treasury = state.stats.tesouro;
  nation.stability = state.stats.estabilidade;
  nation.name = state.meta.nationName;
  const pop = nationsOf(world, world.player).reduce((a, p) => a + world.pops[p], 0);
  state.stats.populacao = Math.round(pop / 1e6);
}

export function syncStateFromWorld(camp) {
  const { state, world } = camp;
  const nation = world.nations[world.player];
  if (!nation) return;
  state.stats.tesouro = clamp(nation.treasury, -9999, 99999);
  state.stats.estabilidade = clamp(nation.stability, 0, 100);
  state.stats.poderMilitar = clamp(Math.round(20 + Math.sqrt(nationPower(world, world.player).total) / 22), 3, 100);
  state.stats.poder = clamp(Math.round(state.stats.poder * 0.7 + Math.log10(1 + nation.provCount) * 14), 0, 100);
  state.stats.influencia = clamp(Math.round(state.stats.influencia * 0.6 + nation.provCount * 0.9 + nationPower(world, world.player).total / 900), 0, 100);

  // sem províncias = fim de jogo
  if (nation.provCount <= 0 && !state.over) {
    state.over = {
      title: 'Seu país foi apagado do mapa',
      text: `${state.meta.nationName} perdeu todas as províncias. A história termina aqui — mas o mapa continua.`,
      icon: 'skull',
      kind: 'conquest',
    };
  }
  // domínio total
  if (nation.provCount >= world.map?.provinces?.length || false) {
    // placeholder; tratado abaixo com o total real
  }
}

/* ------------------------------------------------------------------ */
/* Turno                                                               */
/* ------------------------------------------------------------------ */

export function advanceCampaign(camp, opts = {}) {
  const { state, world, map } = camp;
  const report = { events: [], notes: [], wars: [], battles: [], date: null, budget: null };

  // 1. política interna
  const pol = advanceTurn(state, opts);
  report.events = pol.events || [];
  report.notes = pol.notes || [];
  report.budget = pol.budget;
  report.election = pol.election;

  // 2. espelha recursos
  syncWorldFromState(camp);

  // 3. economia e IA do mundo
  world.turn += 1;
  const playerNationRef = world.nations[world.player];
  if (playerNationRef.alive) {
    playerNationRef.treasury += nationIncome(world, world.player) - nationUpkeep(world, world.player);
    const pop = nationsOf(world, world.player).reduce((a, p) => a + world.pops[p], 0);
    playerNationRef.manpower = Math.min(playerNationRef.manpower + pop / 24000, pop / 260);
  }
  const ai = runAI(world, { difficulty: state.meta.difficulty });
  report.wars = ai.wars;
  report.battles = ai.battles;
  report.peaces = ai.peaces;

  // 4. desgaste de ocupação, revoltas e crescimento
  for (let i = 0; i < world.owners.length; i++) {
    const owner = world.owners[i];
    const ownerNation = world.nations[owner];
    const isCore = world.core[i] === owner;
    world.unrests[i] = Math.max(0, Math.min(100,
      world.unrests[i] + (isCore ? -0.5 : 0.35) + (ownerNation?.stability < 30 ? 0.6 : 0)));

    // construções desenvolvem a província
    if (world.buildings[i] & 1) world.devs[i] = Math.min(100, world.devs[i] + 0.06);
    if (world.buildings[i] & 8) world.devs[i] = Math.min(100, world.devs[i] + 0.04);

    // revolta: província ocupada e explosiva volta ao dono original ou se rebela
    if (!isCore && world.unrests[i] > 72 && Math.random() < (owner === world.player ? 0.035 : 0.012)) {
      const core = world.nations[world.core[i]];
      if (core && core.alive) {
        changeOwner(world, i, core.i);
        if (owner === world.player) {
          state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'bad', icon: 'flame',
            text: `Revolta em ${map.provinces[i].name}: a província voltou para ${core.name}.` });
        }
      } else {
        world.unrests[i] = Math.min(100, world.unrests[i] + 10);
        if (owner === world.player) {
          state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'bad', icon: 'triangle-alert',
            text: `Distúrbios graves em ${map.provinces[i].name}: a guarnição local está sob pressão.` });
          world.garrisons[i] = Math.round(world.garrisons[i] * 0.85);
        }
      }
    }
  }

  // 5. exércitos recuperam moral
  for (const a of world.armies) {
    a.moved = false;
    a.morale = Math.min(100, a.morale + 6);
  }

  // 6. estabilidade nacional pela guerra
  const n = world.nations[world.player];
  if (n.wars.length) n.stability = clamp(n.stability - 0.5 - n.wars.length * 0.2, 0, 100);
  else n.stability = clamp(n.stability + 0.7, 0, 100);
  if (n.provCount > (n.peakProv || 0)) n.peakProv = n.provCount;

  if (world.log.length > 120) world.log = world.log.slice(-120);

  // 7. eventos do mapa viram crônica
  for (const w of ai.wars) {
    state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'bad', icon: 'swords',
      text: `${world.nations[w.attacker].name} declarou guerra a ${world.nations[w.defender].name}.` });
  }
  for (const b of ai.battles) {
    if (b.attacker === world.player || b.defender === world.player) {
      state.log.push({ turn: state.turn, date: dateLabel(state), tone: b.won ? 'good' : 'bad', icon: 'target',
        text: `${world.nations[b.attacker].name} ${b.won ? 'tomou' : 'não tomou'} ${map.provinces[b.prov].name} de ${world.nations[b.defender].name}.` });
    }
  }

  // 8. volta para o Estado
  syncStateFromWorld(camp);

  // 9. vitória por domínio
  const total = map.provinces.length;
  if (n.provCount >= total && !state.over) {
    state.over = { title: 'O mundo é seu', text: `${state.meta.nationName} conquistou todas as ${total} províncias do planeta.`, icon: 'crown', kind: 'domination' };
  } else if (n.provCount > total * 0.5 && !state.flags.hegemon) {
    state.flags.hegemon = true;
    state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'epic', icon: 'globe-2',
      text: `${state.meta.nationName} controla mais da metade do mundo. As potências restantes se preparam.` });
  }

  report.date = dateLabel(state);
  report.player = { provCount: n.provCount, treasury: n.treasury, power: nationPower(world, world.player).total };
  return report;
}

/* ------------------------------------------------------------------ */
/* Ações do jogador no mapa                                            */
/* ------------------------------------------------------------------ */

export function playerRecruit(camp, prov, men) {
  const { state, world } = camp;
  if (world.owners[prov] !== world.player) return { ok: false, reason: 'Província não é sua' };
  if (!['presidente', 'ditador', 'primeiro-ministro', 'militar', 'monarca'].includes(state.role)) {
    return { ok: false, reason: 'Você não comanda as forças armadas' };
  }
  syncWorldFromState(camp);
  const nation = world.nations[world.player];
  nation.treasury = state.stats.tesouro;
  const res = recruitArmy(world, world.player, prov, men);
  if (res.ok) {
    state.stats.tesouro = nation.treasury;
    state.stats.aprovacao = clamp(state.stats.aprovacao - 0.5, 0, 100);
    state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'info', icon: 'shield',
      text: `${res.army.men.toLocaleString('pt-BR')} soldados recrutados em ${camp.map.provinces[prov].name}.` });
  }
  return res;
}

export function playerMove(camp, armyId, toProv) {
  const { world, state, map } = camp;
  const army = world.armies.find((a) => a.id === armyId && a.owner === world.player);
  if (!army) return { ok: false, reason: 'Exército não encontrado' };
  if (army.moved) return { ok: false, reason: 'Este exército já se moveu neste turno' };
  const from = army.prov;
  if (!map.provinces[from].neighbors.includes(toProv) && from !== toProv) {
    return { ok: false, reason: 'Destino não é adjacente' };
  }
  const res = moveArmy(world, army, toProv);
  if (res.ok) {
    if (res.battle) {
      const b = res.battle;
      state.log.push({ turn: state.turn, date: dateLabel(state), tone: b.won ? 'good' : 'bad', icon: 'swords',
        text: `Batalha em ${map.provinces[toProv].name}: ${b.won ? 'vitória' : 'derrota'} — perdemos ${b.atkLosses.toLocaleString('pt-BR')}, o inimigo ${b.defLosses.toLocaleString('pt-BR')}.` });
      if (b.won) {
        state.stats.aprovacao = clamp(state.stats.aprovacao + 1.5, 0, 100);
        state.legacy.wars = state.legacy.wars || 0;
      } else {
        state.stats.aprovacao = clamp(state.stats.aprovacao - 1.2, 0, 100);
      }
    }
    syncStateFromWorld(camp);
  }
  return res;
}

export function playerDisband(camp, armyId) {
  const { world, state } = camp;
  const army = world.armies.find((a) => a.id === armyId && a.owner === world.player);
  if (!army) return false;
  disbandArmy(world, armyId);
  state.stats.aprovacao = clamp(state.stats.aprovacao + 0.3, 0, 100);
  syncStateFromWorld(camp);
  return true;
}

export function playerDeclareWar(camp, target) {
  const { world, state } = camp;
  if (!atWar(world, world.player, target)) {
    declareWar(world, world.player, target);
    state.stats.estabilidade = clamp(state.stats.estabilidade - 4, 0, 100);
    state.stats.aprovacao = clamp(state.stats.aprovacao - 3, 0, 100);
    state.legacy.wars = (state.legacy.wars || 0) + 1;
    state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'bad', icon: 'swords',
      text: `Você declarou guerra a ${world.nations[target].name}.` });
  }
  return true;
}

export function playerPeace(camp, target) {
  const { world, state } = camp;
  makePeace(world, world.player, target);
  state.stats.estabilidade = clamp(state.stats.estabilidade + 3, 0, 100);
  state.stats.aprovacao = clamp(state.stats.aprovacao + (relation(world, world.player, target) > -40 ? 1 : -2), 0, 100);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'good', icon: 'handshake',
    text: `Paz assinada com ${world.nations[target].name}.` });
  return true;
}

export function playerImproveRelations(camp, target, cost = 25) {
  const { world, state } = camp;
  if (state.stats.tesouro < cost) return { ok: false, reason: 'Tesouro insuficiente' };
  state.stats.tesouro -= cost;
  syncWorldFromState(camp);
  changeRelation(world, world.player, target, 14);
  return { ok: true };
}

export function playerBuild(camp, prov, kind) {
  const { world, state } = camp;
  if (world.owners[prov] !== world.player) return { ok: false, reason: 'Província não é sua' };
  const costs = { fabrica: 60, forte: 45, porto: 40, escola: 35, base: 70 };
  const bits = { fabrica: 1, forte: 2, porto: 4, escola: 8, base: 16 };
  const cost = costs[kind];
  if (state.stats.tesouro < cost) return { ok: false, reason: `Custa N$ ${cost} bi` };
  if (world.buildings[prov] & bits[kind]) return { ok: false, reason: 'Já existe nesta província' };
  state.stats.tesouro -= cost;
  world.buildings[prov] |= bits[kind];
  if (kind === 'forte') world.forts[prov] += 1;
  if (kind === 'fabrica') world.devs[prov] += 4;
  if (kind === 'escola') world.devs[prov] += 2;
  if (kind === 'base') world.garrisons[prov] += 2500;
  syncWorldFromState(camp);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'good', icon: 'construction',
    text: `${labelBuild(kind)} construída em ${camp.map.provinces[prov].name}.` });
  return { ok: true };
}

export function labelBuild(kind) {
  return ({ fabrica: 'Fábrica', forte: 'Forte', porto: 'Porto', escola: 'Escola', base: 'Base militar' })[kind] || kind;
}

export function playerAnnex(camp, prov) {
  // anexação pacífica de província com alta instabilidade e mesmo núcleo cultural
  const { world, state } = camp;
  const owner = world.owners[prov];
  if (world.core[prov] === world.player) {
    return { ok: false, reason: 'Já é território nacional' };
  }
  if (owner === world.player) return { ok: false, reason: 'Já é sua' };
  const cost = 80;
  if (state.stats.tesouro < cost) return { ok: false, reason: `Custa N$ ${cost} bi` };
  state.stats.tesouro -= cost;
  changeOwner(world, prov, world.player);
  state.stats.aprovacao = clamp(state.stats.aprovacao - 4, 0, 100);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'info', icon: 'flag',
    text: `${camp.map.provinces[prov].name} foi anexada por meios diplomáticos.` });
  syncStateFromWorld(camp);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Diplomacia avançada                                                 */
/* ------------------------------------------------------------------ */

function pay(camp, cost) {
  const { state } = camp;
  if (state.stats.tesouro < cost) return false;
  state.stats.tesouro -= cost;
  syncWorldFromState(camp);
  return true;
}

export function playerAlliance(camp, target) {
  const { world, state } = camp;
  const me = world.player;
  if (atWar(world, me, target)) return { ok: false, reason: 'Em guerra com essa nação' };
  if (relation(world, me, target) < 25) return { ok: false, reason: 'Relações insuficientes (mín. 25)' };
  if (!pay(camp, 40)) return { ok: false, reason: 'Custa N$ 40 bi' };
  world.nations[me].allies.push(target);
  world.nations[target].allies.push(me);
  changeRelation(world, me, target, 20);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'good', icon: 'handshake',
    text: `Aliança firmada com ${world.nations[target].name}.` });
  return { ok: true };
}

export function playerBreakAlliance(camp, target) {
  const { world, state } = camp;
  const me = world.player;
  world.nations[me].allies = world.nations[me].allies.filter((x) => x !== target);
  world.nations[target].allies = world.nations[target].allies.filter((x) => x !== me);
  changeRelation(world, me, target, -25);
  state.stats.reputacao = clamp(state.stats.reputacao - 4, 0, 100);
  return { ok: true };
}

export function playerSanction(camp, target) {
  const { world, state } = camp;
  const me = world.player;
  if (world.nations[me].sanctions.includes(target)) return { ok: false, reason: 'Já sancionada' };
  world.nations[me].sanctions.push(target);
  world.nations[target].incomePenalty = (world.nations[target].incomePenalty || 0) + 0.18;
  changeRelation(world, me, target, -18);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'warn', icon: 'ban',
    text: `Sanções econômicas impostas a ${world.nations[target].name}.` });
  return { ok: true };
}

export function playerTradeDeal(camp, target) {
  const { world, state } = camp;
  const me = world.player;
  if (atWar(world, me, target)) return { ok: false, reason: 'Em guerra' };
  if (!pay(camp, 20)) return { ok: false, reason: 'Custa N$ 20 bi' };
  if (!world.nations[me].tradeDeals.includes(target)) world.nations[me].tradeDeals.push(target);
  changeRelation(world, me, target, 12);
  world.nations[me].treasury += 8;
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'good', icon: 'coins',
    text: `Acordo comercial assinado com ${world.nations[target].name}.` });
  return { ok: true };
}

export function playerSpy(camp, target, kind = 'sabotagem') {
  const { world, state } = camp;
  const me = world.player;
  if (!pay(camp, 25)) return { ok: false, reason: 'Custa N$ 25 bi' };
  const enemyProvs = nationsOf(world, target);
  const success = Math.random() < 0.35 + (state.institutions?.policia || 10) / 60;
  if (success && enemyProvs.length) {
    const prov = enemyProvs[Math.floor(Math.random() * enemyProvs.length)];
    if (kind === 'sabotagem') world.garrisons[prov] = Math.round(world.garrisons[prov] * 0.6);
    if (kind === 'golpe') {
      world.nations[target].stability = clamp(world.nations[target].stability - 12, 0, 100);
      world.unrests[prov] = Math.min(100, world.unrests[prov] + 20);
    }
    if (kind === 'roubo') {
      const loot = Math.min(world.nations[target].treasury * 0.1, 60);
      world.nations[target].treasury -= loot;
      world.nations[me].treasury += loot;
      state.stats.tesouro += loot;
    }
    state.stats.influencia = clamp(state.stats.influencia + 1, 0, 100);
    state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'info', icon: 'user-search',
      text: `Operação de ${kind} contra ${world.nations[target].name} foi um sucesso.` });
    return { ok: true, success: true };
  }
  changeRelation(world, me, target, -12);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'bad', icon: 'triangle-alert',
    text: `Operação de ${kind} contra ${world.nations[target].name} foi descoberta.` });
  return { ok: true, success: false };
}

export function playerDemandTribute(camp, target) {
  const { world, state } = camp;
  const me = world.player;
  const myPower = nationPower(world, me).total;
  const theirPower = nationPower(world, target).total;
  if (myPower < theirPower * 1.8) return { ok: false, reason: 'Você precisa ser muito mais forte' };
  const amount = Math.round(Math.min(world.nations[target].treasury * 0.4, 120));
  world.nations[target].treasury -= amount;
  world.nations[me].treasury += amount;
  state.stats.tesouro += amount;
  changeRelation(world, me, target, -25);
  state.log.push({ turn: state.turn, date: dateLabel(state), tone: 'epic', icon: 'coins',
    text: `${world.nations[target].name} pagou N$ ${amount} bi de tributo.` });
  return { ok: true, amount };
}

/* ------------------------------------------------------------------ */
/* Persistência                                                        */
/* ------------------------------------------------------------------ */

function worldForSave(world) {
  // o mapa em si não é salvo: é recarregado do JSON estático
  const { map, ...rest } = world;
  rest.log = (rest.log || []).slice(-120);
  return rest;
}

export function saveCampaign(camp) {
  try {
    const payload = JSON.stringify({ v: 2, savedAt: Date.now(), state: camp.state, world: worldForSave(camp.world) });
    localStorage.setItem(SAVE_KEY, payload);
    return true;
  } catch (e) {
    console.warn('save falhou', e);
    return false;
  }
}

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 2) return null;
    const map = getMap();
    if (!map) return null;
    data.world.map = map;
    data.world.log = data.world.log || [];
    return { state: data.state, world: data.world, map, version: 2 };
  } catch (e) {
    console.warn('load falhou', e);
    return null;
  }
}

export function hasCampaign() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function clearCampaign() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
}

export function exportCampaign(camp) {
  return JSON.stringify({ v: 2, savedAt: Date.now(), state: camp.state, world: worldForSave(camp.world) }, null, 1);
}

export function importCampaign(text) {
  const data = JSON.parse(text);
  if (!data || !data.state || !data.world) throw new Error('Arquivo inválido');
  const map = getMap();
  data.world.map = map;
  return { state: data.state, world: data.world, map, version: 2 };
}

/* ------------------------------------------------------------------ */
/* Resumo para o HUD                                                   */
/* ------------------------------------------------------------------ */

export function campaignSummary(camp) {
  const { state, world, map } = camp;
  const n = world.nations[world.player];
  const power = nationPower(world, world.player);
  const income = Math.round(nationIncome(world, world.player));
  const upkeep = Math.round(nationUpkeep(world, world.player));
  return {
    nation: n,
    provCount: n.provCount,
    provinceTotal: map.provinces.length,
    worldShare: (n.provCount / map.provinces.length) * 100,
    income, upkeep,
    men: power.men,
    garrisons: power.garrisons,
    wars: n.wars.filter((w) => world.nations[w]?.alive).map((w) => world.nations[w]),
    date: dateLabel(state),
    factionAvg: Math.round(factionAverage(state)),
    atWar: n.wars.length > 0,
    ranking: [...world.nations].filter((x) => x.alive)
      .sort((a, b) => b.provCount - a.provCount).indexOf(n) + 1,
    alive: world.nations.filter((x) => x.alive).length,
  };
}

export { nationsOf, armyAt, playerNation };
