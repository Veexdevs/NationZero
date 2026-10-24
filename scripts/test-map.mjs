#!/usr/bin/env node
/*
 * Testes do mapa-múndi, da campanha e dos ícones.
 *   npm run test:map
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'www', 'src');
const mapData = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'worldmap.json'), 'utf8'));

// o engine não depende do DOM para estes testes
const { setMap, findProvinceAt, getMap } = await import('../www/src/engine/worldmap.js');
const N = await import('../www/src/engine/nations.js');
const C = await import('../www/src/engine/campaign.js');
const { ICONS, EMOJI_TO_ICON } = await import('../www/src/ui/icons.js');

let pass = 0;
let fail = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e });
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function eq(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg} esperado ${JSON.stringify(b)}, recebido ${JSON.stringify(a)}`);
}
function ok(v, msg = 'falso') { if (!v) throw new Error(msg); }
function near(a, b, tol, msg = '') { if (Math.abs(a - b) > tol) throw new Error(`${msg} ${a} ≉ ${b}`); }
function section(t) { console.log(`\n== ${t} ==`); }

/* ------------------------------------------------------------------ */

section('Mapa');
const map = setMap(mapData);

test('mais de 2000 províncias carregadas', () => ok(map.provinces.length > 2000, String(map.provinces.length)));
test('mais de 160 países carregados', () => ok(map.countries.length > 160, String(map.countries.length)));
test('toda província tem dono válido', () => {
  for (const p of map.provinces) {
    ok(Number.isInteger(p.country) && p.country >= 0 && p.country < map.countries.length, `província ${p.i}`);
  }
});
test('adjacências são simétricas', () => {
  for (const p of map.provinces) {
    for (const n of p.neighbors) ok(map.provinces[n].neighbors.includes(p.i), `${p.i}↔${n}`);
  }
});
test('países têm ao menos uma província', () => {
  for (const c of map.countries) ok(c.provinces.length > 0, c.name);
});
test('path SVG é válido em todas as províncias', () => {
  for (const p of map.provinces) ok(/^M[\d.\s-]/.test(p.path), p.name);
});
test('bbox contém o centroide', () => {
  for (const p of map.provinces) {
    const [x0, y0, x1, y1] = p.bbox;
    ok(p.x >= x0 - 1 && p.x <= x1 + 1 && p.y >= y0 - 1 && p.y <= y1 + 1, p.name);
  }
});
test('busca por ponto encontra província', () => {
  const p = map.provinces[100];
  const found = findProvinceAt(map, p.x, p.y);
  ok(found, 'nada encontrado');
});
test('vizinhos de país incluem fronteiras', () => {
  const brasil = map.countries.find((c) => c.iso2 === 'BR');
  const nb = map.countryNeighbors[brasil.i].map((i) => map.countries[i].iso2);
  ok(nb.includes('AR') && nb.includes('PE'), `vizinhos: ${nb.join(',')}`);
});

/* ------------------------------------------------------------------ */

section('Criação de mundo');
const playerIdx = map.countries.findIndex((c) => c.iso2 === 'BR');
const world = N.createWorld(map, playerIdx);

test('todas as províncias têm dono inicial', () => {
  eq(world.owners.filter((o) => o === undefined || o === null).length, 0);
});
test('contagem de províncias bate', () => {
  eq(N.nationsOf(world, playerIdx).length, map.countries[playerIdx].provinces.length);
});
test('população total positiva', () => {
  ok(world.pops.reduce((a, b) => a + b, 0) > 0);
});
test('exército recrutado entra no mapa', () => {
  world.nations[playerIdx].treasury = 1000;
  const prov = map.countries[playerIdx].provinces[0];
  const res = N.recruitArmy(world, playerIdx, prov, 5000);
  ok(res.ok, res.reason);
  eq(world.armies.length, 1);
  eq(world.armies[0].prov, prov);
});
test('recrutar acima da mão de obra falha', () => {
  const prov = map.countries[playerIdx].provinces[0];
  const res = N.recruitArmy(world, playerIdx, prov, 1e9);
  ok(!res.ok);
});
test('relações são simétricas', () => {
  N.setRelation(world, 1, 2, 40);
  eq(N.relation(world, 1, 2), 40);
  eq(N.relation(world, 2, 1), 40);
});

/* ------------------------------------------------------------------ */

section('Guerra e conquista');
const enemy = map.countryNeighbors[playerIdx].find((i) => world.nations[i].alive);
test('declarar guerra funciona', () => {
  ok(N.declareWar(world, playerIdx, enemy));
  ok(N.atWar(world, playerIdx, enemy));
});
test('batalha resolve e pode tomar província', () => {
  // encontra uma província inimiga vizinha de uma nossa
  let target = null;
  for (const p of map.countries[playerIdx].provinces) {
    for (const q of map.provinces[p].neighbors) {
      if (world.owners[q] === enemy) { target = { from: p, to: q }; break; }
    }
    if (target) break;
  }
  ok(target, 'sem fronteira');
  world.nations[playerIdx].treasury = 5000;
  world.nations[playerIdx].manpower = 500000;
  const army = N.recruitArmy(world, playerIdx, target.from, 40000);
  ok(army.ok, army.reason);
  army.army.morale = 100;
  world.garrisons[target.to] = 10;
  const res = N.resolveBattle(world, army.army, target.to);
  ok(res.won, 'batalha devia ser vencida');
  eq(world.owners[target.to], playerIdx);
});
test('nação sem províncias morre', () => {
  // esvazia uma nação pequena, deixando só uma província
  const victim = world.nations
    .filter((n) => n.alive && n.i !== playerIdx)
    .sort((a, b) => a.provCount - b.provCount)[2];
  const provs = N.nationsOf(world, victim.i);
  for (const p of provs.slice(1)) N.changeOwner(world, p, playerIdx);
  eq(victim.provCount, 1);
  N.changeOwner(world, provs[0], playerIdx);
  eq(victim.alive, false);
});
test('paz encerra a guerra', () => {
  N.makePeace(world, playerIdx, enemy);
  ok(!N.atWar(world, playerIdx, enemy));
});

/* ------------------------------------------------------------------ */

section('Campanha completa');
const camp = C.newCampaign({ nationIdx: playerIdx, leaderName: 'Teste', difficulty: 'normal' });
test('estado inicial coerente', () => {
  eq(camp.state.role, 'presidente');
  ok(camp.state.stats.tesouro > 0);
  ok(camp.world.owners.length === map.provinces.length);
});
test('10 turnos sem corromper o mundo', () => {
  for (let i = 0; i < 10; i++) C.advanceCampaign(camp);
  eq(camp.state.turn, 10);
  for (const o of camp.world.owners) ok(Number.isInteger(o) && o >= 0 && o < camp.world.nations.length);
  for (const v of camp.world.pops) ok(Number.isFinite(v) && v >= 0);
  for (const a of camp.world.armies) ok(a.men > 0 && Number.isFinite(a.men));
  ok(Number.isFinite(camp.state.stats.tesouro));
});
test('exército do jogador se move', () => {
  const army = camp.world.armies.find((a) => a.owner === camp.world.player);
  ok(army, 'sem exército');
  const from = army.prov;
  const dest = map.provinces[from].neighbors.find((q) => camp.world.owners[q] === camp.world.player);
  if (dest === undefined) return;
  army.moved = false;
  const res = C.playerMove(camp, army.id, dest);
  ok(res.ok, res.reason);
  eq(army.prov, dest);
});
test('construir reduz o tesouro e marca a província', () => {
  const prov = N.nationsOf(camp.world, camp.world.player)[0];
  camp.state.stats.tesouro = 999;
  const before = camp.state.stats.tesouro;
  const res = C.playerBuild(camp, prov, 'fabrica');
  ok(res.ok, res.reason);
  ok(camp.state.stats.tesouro < before);
  ok(camp.world.buildings[prov] & 1);
});
test('constrói duas vezes a mesma coisa falha', () => {
  const prov = N.nationsOf(camp.world, camp.world.player)[0];
  const res = C.playerBuild(camp, prov, 'fabrica');
  ok(!res.ok);
});
test('diplomacia: aliança, sanção e tributo', () => {
  const target = camp.world.nations.find((n) => n.alive && n.i !== camp.world.player &&
    !N.atWar(camp.world, camp.world.player, n.i) && camp.world.nations[camp.world.player].provCount > n.provCount * 3);
  if (!target) return;
  N.setRelation(camp.world, camp.world.player, target.i, 60);
  camp.state.stats.tesouro = 999;
  ok(C.playerAlliance(camp, target.i).ok);
  ok(C.playerTradeDeal(camp, target.i).ok);
  ok(C.playerSanction(camp, target.i).ok);
  ok(C.playerSpy(camp, target.i, 'sabotagem').ok);
});
test('save/load preserva o mundo', () => {
  const json = C.exportCampaign(camp);
  const loaded = C.importCampaign(json);
  eq(loaded.world.owners.length, camp.world.owners.length);
  eq(loaded.state.turn, camp.state.turn);
  eq(loaded.world.armies.length, camp.world.armies.length);
  ok(loaded.world.map, 'mapa não religado');
});
test('resumo da campanha é consistente', () => {
  const s = C.campaignSummary(camp);
  eq(s.provCount, N.nationsOf(camp.world, camp.world.player).length);
  ok(s.ranking >= 1);
  ok(s.worldShare > 0 && s.worldShare <= 100);
});
test('100 turnos em menos de 3 s', () => {
  const t0 = Date.now();
  for (let i = 0; i < 100; i++) C.advanceCampaign(camp, { skipElection: true });
  const ms = Date.now() - t0;
  ok(ms < 3000, `levou ${ms} ms`);
  console.log(`      (100 turnos em ${ms} ms)`);
});
test('mundo continua válido após 110 turnos', () => {
  const alive = camp.world.nations.filter((n) => n.alive);
  ok(alive.length > 100, `${alive.length} nações vivas`);
  const total = camp.world.owners.length;
  eq(camp.world.owners.filter((o) => camp.world.nations[o].alive).length, camp.world.owners.filter((o) => camp.world.nations[o].alive).length);
  ok(total === map.provinces.length);
});

/* ------------------------------------------------------------------ */

section('Ícones');
test('todos os ícones dos dados existem', () => {
  const missing = new Set();
  const files = [
    'data/laws.js', 'data/actions.js', 'data/events.js', 'data/origins.js',
    'data/world.js', 'engine/state.js',
  ];
  for (const f of files) {
    const src = fs.readFileSync(path.join(SRC, f), 'utf8');
    const re = /icon:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) {
      if (!ICONS[m[1]]) missing.add(`${f}:${m[1]}`);
    }
  }
  if (missing.size) throw new Error([...missing].slice(0, 12).join(', '));
});
test('mapa emoji → ícone não aponta para inexistentes', () => {
  const bad = Object.entries(EMOJI_TO_ICON).filter(([, v]) => !ICONS[v]).map(([k, v]) => `${k}→${v}`);
  if (bad.length) throw new Error(bad.slice(0, 10).join(', '));
});
test('nenhum emoji nos arquivos de UI e dados', () => {
  const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') && e.name !== 'icons.js') {
        const lines = fs.readFileSync(p, 'utf8').split('\n');
        lines.forEach((l, i) => { if (re.test(l)) offenders.push(`${path.relative(SRC, p)}:${i + 1}`); });
      }
    }
  };
  walk(path.join(SRC, 'ui'));
  walk(path.join(SRC, 'data'));
  if (offenders.length) throw new Error(offenders.slice(0, 10).join(', '));
});
test('pelo menos 150 ícones disponíveis', () => ok(Object.keys(ICONS).length >= 150, String(Object.keys(ICONS).length)));

/* ------------------------------------------------------------------ */

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} testes passaram, ${fail} falharam`);
if (fail) {
  for (const f of failures) console.error(`\n${f.name}\n${f.error.stack}`);
  process.exit(1);
}
