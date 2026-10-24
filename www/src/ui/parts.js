/* Componentes reutilizáveis de interface. */

import { STATS, FACTIONS, AXES, ROLES, REGIMES, statLabel, factionAverage, playerSeats, totalSeats, isAuthoritarian } from '../engine/state.js';
import { esc, barColor, hexAlpha, money, pct, num } from './dom.js';

export function statCard(key, value, delta, extra = '') {
  const def = STATS[key];
  if (!def) return '';
  const min = def.min ?? 0;
  const max = def.max ?? 100;
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const isDownGood = def.good === 'down';
  const color = isDownGood ? barColor(100 - ratio * 100) : barColor(ratio * 100);
  const d = typeof delta === 'number' ? delta : 0;
  const dCls = d > 0.05 ? (isDownGood ? 'down' : 'up') : d < -0.05 ? (isDownGood ? 'up' : 'down') : 'flat';
  const dTxt = Math.abs(d) < 0.05 ? '' : `${d > 0 ? '+' : ''}${d.toFixed(Math.abs(d) < 10 ? 1 : 0)}`;
  return `
    <div class="stat">
      <div class="lbl">${def.icon} ${esc(def.label)}</div>
      <div class="val">${esc(statLabel(key, value))} ${extra}</div>
      <div class="bar"><i style="width:${(ratio * 100).toFixed(1)}%;background:${color}"></i></div>
      ${dTxt ? `<div class="delta ${dCls}">${dTxt}</div>` : ''}
    </div>`;
}

export function factionRows(state, keys = Object.keys(FACTIONS)) {
  return keys.map((k) => {
    const f = FACTIONS[k];
    const v = state.factions[k] ?? 50;
    return `
      <div class="faction-row" title="${esc(f.desc)}">
        <span class="fi">${f.icon}</span>
        <span class="fn">${esc(f.label)}</span>
        <span class="ft"><i style="width:${v}%;background:${barColor(v)}"></i></span>
        <span class="fv">${Math.round(v)}</span>
      </div>`;
  }).join('');
}

export function meter(label, value, opts = {}) {
  const v = Math.max(0, Math.min(100, value));
  const color = opts.color || barColor(opts.good === 'down' ? 100 - v : v);
  return `
    <div class="meter">
      <span class="n">${esc(label)}</span>
      <span class="track"><i style="width:${v}%;background:${color}"></i></span>
      <span class="v">${Math.round(value)}</span>
    </div>`;
}

export function ideologyBars(state, editable = false) {
  return `<div class="ideology-bars">${Object.entries(AXES).map(([k, ax]) => {
    const v = state.ideology[k] || 0;
    const pos = ((v + 100) / 200) * 100;
    return `
      <div class="ideology-bar">
        <div class="top"><span>${esc(ax.neg)}</span><span style="color:var(--dim)">${esc(ax.label)}</span><span>${esc(ax.pos)}</span></div>
        <div class="track"><div class="mid"></div><div class="dot" style="left:${pos}%;background:${v > 20 ? '#f5c542' : v < -20 ? '#7fd8ff' : 'var(--accent)'}"></div></div>
        ${editable ? `<input type="range" min="-100" max="100" value="${v}" data-ideo="${k}" style="margin-top:2px" />` : ''}
      </div>`;
  }).join('')}</div>`;
}

export function rolePill(state) {
  const r = ROLES[state.role] || ROLES.cidadao;
  return `<span class="pill role">${r.icon} ${esc(r.label)}</span>`;
}

export function regimePill(state) {
  const r = REGIMES[state.regime] || REGIMES.democracia;
  return `<span class="pill ${isAuthoritarian(state) ? 'warn' : 'info'}">${r.icon} ${esc(r.label)}</span>`;
}

export function parliamentBar(state) {
  const total = totalSeats(state);
  const p = state.elections.parliament || {};
  const entries = Object.entries(p).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const colors = ['#19e08a', '#7fd8ff', '#f5c542', '#a97bff', '#ff8a5c', '#ff5d6c', '#9ad84f'];
  if (!entries.length) return '<div class="empty small">Parlamento ainda não eleito.</div>';
  const playerSigla = state.party?.sigla;
  return `
    <div class="parliament">
      ${entries.map(([sigla, seats], i) => {
        const color = sigla === playerSigla ? (state.party?.color || '#19e08a') : colors[(i + 1) % colors.length];
        return `<i style="width:${(seats / total) * 100}%;background:${color}" title="${esc(sigla)}: ${seats} cadeiras"></i>`;
      }).join('')}
    </div>
    <div class="legend">
      ${entries.map(([sigla, seats], i) => {
        const color = sigla === playerSigla ? (state.party?.color || '#19e08a') : colors[(i + 1) % colors.length];
        return `<span class="k"><span class="dot" style="background:${color}"></span>${esc(sigla)} · ${seats}</span>`;
      }).join('')}
    </div>`;
}

export function lawEffects(law) {
  const effects = [];
  const push = (obj, label) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'text' || k === 'tone' || k === 'icon' || k === 'flags' || typeof v !== 'number') continue;
      let name = k;
      if (STATS[k]) name = STATS[k].label;
      else if (FACTIONS[k]) name = FACTIONS[k].label;
      else if (['midia', 'judiciario', 'policia', 'militar', 'eleitoral'].includes(k)) name = 'controle ' + k;
      const good = STATS[k] ? (STATS[k].good === 'down' ? v < 0 : v > 0) : v > 0;
      effects.push(`<span class="eff ${good ? 'up' : 'down'}">${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} ${esc(name)}</span>`);
    }
  };
  push(law.enact?.stats);
  push(law.enact?.factions);
  push(law.tick?.stats);
  return effects.join('');
}

export function emptyState(icon, text) {
  return `<div class="empty"><span class="eico">${icon}</span>${esc(text)}</div>`;
}

export function budgetChips(state) {
  return `
    <span class="pill ${state.stats.tesouro >= 0 ? 'good' : 'bad'}">💰 ${money(state.stats.tesouro)}</span>
    <span class="pill ${state.stats.aprovacao >= 50 ? 'good' : state.stats.aprovacao >= 30 ? 'warn' : 'bad'}">👍 ${Math.round(state.stats.aprovacao)}%</span>
    <span class="pill power">⚡ ${Math.round(state.stats.poder)}</span>
    <span class="pill info">🤝 ${Math.round(state.stats.influencia)}</span>`;
}

export function factionAvgLabel(state) {
  const avg = factionAverage(state);
  const tone = avg >= 60 ? 'good' : avg >= 45 ? 'info' : avg >= 30 ? 'warn' : 'bad';
  return `<span class="pill ${tone}">🏛️ Bases ${Math.round(avg)}</span>`;
}

export function seatsLabel(state) {
  const seats = playerSeats(state);
  const total = totalSeats(state);
  const tone = seats > total / 2 ? 'good' : seats > 0 ? 'info' : 'warn';
  return `<span class="pill ${tone}">🏛️ ${seats}/${total} cadeiras</span>`;
}

export { hexAlpha };
