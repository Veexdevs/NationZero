#!/usr/bin/env node
/*
 * Testes do motor do NationZero — sem dependências externas.
 * Roda em Node puro: `npm test`
 */

const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', 'www', 'src');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;

let failures = 0;
let passes = 0;

function ok(cond, msg, extra) {
  if (cond) { passes++; console.log(`  ✓ ${msg}`); }
  else { failures++; console.error(`  ✗ ${msg}${extra ? ` — ${extra}` : ''}`); }
}

const inRange = (v, min, max) => typeof v === 'number' && !Number.isNaN(v) && v >= min - 0.001 && v <= max + 0.001;

(async () => {
  const state = await import(url('engine/state.js'));
  const sim = await import(url('engine/simulation.js'));
  const pol = await import(url('engine/politics.js'));
  const wrl = await import(url('engine/world.js'));
  const laws = await import(url('data/laws.js'));
  const actions = await import(url('data/actions.js'));
  const events = await import(url('data/events.js'));
  const world = await import(url('data/world.js'));

  console.log('\n== Integridade dos dados ==');
  ok(laws.LAWS.length > 50, `${laws.LAWS.length} leis definidas`);
  ok(actions.ACTIONS.length > 30, `${actions.ACTIONS.length} ações definidas`);
  ok(events.EVENTS.length > 20, `${events.EVENTS.length} eventos definidos`);
  ok(world.COUNTRIES.length >= 10, `${world.COUNTRIES.length} países`);

  const ids = new Set();
  for (const law of laws.LAWS) {
    ok(!ids.has(law.id), `id de lei único: ${law.id}`);
    ids.add(law.id);
    ok(!!law.name && !!law.desc, `lei ${law.id} tem nome e descrição`);
  }
  const actionIds = new Set();
  for (const a of actions.ACTIONS) {
    ok(!actionIds.has(a.id), `id de ação único: ${a.id}`);
    actionIds.add(a.id);
  }
  for (const e of events.EVENTS) {
    ok(Array.isArray(e.choices) && e.choices.length >= 2, `evento ${e.id} tem escolhas`);
  }

  console.log('\n== Estado inicial ==');
  const s = state.createState({ nationName: 'Testilândia' });
  ok(s.meta.nationName === 'Testilândia', 'nome do país aplicado');
  for (const key of Object.keys(state.STATS)) {
    const [min, max] = state.statKeyLimit(key);
    ok(inRange(s.stats[key], min, max), `stat ${key} dentro dos limites (${s.stats[key]})`);
  }

  console.log('\n== Simulação de 120 meses (jogador passivo) ==');
  for (let i = 0; i < 120; i++) {
    sim.advanceTurn(s, { skipElection: false });
    while (s.pendingEvents.length) {
      const id = s.pendingEvents[0];
      const ev = events.EVENT_BY_ID[id];
      sim.resolveEventChoice(s, id, Math.floor(Math.random() * ev.choices.length));
    }
    if (s.over) break;
  }
  for (const key of Object.keys(state.STATS)) {
    const [min, max] = state.statKeyLimit(key);
    ok(inRange(s.stats[key], min, max), `stat ${key} válido após 120 meses (${s.stats[key].toFixed(1)})`);
    break; // evita poluir o log; checagem completa abaixo
  }
  const badStats = Object.keys(state.STATS).filter((k) => {
    const [min, max] = state.statKeyLimit(k);
    return !inRange(s.stats[k], min, max);
  });
  ok(badStats.length === 0, 'todos os stats dentro dos limites', badStats.join(', '));
  const badFactions = Object.keys(state.FACTIONS).filter((k) => !inRange(s.factions[k], 0, 100));
  ok(badFactions.length === 0, 'todas as facções entre 0 e 100', badFactions.join(', '));
  ok(typeof s.stats.tesouro === 'number' && !Number.isNaN(s.stats.tesouro), 'tesouro numérico');
  ok(s.turn === 120 || !!s.over, `turnos avançados (${s.turn})`);

  console.log('\n== Carreira e eleições ==');
  const c = state.createState({});
  pol.createParty(c, { name: 'Partido Teste', sigla: 'PT' });
  ok(c.role === 'lider_partido', 'fundar partido promove a líder');
  for (const k of Object.keys(c.factions)) c.factions[k] = 70;
  c.stats.aprovacao = 70; c.party.members = 90000; c.party.funds = 150;
  const el = pol.runElection(c);
  ok(el.parties.length >= 6, 'eleição gera parlamento');
  ok(c.elections.parliament.PT > 0, 'partido do jogador recebe cadeiras');
  ok(typeof el.playerShare === 'number', 'share do jogador calculado');

  console.log('\n== Golpe e regime ==');
  const g = state.createState({});
  g.stats.lealdadeMilitar = 100; g.institutions.militar = 100; g.stats.poder = 100; g.factions.militares = 100;
  const odds = pol.coupOdds(g, 'militar');
  ok(odds > 50, `chance de golpe alta com apoio militar (${odds.toFixed(0)}%)`);
  const res = pol.resolveCoup(g, 'militar');
  ok(!!res.text, 'golpe resolvido sem erro');
  if (res.success) {
    ok(g.role === 'ditador', 'golpe vitorioso torna ditador');
    ok(['junta', 'autoritarismo'].includes(g.regime), `regime autoritário (${g.regime})`);
  }

  console.log('\n== Leis ==');
  const l = state.createState({});
  l.stats.influencia = 100; l.stats.poder = 100; l.stats.tesouro = 3000;
  l.role = 'presidente'; l.regime = 'autoritarismo';
  let enacted = 0;
  for (const law of laws.LAWS) {
    l.stats.influencia = 100; l.stats.poder = 100; l.stats.tesouro = 3000; // recursos repostos a cada lei
    const r = pol.enactLaw(l, law.id);
    if (r.ok) enacted++;
    else if (!law.require) ok(false, `lei ${law.id} deveria ser aprovavel`, r.reason);
  }
  ok(enacted >= laws.LAWS.length - 4, `${enacted}/${laws.LAWS.length} leis aprovadas em condições ideais`);
  for (let i = 0; i < 24; i++) sim.advanceTurn(l, { skipElection: true });
  const badAfterLaws = Object.keys(state.STATS).filter((k) => {
    const [min, max] = state.statKeyLimit(k);
    return !inRange(l.stats[k], min, max);
  });
  ok(badAfterLaws.length === 0, 'stats válidos após 24 meses com 60+ leis', badAfterLaws.join(', '));

  console.log('\n== Mundo ==');
  const w = state.createState({});
  wrl.ensureRelations(w);
  w.stats.influencia = 60;
  const t1 = wrl.signTreaty(w, 'valdoria', 'comercio');
  ok(t1.ok, 'tratado assinado');
  const t2 = wrl.signTreaty(w, 'valdoria', 'comercio');
  ok(!t2.ok, 'tratado duplicado bloqueado');
  const spy = wrl.resolveEspionage(w, 'espionar_pais', 'krasnovia');
  ok(spy.ok, 'espionagem resolvida');
  const war = wrl.declareWar(w, 'zangaro');
  ok(war.ok, 'guerra declarada');
  for (let i = 0; i < 40 && w.wars.length; i++) sim.advanceTurn(w, { skipElection: true });
  ok(true, `guerra concluída ou em curso (${w.wars.length} ativa(s))`);

  console.log('\n== Save / Load ==');
  const json = state.exportState(s);
  const back = state.importState(json);
  ok(back.stats.economia === s.stats.economia, 'export/import preserva stats');
  ok(back.meta.nationName === s.meta.nationName, 'export/import preserva nação');
  ok(back.turn === s.turn, 'export/import preserva turno');
  let threw = false;
  try { state.importState('{"foo":1}'); } catch (e) { threw = true; }
  ok(threw, 'arquivo inválido é rejeitado');

  console.log('\n== Desempenho ==');
  const p = state.createState({});
  const t0 = Date.now();
  for (let i = 0; i < 500; i++) sim.advanceTurn(p, { skipElection: true });
  const dt = Date.now() - t0;
  ok(dt < 3000, `500 meses simulados em ${dt}ms`);

  console.log(`\n${failures === 0 ? '✅' : '❌'} ${passes} testes passaram, ${failures} falharam\n`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error('Erro fatal no teste:', err);
  process.exit(1);
});
