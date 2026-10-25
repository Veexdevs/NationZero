/* Painéis do mapa: forças armadas, nações, inspetor de província. */

import { icon } from './icons.js';
import { esc, num, money, barColor } from './dom.js';
import { nationPower, nationIncome, nationUpkeep, atWar, relation } from '../engine/nations.js';
import { labelBuild } from '../engine/campaign.js';
import { fmtMen } from './map.js';

const nationOf = (app, i) => app.camp.world.nations[i];
const provOf = (app, i) => app.camp.map.provinces[i];

/* =================================================================== */
/* Militar                                                             */
/* =================================================================== */

export function renderMilitary(app) {
  const { world, map, state } = app.camp;
  const me = world.player;
  const nation = world.nations[me];
  const power = nationPower(world, me);
  const income = Math.round(nationIncome(world, me));
  const upkeep = Math.round(nationUpkeep(world, me));
  const armies = world.armies.filter((a) => a.owner === me);
  const wars = nation.wars.filter((w) => world.nations[w]?.alive);

  const recruitCost = Math.round(Math.max(100, nation.manpower * 0.02) * 0.02);

  return `
    <div class="screen-head">
      <div>
        <div class="screen-title">Forças armadas</div>
        <div class="screen-sub">${fmtMen(power.men)} em campo · ${fmtMen(power.garrisons)} em guarnições</div>
      </div>
      <span class="pill ${wars.length ? 'bad' : 'good'}">${icon(wars.length ? 'swords' : 'shield-check', 13)} ${wars.length ? `${wars.length} guerra(s)` : 'Em paz'}</span>
    </div>

    <div class="grid cols-3" style="margin-bottom:10px">
      <div class="stat"><div class="lbl">${icon('users', 12)} Tropa</div><div class="val">${fmtMen(power.men)}</div></div>
      <div class="stat"><div class="lbl">${icon('shield', 12)} Reserva</div><div class="val">${fmtMen(nation.manpower)}</div></div>
      <div class="stat"><div class="lbl">${icon('coins', 12)} Saldo</div><div class="val" style="color:${income - upkeep >= 0 ? 'var(--good)' : 'var(--danger)'}">${income - upkeep >= 0 ? '+' : ''}${income - upkeep}</div></div>
    </div>

    <div class="card">
      <div class="card-title">${icon('shield', 13)} Recrutar</div>
      <div class="row between" style="margin-bottom:8px">
        <span class="small dim">${esc(provOf(app, app.ui.recruitProv ?? nation.capital).name)}</span>
      </div>
      <div class="row gap-8">
        <input type="range" min="500" max="${Math.max(1000, Math.floor(Math.min(nation.manpower, 30000)))}" step="100"
          value="${Math.min(5000, Math.max(500, Math.floor(nation.manpower / 4)))}" id="recruit-range" class="grow" />
        <span class="val" id="recruit-val">5.000</span>
      </div>
      <div class="row between mt-8">
        <span class="small dim" id="recruit-cost">custo N$ ${recruitCost} bi</span>
        <button class="btn small primary" data-cmd="army:recruit">Recrutar</button>
      </div>
      <div class="small dim mt-8">Recrutar usa mão de obra da nação e reduz um pouco a aprovação.</div>
    </div>

    <div class="card">
      <div class="card-title">${icon('flag', 13)} Exércitos (${armies.length})</div>
      <div class="list">
        ${armies.length ? armies.map((a) => `
          <div class="army-row ${app.ui.armyId === a.id ? 'selected' : ''}" data-cmd="army:focus:${a.id}">
            <span style="color:${nation.color}">${icon('shield', 16)}</span>
            <span class="grow">
              <b>${esc(provOf(app, a.prov).name)}</b>
              <div class="small dim">${a.moved ? 'já se moveu neste turno' : 'pronto para marchar'}</div>
            </span>
            <span class="men">${fmtMen(a.men)}</span>
            <span class="morale"><i style="width:${a.morale}%"></i></span>
            <button class="btn small ghost" data-cmd="army:disband:${a.id}" title="Desmobilizar">${icon('x', 13)}</button>
          </div>`).join('') : '<div class="empty">Nenhum exército em campo. Recrute tropas ou construa bases.</div>'}
      </div>
      <div class="small dim mt-8">${icon('move', 12)} Selecione um exército e clique numa província vizinha no mapa para marchar.</div>
    </div>

    <div class="card">
      <div class="card-title">${icon('swords', 13)} Guerras</div>
      ${wars.length ? `<div class="list">${wars.map((w) => {
        const n = world.nations[w];
        return `<div class="row between">
          <span class="row gap-8"><span style="color:${n.color}">${icon('flag', 14)}</span>${esc(n.name)}</span>
          <span class="row gap-8">
            <span class="pill ${relation(world, me, w) > -50 ? 'warn' : 'bad'}">${Math.round(relation(world, me, w))}</span>
            <button class="btn small" data-cmd="dip:peace:${w}">Paz</button>
          </span>
        </div>`;
      }).join('')}</div>` : '<div class="empty">Sem guerras ativas.</div>'}
      ${nation.allies.length ? `<div class="small dim mt-8">Aliados: ${nation.allies.map((a) => esc(world.nations[a].name)).join(', ')}</div>` : ''}
    </div>

    <div class="card">
      <div class="card-title">${icon('map', 13)} Frente mais próxima</div>
      ${nearestEnemyHint(app)}
    </div>`;
}

function nearestEnemyHint(app) {
  const { world } = app.camp;
  const me = world.player;
  const wars = world.nations[me].wars.filter((w) => world.nations[w]?.alive);
  if (!wars.length) {
    return `<div class="small dim">Você não está em guerra. Declare guerra no painel de nações ou clique numa província estrangeira.</div>`;
  }
  const counts = wars.map((w) => ({ n: world.nations[w], provs: world.owners.filter((o) => o === w).length }));
  return `<div class="list">${counts.map((c) => `<div class="row between"><span>${esc(c.n.name)}</span><span class="dim small">${c.provs} províncias</span></div>`).join('')}</div>`;
}

/* =================================================================== */
/* Nações                                                              */
/* =================================================================== */

export function renderNations(app) {
  const { world } = app.camp;
  const me = world.player;
  const list = world.nations.filter((n) => n.alive)
    .map((n) => ({ n, power: nationPower(world, n.i).total }))
    .sort((a, b) => b.power - a.power);
  const focus = app.ui.nationId !== null && app.ui.nationId !== undefined ? world.nations[app.ui.nationId] : null;

  return `
    <div class="screen-head">
      <div>
        <div class="screen-title">Nações do mundo</div>
        <div class="screen-sub">${list.length} países vivos · ${app.camp.map.provinces.length} províncias</div>
      </div>
      <span class="pill info">${icon('globe-2', 13)} ${app.camp.map.countries.length} originais</span>
    </div>

    ${focus ? renderNationDetail(app, focus) : '<div class="card"><div class="small dim">Selecione uma nação para ver detalhes, relações e ações diplomáticas.</div></div>'}

    <div class="card">
      <div class="card-title">${icon('bar-chart', 13)} Ranking de poder</div>
      <div class="list" style="max-height:340px;overflow:auto">
        ${list.map((x, i) => `
          <div class="country-row" data-cmd="dip:focus:${x.n.i}">
            <span class="pr" style="width:20px">${i + 1}</span>
            <span class="swatch" style="background:${x.n.color}"></span>
            <span class="nm">${esc(x.n.name)}${x.n.i === me ? ' <span class="dim">(você)</span>' : ''}</span>
            ${atWar(world, me, x.n.i) ? `<span class="pill bad">${icon('swords', 11)}</span>` : ''}
            <span class="pr">${x.n.provCount}p</span>
            <span class="pr">${fmtMen(x.power)}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function renderNationDetail(app, n) {
  const { world } = app.camp;
  const me = world.player;
  if (n.i === me) {
    return `<div class="card">
      <div class="card-title">${icon('flag', 13)} ${esc(n.name)} — seu país</div>
      <div class="grid cols-2">
        <div class="stat"><div class="lbl">Províncias</div><div class="val">${n.provCount}</div></div>
        <div class="stat"><div class="lbl">Tesouro</div><div class="val">${money(n.treasury)}</div></div>
        <div class="stat"><div class="lbl">Estabilidade</div><div class="val">${Math.round(n.stability)}%</div></div>
        <div class="stat"><div class="lbl">Poder militar</div><div class="val">${fmtMen(nationPower(world, me).total)}</div></div>
      </div>
    </div>`;
  }
  const rel = Math.round(relation(world, me, n.i));
  const war = atWar(world, me, n.i);
  const ally = world.nations[me].allies.includes(n.i);
  const sanctioned = world.nations[me].sanctions.includes(n.i);
  const relTone = rel > 35 ? 'good' : rel > -20 ? 'info' : rel > -60 ? 'warn' : 'bad';

  return `
    <div class="card">
      <div class="card-title"><span class="swatch" style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${n.color}"></span> ${esc(n.name)}</div>
      <div class="row wrap gap-8" style="margin-bottom:8px">
        <span class="pill ${relTone}">${icon('handshake', 12)} Relação ${rel}</span>
        ${war ? `<span class="pill bad">${icon('swords', 12)} Em guerra</span>` : ''}
        ${ally ? `<span class="pill good">${icon('shield-check', 12)} Aliado</span>` : ''}
        ${sanctioned ? `<span class="pill warn">${icon('ban', 12)} Sancionada</span>` : ''}
      </div>
      <div class="grid cols-2">
        <div class="stat"><div class="lbl">Províncias</div><div class="val">${n.provCount}</div></div>
        <div class="stat"><div class="lbl">Tropa</div><div class="val">${fmtMen(nationPower(world, n.i).total)}</div></div>
        <div class="stat"><div class="lbl">Estabilidade</div><div class="val">${Math.round(n.stability)}%</div></div>
        <div class="stat"><div class="lbl">Desenvolvimento</div><div class="val">${Math.round(n.dev)}</div></div>
      </div>
      <div class="grid cols-2 mt-10" style="gap:6px">
        ${war
          ? `<button class="btn small danger" data-cmd="dip:peace:${n.i}">${icon('handshake', 13)} Propor paz</button>`
          : `<button class="btn small danger" data-cmd="dip:war:${n.i}">${icon('swords', 13)} Declarar guerra</button>`}
        ${ally
          ? `<button class="btn small" data-cmd="dip:break:${n.i}">${icon('unlink', 13)} Romper aliança</button>`
          : `<button class="btn small" data-cmd="dip:ally:${n.i}">${icon('shield-check', 13)} Aliança</button>`}
        <button class="btn small" data-cmd="dip:trade:${n.i}">${icon('coins', 13)} Acordo comercial</button>
        <button class="btn small" data-cmd="dip:sanction:${n.i}">${icon('ban', 13)} Sancionar</button>
        <button class="btn small" data-cmd="dip:spy:${n.i}:sabotagem">${icon('user-search', 13)} Espionagem</button>
        <button class="btn small" data-cmd="dip:improve:${n.i}">${icon('hand-heart', 13)} Melhorar relações</button>
        <button class="btn small" data-cmd="dip:tribute:${n.i}">${icon('coins', 13)} Exigir tributo</button>
        <button class="btn small" data-cmd="dip:goto:${n.i}">${icon('locate-fixed', 13)} Ver no mapa</button>
      </div>
    </div>`;
}

/* =================================================================== */
/* Inspetor de província                                               */
/* =================================================================== */

export function renderInspector(app) {
  const idx = app.mapView?.selected;
  if (idx === null || idx === undefined) return '';
  const { world, map, state } = app.camp;
  const prov = map.provinces[idx];
  const owner = world.owners[idx];
  const nation = world.nations[owner];
  const mine = owner === world.player;
  const core = world.core[idx];
  const armies = world.armies.filter((a) => a.prov === idx);
  const build = world.buildings[idx];

  return `
    <div class="inspector-head">
      <div style="flex:1;min-width:0">
        <div class="panel-title">${esc(prov.name)}${prov.capital ? ` <span class="pill power" style="font-size:9px;padding:1px 6px">capital</span>` : ''}</div>
        <div class="small dim">${esc(nation?.name || '—')}${core !== owner ? ` · núcleo de ${esc(world.nations[core]?.name || '—')}` : ''}</div>
      </div>
      <button class="btn small ghost panel-close" data-cmd="prov:close">${icon('x', 14)}</button>
    </div>
    <div class="inspector-body">
      <div class="grid cols-2" style="gap:6px;margin-bottom:8px">
        <div class="stat"><div class="lbl">População</div><div class="val">${num(world.pops[idx] / 1e6, 2)} mi</div></div>
        <div class="stat"><div class="lbl">Desenvolvimento</div><div class="val">${world.devs[idx]}</div></div>
        <div class="stat"><div class="lbl">Guarnição</div><div class="val">${fmtMen(world.garrisons[idx])}</div></div>
        <div class="stat"><div class="lbl">Turbulência</div><div class="val" style="color:${barColor(100 - world.unrests[idx])}">${Math.round(world.unrests[idx])}</div></div>
      </div>

      ${armies.length ? `<div class="card" style="padding:8px 9px;margin-bottom:8px">
        <div class="card-title" style="margin-bottom:5px">${icon('shield', 12)} Exércitos aqui</div>
        ${armies.map((a) => `<div class="row between small"><span>${esc(world.nations[a.owner].name)}</span><span>${fmtMen(a.men)}</span></div>`).join('')}
      </div>` : ''}

      ${build ? `<div class="row wrap gap-8" style="margin-bottom:8px">
        ${build & 1 ? `<span class="pill">${icon('factory', 12)} Fábrica</span>` : ''}
        ${build & 2 ? `<span class="pill">${icon('castle', 12)} Forte</span>` : ''}
        ${build & 4 ? `<span class="pill">${icon('anchor', 12)} Porto</span>` : ''}
        ${build & 8 ? `<span class="pill">${icon('school', 12)} Escola</span>` : ''}
        ${build & 16 ? `<span class="pill">${icon('radio-tower', 12)} Base</span>` : ''}
      </div>` : ''}

      ${mine ? `
        <div class="card" style="padding:9px">
          <div class="card-title" style="margin-bottom:6px">${icon('hammer', 12)} Construir</div>
          <div class="grid cols-2" style="gap:5px">
            ${['fabrica', 'forte', 'porto', 'escola', 'base'].map((k) => `
              <button class="btn small" data-cmd="prov:build:${k}" ${build & { fabrica: 1, forte: 2, porto: 4, escola: 8, base: 16 }[k] ? 'disabled' : ''}>
                ${icon({ fabrica: 'factory', forte: 'castle', porto: 'anchor', escola: 'school', base: 'radio-tower' }[k], 12)} ${labelBuild(k)}
              </button>`).join('')}
          </div>
        </div>
        <div class="row gap-8">
          <button class="btn small primary grow" data-cmd="army:recruit-here">${icon('shield', 13)} Recrutar aqui</button>
          <button class="btn small grow" data-cmd="army:focus-here">${icon('crosshair', 13)} Selecionar exército</button>
        </div>
      ` : `
        <div class="grid cols-2" style="gap:5px">
          ${atWar(world, world.player, owner)
            ? `<button class="btn small danger" data-cmd="dip:peace:${owner}">${icon('handshake', 12)} Paz</button>`
            : `<button class="btn small danger" data-cmd="dip:war:${owner}">${icon('swords', 12)} Guerra</button>`}
          <button class="btn small" data-cmd="dip:improve:${owner}">${icon('hand-heart', 12)} Relações</button>
          <button class="btn small" data-cmd="dip:spy:${owner}:sabotagem">${icon('user-search', 12)} Espionar</button>
          <button class="btn small" data-cmd="prov:annex">${icon('flag', 12)} Anexar (N$ 80)</button>
        </div>
        <div class="small dim mt-8">Mover um exército para cá exige guerra e adjacência.</div>
      `}

      ${app.ui.armyId ? `<div class="small dim mt-8">${icon('move', 12)} Exército selecionado. Clique numa província vizinha para marchar.</div>` : ''}
    </div>`;
}

/* =================================================================== */
/* HUD                                                                 */
/* =================================================================== */

export function renderHudChips(app) {
  const { world, state } = app.camp;
  const me = world.player;
  const nation = world.nations[me];
  const power = nationPower(world, me);
  return `
    <span class="chip gold">${icon('coins', 14)}<b>${money(state.stats.tesouro)}</b></span>
    <span class="chip ${state.stats.aprovacao >= 50 ? 'good' : state.stats.aprovacao >= 30 ? '' : 'bad'}">${icon('thumbs-up', 14)}<b>${Math.round(state.stats.aprovacao)}%</b><span class="k">aprovação</span></span>
    <span class="chip">${icon('shield', 14)}<b>${fmtMen(power.men)}</b><span class="k">tropa</span></span>
    <span class="chip accent">${icon('flag', 14)}<b>${nation.provCount}</b><span class="k">províncias</span></span>
    <span class="chip ${nation.stability >= 50 ? 'good' : nation.stability >= 30 ? '' : 'bad'}">${icon('activity', 14)}<b>${Math.round(nation.stability)}%</b><span class="k">estabilidade</span></span>`;
}

export function renderTicker(app) {
  const log = app.camp.state.log.slice(-3).reverse();
  return log.map((l) => `<div><span style="color:var(--dim)">${esc(l.date || '')}</span> · ${esc(l.text)}</div>`).join('');
}
