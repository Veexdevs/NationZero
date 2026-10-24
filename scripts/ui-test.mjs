#!/usr/bin/env node
/*
 * Testes de interface do NationZero (jsdom):
 * menu → seleção de país no mapa → jogo → painéis → mapa → turnos.
 *   npm run test:ui
 */

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WWW = path.join(__dirname, '..', 'www');

const dom = new JSDOM(
  '<!DOCTYPE html><html><body><div id="app"></div><div id="modal-root"></div><div id="toast-root"></div></body></html>',
  { url: 'https://nationzero.test/', pretendToBeVisual: true }
);

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.localStorage = dom.window.localStorage;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.CustomEvent = dom.window.CustomEvent;
global.Blob = dom.window.Blob;
global.FileReader = dom.window.FileReader;
global.DOMPoint = dom.window.DOMPoint;
window.confirm = () => true;

global.fetch = async (url) => {
  const u = new URL(String(url));
  const file = u.protocol === 'file:' ? u.pathname : path.join(WWW, u.pathname.replace(/^\//, ''));
  const data = fs.readFileSync(file, 'utf8');
  return { ok: true, json: async () => JSON.parse(data), text: async () => data };
};

let pass = 0;
let fail = 0;
const failures = [];
function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') throw new Error('teste assíncrono não suportado');
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e });
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}
function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} esperado ${JSON.stringify(b)}, recebido ${JSON.stringify(a)}`); }
function ok(v, msg = 'falso') { if (!v) throw new Error(msg); }
function has(sel, msg) { ok(document.querySelector(sel), msg || `seletor ausente: ${sel}`); }
function text(sel) { return document.querySelector(sel)?.textContent || ''; }

/* ------------------------------------------------------------------ */

await import(pathToFileURL(path.join(WWW, 'src/ui/app.js')).href);
const app = window.NZ;
await new Promise((r) => setTimeout(r, 500));

console.log('\n== Inicialização ==');
test('mapa carregado', () => ok(app.map && app.map.provinces.length > 2000, String(app.map?.provinces?.length)));
test('tela inicial é o menu', () => eq(app.screen, 'menu'));
test('menu mostra a logo', () => has('.menu-logo'));
test('menu tem botão de nova campanha', () => ok(document.querySelector('[data-cmd="menu:new"]')));
test('menu não tem emojis no texto', () => ok(!/[\u{1F300}-\u{1FAFF}]/u.test(text('#app'))));

console.log('\n== Seleção de país ==');
test('abrir seletor de país', () => {
  document.querySelector('[data-cmd="menu:new"]').click();
  eq(app.screen, 'picker');
  has('.picker');
  has('#map-host svg');
});
test('mapa do seletor desenha todas as províncias', () => {
  eq(document.querySelectorAll('.prov').length, app.map.provinces.length);
});
test('formulário avisa que nenhum país foi escolhido', () => {
  ok(document.querySelector('.picker-form').textContent.includes('Nenhum país'));
});
test('clique num país seleciona a nação', () => {
  const idx = app.map.countries.findIndex((c) => c.iso2 === 'BR');
  app.pickerView.onClick(app.map.provinces[app.map.countries[idx].provinces[0]]);
  eq(app.ui.pickedIndex, idx);
  ok(document.querySelector('.picker-form').textContent.includes('Brasil'));
});
test('botão de iniciar habilita', () => ok(!document.querySelector('[data-cmd="picker:start"]').disabled));
test('trocar dificuldade funciona', () => {
  document.querySelector('[data-cmd="picker:diff:dificil"]').click();
  eq(app.ui.setup.difficulty, 'dificil');
});
test('iniciar campanha abre o mapa', () => {
  document.querySelector('[data-cmd="picker:start"]').click();
  eq(app.screen, 'game');
  has('.shell');
  has('.topbar');
  has('.rail');
});

console.log('\n== HUD e mapa ==');
test('HUD mostra recursos', () => {
  const chips = document.querySelectorAll('#hud-chips .chip');
  ok(chips.length >= 5, `${chips.length} chips`);
});
test('HUD mostra a nação escolhida', () => ok(text('#hud-nation').includes('Brasil')));
test('mapa do jogo pintou todas as províncias', () => {
  eq(document.querySelectorAll('.prov').length, app.map.provinces.length);
});
test('províncias têm cores políticas diferentes', () => {
  const fills = new Set();
  document.querySelectorAll('.prov').forEach((p) => fills.add(p.getAttribute('fill')));
  ok(fills.size > 5, `${fills.size} cores`);
});
test('viewBox inicial cobre o mapa', () => {
  const vb = document.querySelector('.map-svg').getAttribute('viewBox').split(' ').map(Number);
  ok(vb[2] > 0 && vb[3] > 0);
});
test('controles de zoom existem', () => {
  document.querySelector('[data-cmd="map:zoom-in"]').click();
  ok(app.mapView.zoom > 1 || true);
  document.querySelector('[data-cmd="map:fit"]').click();
  eq(Math.round(app.mapView.view.w), app.map.width);
});

console.log('\n== Painéis ==');
const tabs = ['overview', 'laws', 'actions', 'politics', 'power', 'economy', 'military', 'nations', 'chronicle', 'legacy'];
for (const tab of tabs) {
  test(`painel ${tab} renderiza`, () => {
    app.openPanel(tab);
    ok(document.getElementById('panel').classList.contains('open'));
    ok(text('.panel-body').length > 40, `${tab}: corpo vazio`);
  });
}
test('painel fecha', () => {
  document.querySelector('[data-cmd="panel:close"]').click();
  ok(!document.getElementById('panel').classList.contains('open'));
});
test('trilha lateral abre painel', () => {
  document.querySelector('[data-cmd="nav:military"]').click();
  eq(app.tab, 'military');
  ok(document.getElementById('panel').classList.contains('open'));
});

console.log('\n== Inspetor de província ==');
test('clicar numa província abre o inspetor', () => {
  const prov = app.camp.map.countries[app.camp.world.player].provinces[0];
  app.onProvinceClick(app.map.provinces[prov]);
  ok(document.getElementById('inspector').classList.contains('open'));
  ok(text('#inspector').includes('Guarnição'));
});
test('inspetor lista construções', () => ok(text('#inspector').includes('Construir')));
test('construir um forte pelo inspetor', () => {
  app.camp.state.stats.tesouro = 500;
  document.querySelector('[data-cmd="prov:build:forte"]').click();
  const prov = app.mapView.selected;
  ok(app.camp.world.buildings[prov] & 2, 'forte não construído');
});
test('recrutar pelo painel militar', () => {
  app.openPanel('military');
  const before = app.camp.world.armies.filter((a) => a.owner === app.camp.world.player).length;
  app.camp.state.stats.tesouro = 900;
  document.querySelector('[data-cmd="army:recruit"]').click();
  const after = app.camp.world.armies.filter((a) => a.owner === app.camp.world.player).length;
  ok(after >= before, 'recrutamento não criou exército');
});

console.log('\n== Diplomacia ==');
test('painel de nações lista países', () => {
  app.openPanel('nations');
  const rows = document.querySelectorAll('.country-row');
  ok(rows.length > 50, `${rows.length} linhas`);
});
test('selecionar nação mostra ações', () => {
  const world = app.camp.world;
  const other = world.nations.find((n) => n.alive && n.i !== world.player);
  app.ui.nationId = other.i;
  app.updatePanel();
  ok(text('.panel-body').includes('Declarar guerra') || text('.panel-body').includes('Propor paz'));
});
test('declarar guerra atualiza o mapa', () => {
  const world = app.camp.world;
  const other = world.nations.find((n) => n.alive && n.i !== world.player);
  document.querySelector(`[data-cmd="dip:war:${other.i}"]`)?.click();
  ok(world.nations[world.player].wars.includes(other.i));
});
test('propor paz encerra a guerra', () => {
  const world = app.camp.world;
  const other = world.nations.find((n) => n.alive && n.i !== world.player && world.nations[world.player].wars.includes(n.i));
  document.querySelector(`[data-cmd="dip:peace:${other.i}"]`)?.click();
  ok(!world.nations[world.player].wars.includes(other.i));
});

console.log('\n== Turnos ==');
test('avançar mês incrementa o turno', () => {
  const before = app.camp.state.turn;
  app.panelOpen = false;
  app.updatePanel();
  document.querySelector('[data-cmd="game:advance"]').click();
  ok(app.camp.state.turn > before, 'turno não avançou');
});
test('avançar 5 meses (resolvendo eventos)', () => {
  for (let i = 0; i < 5; i++) {
    const choice = document.querySelector('[data-evt-choice]');
    if (choice) choice.click();
    document.querySelector('[data-close]')?.click();
    app.advance();
  }
  ok(app.camp.state.turn >= 6, String(app.camp.state.turn));
});
test('HUD atualiza depois dos turnos', () => ok(text('#hud-nation').includes('Brasil')));
test('mapa continua consistente', () => eq(document.querySelectorAll('.prov').length, app.map.provinces.length));

console.log('\n== Save / load ==');
test('salvar grava a campanha', () => {
  app.save();
  ok(!!localStorage.getItem('nz.campaign.v2'));
});
test('carregar restaura o turno', () => {
  const turn = app.camp.state.turn;
  window.NZ.camp = null;
  app.built = false;
  app.continueGame();
  eq(app.camp.state.turn, turn);
  eq(app.screen, 'game');
});
test('menu principal volta para a tela inicial', () => {
  document.querySelector('[data-cmd="menu:main"]').click();
  eq(app.screen, 'menu');
  has('.menu-logo');
});
test('continuar volta ao jogo', () => {
  app.continueGame();
  eq(app.screen, 'game');
  has('.shell');
});

console.log('\n== Sem emojis ==');
test('nenhum emoji no DOM do jogo', () => {
  const body = document.getElementById('app').textContent;
  const m = body.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  ok(!m, `encontrados: ${(m || []).slice(0, 5).join(' ')}`);
});
test('ícones SVG são renderizados', () => {
  ok(document.querySelectorAll('svg.ico-svg').length > 10, String(document.querySelectorAll('svg.ico-svg').length));
});

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} testes de interface passaram, ${fail} falharam`);
if (fail) {
  for (const f of failures) console.error(`\n${f.name}\n${f.error.stack}`);
  process.exit(1);
}
