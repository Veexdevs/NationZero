/*
 * Nações, donos de província e economia de guerra.
 * O mapa real vem de worldmap.js; aqui vive o estado mutável da partida.
 */

import { getMap } from './worldmap.js';

/* Cor política de cada nação (ângulo áureo: vizinhos raramente se confundem) */
export function colorForNation(index, iso = '') {
  const hue = (index * 137.508 + 15) % 360;
  const sat = 46 + (index % 4) * 8;
  const light = 42 + (index % 3) * 6;
  return `hsl(${hue.toFixed(0)} ${sat}% ${light}%)`;
}

/* Ideologia de cada nação do mundo (determinística por índice) */
function ideologyFor(i, dev) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12733.123;
  const c = Math.sin(i * 39.425) * 24634.6345;
  const rnd = (v) => ((v - Math.floor(v)) * 2 - 1);
  return {
    economico: Math.round(rnd(a) * 70),
    social: Math.round(rnd(b) * 65 + (dev < 40? 25: 0)),
    nacionalismo: Math.round(rnd(c) * 70),
  };
}

export function createWorld(map, playerCountry) {
  const provinces = map.provinces;
  const n = map.countries.length;

  const owners = new Array(provinces.length).fill(0);
  const core = new Array(provinces.length).fill(0);
  const pops = new Array(provinces.length).fill(0);
  const devs = new Array(provinces.length).fill(0);
  const forts = new Array(provinces.length).fill(0);
  const unrests = new Array(provinces.length).fill(0);
  const garrisons = new Array(provinces.length).fill(0);
  const buildings = new Array(provinces.length).fill(0); // bitmask: 1=fábrica, 2=forte, 4=porto

  const nations = [];

  for (const c of map.countries) {
    const provs = c.provinces;
    const totalArea = provs.reduce((a, p) => a + provinces[p].area, 0) || 1;
    const nation = {
 i: c.i,
 name: c.name,
 iso: c.iso2 || c.iso3 || String(c.i),
 region: c.regionPt,
 dev: c.dev,
 pop: c.pop,
 capital: provs[0],
 alive: provs.length > 0,
 treasury: Math.round(90 + c.dev * 4 + Math.sqrt(c.pop) / 30),
 manpower: Math.round(c.pop / 900),
 stability: 55 + Math.round((c.dev - 45) * 0.35),
 aggression: 0.15 + ((c.i * 37) % 100) / 400,
 ideology: ideologyFor(c.i, c.dev),
      relations: {},
      wars: [],
      allies: [],
      sanctions: [],
      tradeDeals: [],
 color: colorForNation(c.i, c.iso2),
 isPlayer: false,
 provCount: provs.length,
    };
    nations.push(nation);

    for (const p of provs) {
 owners[p] = c.i;
 core[p] = c.i;
 devs[p] = Math.max(4, Math.round(c.dev + (provinces[p].capital? 12: 0) + (((p * 17) % 11) - 5)));
 pops[p] = Math.max(20000, Math.round((c.pop * provinces[p].area) / totalArea));
 garrisons[p] = Math.max(150, Math.round((c.pop / 60000) * (0.5 + provinces[p].area / (totalArea || 1))));
 forts[p] = provinces[p].capital? 2: 0;
 unrests[p] = 5;
    }
  }

  const world = {
    mapVersion: 1,
    map,
    player: playerCountry,
    owners, core, pops, devs, forts, unrests, garrisons, buildings,
    nations,
    armies: [],
    nextArmyId: 1,
    turn: 0,
    log: [],
    fallen: [],
  };

  nations[playerCountry].isPlayer = true;
  nations[playerCountry].treasury = 180;
  nations[playerCountry].manpower = Math.round(nations[playerCountry].pop / 600);
  return world;
}

/* ------------------------------------------------------------------ */
/* Consultas */
/* ------------------------------------------------------------------ */

export function nationsOf(world, nationIdx) {
  const list = [];
  for (let i = 0; i < world.owners.length; i++) if (world.owners[i] === nationIdx) list.push(i);
  return list;
}

export function nationArmies(world, nationIdx) {
  return world.armies.filter((a) => a.owner === nationIdx);
}

export function nationPower(world, nationIdx) {
  let men = 0;
  for (const a of world.armies) if (a.owner === nationIdx) men += a.men;
  let gar = 0;
  for (let i = 0; i < world.owners.length; i++) if (world.owners[i] === nationIdx) gar += world.garrisons[i];
  return { men, garrisons: gar, total: men + gar };
}

export function nationIncome(world, nationIdx) {
  let income = 0;
  for (let i = 0; i < world.owners.length; i++) {
    if (world.owners[i]!== nationIdx) continue;
    income += (world.pops[i] / 1e6) * world.devs[i] * 0.006;
    if (world.buildings[i] & 1) income *= 1.0; // fábrica já considerada em dev
  }
  return income;
}

export function nationUpkeep(world, nationIdx) {
  const p = nationPower(world, nationIdx);
  return p.men / 1800 + p.garrisons / 12000;
}

export function relation(world, a, b) {
  if (a === b) return 100;
  const n = world.nations[a];
  if (!n) return 0;
  const v = n.relations[b];
  return v === undefined? 0: v;
}

export function setRelation(world, a, b, value) {
  const clamp = (v) => Math.max(-100, Math.min(100, v));
  world.nations[a].relations[b] = clamp(value);
  world.nations[b].relations[a] = clamp(value);
}

export function changeRelation(world, a, b, delta) {
  setRelation(world, a, b, relation(world, a, b) + delta);
}

export function atWar(world, a, b) {
  return world.nations[a]?.wars.includes(b) || false;
}

export function declareWar(world, a, b) {
  if (a === b || atWar(world, a, b)) return false;
  world.nations[a].wars.push(b);
  world.nations[b].wars.push(a);
  setRelation(world, a, b, -75);
  // aliados do defensor entram na guerra
  for (const ally of world.nations[b].allies || []) {
    if (ally!== a && world.nations[ally]?.alive &&!atWar(world, ally, a) && Math.random() < 0.6) {
 world.nations[ally].wars.push(a);
 world.nations[a].wars.push(ally);
    }
  }
  return true;
}

export function makePeace(world, a, b) {
  world.nations[a].wars = world.nations[a].wars.filter((x) => x!== b);
  world.nations[b].wars = world.nations[b].wars.filter((x) => x!== a);
  setRelation(world, a, b, -10);
}

export function changeOwner(world, prov, newOwner) {
  const old = world.owners[prov];
  if (old === newOwner) return;
  world.owners[prov] = newOwner;
  world.unrests[prov] = Math.min(100, world.unrests[prov] + (newOwner === world.core[prov]? 0: 25));
  const oldNation = world.nations[old];
  const newNation = world.nations[newOwner];
  if (oldNation) oldNation.provCount = Math.max(0, oldNation.provCount - 1);
  if (newNation) newNation.provCount += 1;

  // nação sem províncias: morre
  if (oldNation && oldNation.provCount <= 0 && oldNation.alive) {
    oldNation.alive = false;
    world.fallen.push({ i: old, by: newOwner, turn: world.turn });
    for (const w of oldNation.wars.slice()) makePeace(world, old, w);
    world.log.push({ turn: world.turn, text: `${oldNation.name} deixou de existir, anexada por ${newNation? newNation.name: '???'}` });
  }
  // capital perdida: muda a capital
  if (oldNation && world.core[prov] === old && oldNation.alive) {
    const rest = nationsOf(world, old);
    if (rest.length) oldNation.capital = rest[0];
  }
}

export function nationName(world, i) {
  return world.nations[i]?.name || '—';
}

export function playerNation(world) {
  return world.nations[world.player];
}

/* ------------------------------------------------------------------ */
/* Exército */
/* ------------------------------------------------------------------ */

export function recruitArmy(world, nationIdx, prov, men) {
  const nation = world.nations[nationIdx];
  if (!nation) return { ok: false, reason: 'Nação inválida' };
  const avail = Math.floor(nation.manpower);
  if (avail < men) return { ok: false, reason: `Mão de obra insuficiente (${avail})` };
  const cost = Math.round(men * 0.02);
  if (nation.treasury < cost) return { ok: false, reason: `Tesouro insuficiente (${cost})` };

  nation.treasury -= cost;
  nation.manpower -= men;
  const army = {
    id: world.nextArmyId++,
    owner: nationIdx,
    prov,
    men,
    morale: 100,
    moved: false,
  };
  world.armies.push(army);
  return { ok: true, army, cost };
}

export function armyAt(world, prov, nationIdx = null) {
  return world.armies.filter((a) => a.prov === prov && (nationIdx === null? true: a.owner === nationIdx));
}

export function disbandArmy(world, armyId) {
  const idx = world.armies.findIndex((a) => a.id === armyId);
  if (idx < 0) return false;
  const army = world.armies[idx];
  world.nations[army.owner].manpower += Math.round(army.men * 0.6);
  world.armies.splice(idx, 1);
  return true;
}

/* ------------------------------------------------------------------ */
/* Simulação de batalha */
/* ------------------------------------------------------------------ */

const rand = (min, max) => min + Math.random() * (max - min);

export function resolveBattle(world, attackerArmy, targetProv) {
  const attacker = world.nations[attackerArmy.owner];
  const defenderOwner = world.owners[targetProv];
  const defender = world.nations[defenderOwner];

  const defenders = armyAt(world, targetProv, defenderOwner);
  const defMen = defenders.reduce((a, x) => a + x.men, 0) + world.garrisons[targetProv];
  const fort = 1 + (world.forts[targetProv] || 0) * 0.22 + (world.buildings[targetProv] & 2? 0.3: 0);
  const terrain = 1; // reservado para terreno

  const atkPower = attackerArmy.men * (attackerArmy.morale / 100) * rand(0.85, 1.2);
  const defPower = defMen * 0.95 * fort * terrain * rand(0.85, 1.2);

  const total = atkPower + defPower || 1;
  const atkLosses = Math.round(attackerArmy.men * (defPower / total) * rand(0.5, 0.9));
  const defLosses = Math.round(defMen * (atkPower / total) * rand(0.5, 0.95));

  const result = {
    prov: targetProv,
    attacker: attackerArmy.owner,
    defender: defenderOwner,
    atkBefore: attackerArmy.men,
    defBefore: defMen,
    atkLosses: Math.min(atkLosses, attackerArmy.men),
    defLosses: Math.min(defLosses, defMen),
    won: atkPower > defPower,
    provinceTaken: false,
  };

  attackerArmy.men -= result.atkLosses;
  attackerArmy.morale = Math.max(20, attackerArmy.morale - (result.won? 6: 18));

  // distribui perdas entre exército defensor e guarnição
  let remaining = result.defLosses;
  for (const a of defenders) {
    const share = Math.min(a.men, Math.round(result.defLosses * (a.men / Math.max(1, defMen))));
    a.men -= share;
    remaining -= share;
  }
  world.garrisons[targetProv] = Math.max(0, world.garrisons[targetProv] - Math.max(0, remaining));

  if (result.won) {
    attackerArmy.prov = targetProv;
    attackerArmy.moved = true;
    // anexa a província
    changeOwner(world, targetProv, attackerArmy.owner);
    result.provinceTaken = true;
    world.unrests[targetProv] = Math.min(100, world.unrests[targetProv] + 18);
    if (defender) defender.stability = Math.max(0, defender.stability - 3);
    if (attacker) attacker.stability = Math.min(100, attacker.stability + 1);
  } else {
    attackerArmy.morale = Math.max(15, attackerArmy.morale - 5);
  }

  // limpa exércitos destruídos
  world.armies = world.armies.filter((a) => a.men > 0 && world.nations[a.owner]?.alive);
  if (attackerArmy.men <= 0) {
    world.armies = world.armies.filter((a) => a.id!== attackerArmy.id);
  }

  return result;
}

export function moveArmy(world, army, toProv) {
  const owner = world.owners[toProv];
  if (owner === army.owner) {
    army.prov = toProv;
    army.moved = true;
    return { ok: true, moved: true };
  }
  if (!atWar(world, army.owner, owner)) {
    return { ok: false, reason: 'Você não está em guerra com essa nação' };
  }
  const battle = resolveBattle(world, army, toProv);
  return { ok: true, battle };
}

/* ------------------------------------------------------------------ */
/* Força e prestígio */
/* ------------------------------------------------------------------ */

export function worldPowerRanking(world) {
  return world.nations.filter((n) => n.alive).map((n) => ({ nation: n, power: nationPower(world, n.i).total + nationIncome(world, n.i) * 40 })).sort((a, b) => b.power - a.power);
}

export function playerProvinceCount(world) {
  return world.nations[world.player]?.provCount || 0;
}

export function totalProvinces() {
  return getMap()?.provinces.length || 0;
}
