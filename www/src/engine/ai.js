/*
 * Inteligência artificial das nações: economia, diplomacia, guerra e movimento.
 */

import {
  atWar, declareWar, makePeace, nationIncome, nationPower, nationUpkeep, nationsOf,
  relation, recruitArmy, moveArmy, changeRelation, armyAt,
} from './nations.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Passo mensal de todas as nações controladas pela IA. */
export function runAI(world, opts = {}) {
  const report = { wars: [], battles: [], peaces: [], collapsed: [] };
  const playerIdx = world.player;
  const nations = world.nations;

  // países ordenados: os mais fortes agem primeiro
  const active = nations.filter((n) => n.alive && n.i!== playerIdx &&!n.isPlayer);

  for (const n of active) {
    /* ---------------- economia ---------------- */
    const income = nationIncome(world, n.i);
    const upkeep = nationUpkeep(world, n.i);
    n.treasury += income - upkeep;

    const pop = nationsOf(world, n.i).reduce((a, p) => a + world.pops[p], 0);
    n.manpower = Math.min(n.manpower + pop / 26000, pop / 300);

    if (n.treasury < 0) {
 // país quebrado: desmobiliza
 const own = world.armies.filter((a) => a.owner === n.i);
 if (own.length) {
 const a = own[0];
 n.manpower += Math.round(a.men * 0.5);
 world.armies = world.armies.filter((x) => x.id!== a.id);
 n.treasury += 4;
 }
 n.stability = clamp(n.stability - 0.4, 0, 100);
    } else {
 n.stability = clamp(n.stability + 0.15, 0, 100);
    }

    /* ---------------- recrutamento ---------------- */
    const atWarNow = n.wars.length > 0;
    const wantArmy = atWarNow? 1: 0.35;
    const myPower = nationPower(world, n.i);
    const targetMen = Math.min(n.manpower, 24000) * wantArmy * (0.4 + n.aggression);
    if (n.treasury > 60 && myPower.men < targetMen) {
 const provs = nationsOf(world, n.i);
 if (provs.length) {
 const border = provs.filter((p) => world.map.provinces[p].neighbors.some((q) => world.owners[q]!== n.i));
 const where = (border.length? border: provs)[Math.floor(Math.random() * (border.length? border.length: provs.length))];
 const men = Math.min(Math.round(1200 + Math.random() * 2600), Math.floor(n.manpower));
 if (men > 200) recruitArmy(world, n.i, where, men);
 }
    }

    /* ---------------- diplomacia ---------------- */
    if (!atWarNow && Math.random() < n.aggression * 0.06) {
 const neighbors = new Set();
 for (const p of nationsOf(world, n.i)) {
 for (const q of world.map.provinces[p].neighbors) {
 const o = world.owners[q];
 if (o!== n.i && world.nations[o]?.alive) neighbors.add(o);
 }
 }
 const candidates = [...neighbors].filter((o) =>!atWar(world, n.i, o) && o!== playerIdx);
 if (candidates.length) {
 // escolhe o mais fraco que ainda valha a pena
 const scored = candidates.map((o) => ({
 o,
 score: nationPower(world, o).total - nationPower(world, n.i).total * 0.6 - relation(world, n.i, o) * 6,
 })).sort((a, b) => a.score - b.score);
 const target = scored[0];
 if (target && target.score < 3000 && relation(world, n.i, target.o) < 25) {
 if (declareWar(world, n.i, target.o)) {
 report.wars.push({ attacker: n.i, defender: target.o });
 world.log.push({ turn: world.turn, text: `${n.name} declarou guerra a ${world.nations[target.o].name}` });
 }
 }
 }
    }

    /* ---------------- frente de batalha ---------------- */
    if (atWarNow) {
 const enemies = n.wars.filter((w) => world.nations[w]?.alive);
 if (!enemies.length) {
 for (const w of [...n.wars]) makePeace(world, n.i, w);
 continue;
 }
 const armies = world.armies.filter((a) => a.owner === n.i);
 for (const army of armies.slice(0, 4)) {
 const prov = world.map.provinces[army.prov];
 // alvo: província inimiga adjacente mais fraca
 let best = null;
 for (const q of prov.neighbors) {
 const o = world.owners[q];
 if (o!== n.i && enemies.includes(o)) {
 const defenders = world.garrisons[q] + armyAt(world, q).reduce((a, x) => a + x.men, 0);
 if (!best || defenders < best.defenders) best = { q, defenders };
 }
 }
 if (best && army.men > best.defenders * 0.7) {
 const res = moveArmy(world, army, best.q);
 if (res.ok && res.battle) {
 report.battles.push({...res.battle, attackerNation: n.i });
 world.log.push({
 turn: world.turn,
 text: `${n.name} ${res.battle.won? 'tomou': 'perdeu'} ${world.map.provinces[best.q].name} em batalha`,
 });
 }
 continue;
 }
 // sem alvo adjacente: avança para a fronteira mais próxima
 const enemyProvs = new Set(nationsOf(world, enemies[0]));
 for (const e of enemies.slice(1)) for (const p of nationsOf(world, e)) enemyProvs.add(p);
 let step = null;
 let bestDist = Infinity;
 for (const q of prov.neighbors) {
 if (world.owners[q] === n.i) {
 let d = Infinity;
 for (const ep of enemyProvs) {
 const pp = world.map.provinces[ep];
 const dq = (pp.x - prov.x) ** 2 + (pp.y - prov.y) ** 2;
 if (dq < d) d = dq;
 }
 if (d < bestDist) { bestDist = d; step = q; }
 }
 }
 if (step!== null) moveArmy(world, army, step);
 }

 /* ---------------- paz ---------------- */
 const mine = nationsOf(world, n.i).length;
 const lost = Math.max(0, (n.startProv || mine) - mine);
 const exhaustion = lost / Math.max(1, n.startProv || mine);
 if (exhaustion > 0.35 && Math.random() < 0.25) {
 for (const e of enemies) {
 makePeace(world, n.i, e);
 report.peaces.push({ a: n.i, b: e });
 world.log.push({ turn: world.turn, text: `${n.name} assinou a paz com ${world.nations[e].name}` });
 }
 n.stability = clamp(n.stability - 5, 0, 100);
 }
    }

    /* ---------------- relações esfriando ---------------- */
    if (Math.random() < 0.02) {
 const others = Object.keys(n.relations);
 if (others.length) {
 const k = others[Math.floor(Math.random() * others.length)];
 const drift = relation(world, n.i, Number(k)) > 0? -1: 1;
 n.relations[k] = clamp((n.relations[k] || 0) + drift, -100, 100);
 }
    }
  }

  // coalizão contra o jogador muito poderoso
  const player = world.nations[playerIdx];
  if (player?.alive) {
    const playerPower = nationPower(world, playerIdx).total;
    const totalWorld = world.nations.filter((x) => x.alive && x.i!== playerIdx).reduce((a, x) => a + nationPower(world, x.i).total, 0);
    if (playerPower > totalWorld * 0.45 &&!player.coalitionWarned) {
 player.coalitionWarned = true;
 for (const n of world.nations) {
 if (!n.alive || n.i === playerIdx) continue;
 setRel(world, n.i, playerIdx, -35);
 }
 world.log.push({ turn: world.turn, text: 'O mundo se une contra o seu poderio. Relações despencaram.' });
    }
  }

  return report;
}

function setRel(world, a, b, v) {
  world.nations[a].relations[b] = v;
  world.nations[b].relations[a] = v;
}

/** Sugestão de alvo para o jogador (usada em dicas da interface). */
export function suggestTarget(world, nationIdx) {
  const neighbors = new Set();
  for (const p of nationsOf(world, nationIdx)) {
    for (const q of world.map.provinces[p].neighbors) {
 const o = world.owners[q];
 if (o!== nationIdx && world.nations[o]?.alive) neighbors.add(o);
    }
  }
  return [...neighbors].map((o) => ({
    nation: world.nations[o],
    power: nationPower(world, o).total,
    relation: relation(world, nationIdx, o),
  })).sort((a, b) => a.power - b.power);
}
