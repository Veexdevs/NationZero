#!/usr/bin/env node
/*
 * Testes de interface do NationZero com jsdom.
 * Roda o app de verdade (menu → setup → jogo) e simula cliques.
 *   npm run test:ui
 */

import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'www', 'src');
const mod = (p) => pathToFileURL(path.join(SRC, p)).href;

const dom = new JSDOM(
  `<!DOCTYPE html><html><body><div id="app"></div><div id="modal-root"></div><div id="toast-root"></div></body></html>`,
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
global.URL = dom.window.URL;
global.FileReader = dom.window.FileReader;
global.confirm = () => true;
global.alert = () => {};
dom.window.scrollTo = () => {};
dom.window.confirm = () => true;

let failures = 0;
let passes = 0;
const ok = (cond, msg) => {
  if (cond) { passes++; console.log(`  ✓ ${msg}`); }
  else { failures++; console.error(`  ✗ ${msg}`); }
};
const click = (sel) => {
  const el = document.querySelector(sel);
  if (el) el.click();
  return !!el;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const app = (await import(mod('ui/app.js'))).app;
const M = await import(mod('ui/modals.js'));
const P = await import(mod('engine/politics.js'));
const S = await import(mod('engine/state.js'));
const W = await import(mod('engine/world.js'));

console.log('\n== Navegação básica ==');
ok(!!document.querySelector('.menu-title'), 'menu principal renderiza');
app.screen = 'setup';
app.render();
ok(!!document.getElementById('setup-nation'), 'tela de criação de nação renderiza');

console.log('\n== Novo jogo ==');
app.newGame({
  nationName: 'Testilândia', capital: 'Nova Aurora', leaderName: 'Alex',
  motto: 'Testar e vencer', flag: '⚡', origin: 'estudante', difficulty: 'dificil',
});
ok(app.screen === 'game', 'jogo inicia');
ok(!!document.querySelector('.head'), 'cabeçalho do jogo renderiza');
ok(!!document.querySelector('.turn-btn'), 'botão de avançar mês existe');
ok(app.state.role === 'cidadao', 'começa como cidadão');

for (const tab of ['overview', 'laws', 'actions', 'power', 'economy', 'politics', 'world', 'chronicle', 'legacy']) {
  app.tab = tab;
  app.render();
  const title = document.querySelector('.screen-title')?.textContent?.trim() || '';
  ok(title.length > 0, `aba "${tab}" renderiza (${title})`);
}

console.log('\n== Partido ==');
app.tab = 'politics';
app.render();
M.showPartyModal(app);
document.querySelector('#party-name').value = 'Partido do Teste';
document.querySelector('#party-sigla').value = 'PDT';
document.querySelector('#party-create').click();
ok(app.state.party?.sigla === 'PDT', 'partido criado pela interface');
ok(app.state.role === 'lider_partido', 'promoção a líder de partido');

console.log('\n== Leis pela interface ==');
const r1 = P.enactLaw(app.state, 'liberdade_imprensa');
ok(r1.ok, 'lei aprovada');
ok(P.repealLaw(app.state, 'liberdade_imprensa').ok, 'lei revogada');

console.log('\n== Modais ==');
M.showSpeechModal(app);
ok(click('[data-topic]'), 'discurso executado');
M.showDecreeModal(app);
document.querySelector('#decree-name').value = 'Decreto de Teste';
document.querySelector('[data-decree]').click();
document.querySelector('#decree-go').click();
ok(app.state.custom.length === 1, 'decreto personalizado publicado');
M.showHelp(app); ok(click('[data-close]'), 'ajuda abre e fecha');
M.showSettings(app); ok(click('[data-close]'), 'ajustes abrem e fecham');

console.log('\n== Golpe, purga e plebiscito ==');
Object.assign(app.state.stats, { lealdadeMilitar: 96, poder: 96 });
app.state.institutions.militar = 92;
app.state.factions.militares = 95;
M.showCoupModal(app, 'golpe_militar');
ok(click('#confirm-coup'), 'golpe executado');
ok(!!app.state.role, `novo cargo após golpe: ${app.state.role} / ${app.state.regime}`);
click('[data-close]');
app.state.over = null;
app.state.role = 'ditador';
app.state.regime = 'autoritarismo';
M.showPurgeModal(app);
ok(click('#purge-go'), 'purga executada');
M.showPlebisciteModal(app);
ok(click('[data-q]'), 'plebiscito executado');

console.log('\n== Mundo ==');
M.showTargetModal(app, 'espionar_pais');
ok(click('[data-target]'), 'espionagem executada pela interface');
app.state.stats.influencia = 60;
ok(W.signTreaty(app.state, 'valdoria', 'comercio').ok, 'tratado assinado');
ok(W.declareWar(app.state, 'zangaro').ok, 'guerra declarada');

console.log('\n== 120 meses de jogo ==');
let months = 0;
while (months < 120 && !app.state.over) {
  app.advance();
  months++;
  let guard = 0;
  while (document.querySelector('.modal-backdrop') && guard < 300) {
    guard++;
    const btn = document.querySelector('[data-evt-choice]') || document.querySelector('[data-close]')
      || document.querySelector('.modal .btn.primary') || document.querySelector('.modal .btn');
    if (!btn) break;
    btn.click();
    await sleep(2);
  }
}
ok(months >= 10, `rodou ${months} meses com eventos (${app.state.over ? `fim: ${app.state.over.title}` : 'sem fim'})`);
app.render();
ok(!!document.querySelector('.main'), 'renderiza depois de tantos meses');

const bad = Object.keys(S.STATS).filter((k) => {
  const [min, max] = S.statKeyLimit(k);
  return !(app.state.stats[k] >= min - 0.001 && app.state.stats[k] <= max + 0.001);
});
ok(bad.length === 0, 'nenhum atributo fora dos limites', bad.join(', '));

console.log('\n== Save/Load e fim de jogo ==');
S.saveState(app.state);
ok(S.loadState()?.meta.nationName === 'Testilândia', 'save e load pela interface');
app.state.over = { type: 'test', title: 'Teste', text: 'fim', icon: '🏁' };
app.screen = 'gameover';
app.render();
ok(!!document.querySelector('.gameover-title'), 'tela de fim de jogo renderiza');

console.log(`\n${failures === 0 ? '✅' : '❌'} ${passes} testes de UI passaram, ${failures} falharam\n`);
process.exit(failures === 0 ? 0 : 1);
