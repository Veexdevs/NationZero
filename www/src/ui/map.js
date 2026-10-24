/*
 * Mapa-múndi interativo (SVG): províncias, cores políticas, zoom, pan,
 * seleção, exércitos e frentes de guerra.
 */

import { findProvinceAt } from '../engine/worldmap.js';
import { ICONS } from './icons.js';
import { nationName, atWar } from '../engine/nations.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class MapView {
  constructor(host, map, opts = {}) {
    this.map = map;
    this.host = host;
    this.opts = opts;
    this.zoom = 1;
    this.minZoom = 0.55;
    this.maxZoom = 14;
    this.view = { x: 0, y: 0, w: map.width, h: map.height };
    this.selected = null;
    this.hovered = null;
    this.mode = opts.mode || 'select';
    this.world = null;
    this.layers = {};
    this._dragging = false;
    this._bind();
  }

  /* ------------------------------------------------------------------ */
  /* construção                                                          */
  /* ------------------------------------------------------------------ */

  build() {
    const { width, height } = this.map;
    this.host.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'map-svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    svg.innerHTML = `
      <defs>
        <filter id="mapGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2" />
        </pattern>
      </defs>
      <rect class="ocean" x="-400" y="-400" width="${width + 800}" height="${height + 800}" />
      <g class="l-graticule"></g>
      <g class="l-provinces"></g>
      <g class="l-borders"></g>
      <g class="l-overlay"></g>
      <g class="l-markers"></g>
    `;
    this.host.appendChild(svg);
    this.svg = svg;
    this.layers.provinces = svg.querySelector('.l-provinces');
    this.layers.borders = svg.querySelector('.l-borders');
    this.layers.overlay = svg.querySelector('.l-overlay');
    this.layers.markers = svg.querySelector('.l-markers');
    this.layers.graticule = svg.querySelector('.l-graticule');

    this.buildProvinces();
    this.buildGraticule();
    return this;
  }

  buildGraticule() {
    const g = this.layers.graticule;
    let html = '';
    for (let x = 0; x <= this.map.width; x += 100) {
      html += `<line x1="${x}" y1="0" x2="${x}" y2="${this.map.height}" />`;
    }
    for (let y = 0; y <= this.map.height; y += 100) {
      html += `<line x1="0" y1="${y}" x2="${this.map.width}" y2="${y}" />`;
    }
    g.innerHTML = html;
  }

  buildProvinces() {
    const frag = document.createDocumentFragment();
    this.paths = new Array(this.map.provinces.length);
    for (const prov of this.map.provinces) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', prov.path);
      p.setAttribute('class', 'prov');
      p.setAttribute('data-p', prov.i);
      frag.appendChild(p);
      this.paths[prov.i] = p;
    }
    this.layers.provinces.appendChild(frag);
    this.layers.provinces.style.pointerEvents = 'none';
  }

  /* ------------------------------------------------------------------ */
  /* cores e estado                                                      */
  /* ------------------------------------------------------------------ */

  paint(world, opts = {}) {
    this.world = world;
    const nations = world.nations;
    const player = world.player;
    const selected = this.selected;
    const highlight = opts.highlight || null;
    const mode = this.mode;

    for (const prov of this.map.provinces) {
      const path = this.paths[prov.i];
      const owner = world.owners[prov.i];
      const nation = nations[owner];
      let fill = nation?.color || '#4a5568';
      if (!nation?.alive) fill = '#2b3138';

      const isSelected = selected === prov.i;
      const isPlayer = owner === player;
      const isEnemy = mode === 'war' && world.nations[player]?.wars.includes(owner);
      const isNeighborOfSelected = selected !== null &&
        this.map.provinces[selected].neighbors.includes(prov.i);

      path.setAttribute('fill', fill);
      path.setAttribute('fill-opacity', isPlayer ? '0.95' : '0.8');
      path.setAttribute('class', 'prov'
        + (isSelected ? ' sel' : '')
        + (isNeighborOfSelected ? ' nbr' : '')
        + (isEnemy ? ' enemy' : '')
        + (highlight && highlight.has?.(prov.i) ? ' hl' : ''));
    }
    this.drawBorders(world);
    this.drawMarkers(world);
    this.drawSelection();
  }

  drawBorders(world) {
    // contornos diplomáticos simplificados: linha mais espessa nas mudanças de dono
    const g = this.layers.borders;
    if (!this._borderCache || this._borderVersion !== world.turn) {
      this._borderVersion = world.turn;
      this._borderCache = null;
    }
    g.innerHTML = '';
  }

  drawSelection() {
    const g = this.layers.overlay;
    g.innerHTML = '';
    if (this.selected === null) return;
    const prov = this.map.provinces[this.selected];
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', prov.path);
    path.setAttribute('class', 'sel-halo');
    g.appendChild(path);
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', prov.x);
    ring.setAttribute('cy', prov.y);
    ring.setAttribute('r', 9 / this.zoom);
    ring.setAttribute('class', 'sel-ring');
    g.appendChild(ring);
  }

  drawMarkers(world) {
    const g = this.layers.markers;
    g.innerHTML = '';
    const s = 1 / this.zoom;

    // exércitos agrupados por província
    const grouped = new Map();
    for (const a of world.armies) {
      const key = `${a.prov}|${a.owner}`;
      if (!grouped.has(key)) grouped.set(key, { prov: a.prov, owner: a.owner, men: 0 });
      grouped.get(key).men += a.men;
    }

    for (const item of grouped.values()) {
      const prov = this.map.provinces[item.prov];
      const nation = world.nations[item.owner];
      const isPlayer = item.owner === world.player;
      const size = Math.min(15, Math.max(6, Math.sqrt(item.men) / 8)) * s * 1.6;
      const gg = document.createElementNS(SVG_NS, 'g');
      gg.setAttribute('class', `army-marker${isPlayer ? ' mine' : ''}${nation?.wars.includes(world.player) ? ' foe' : ''}`);
      gg.setAttribute('transform', `translate(${prov.x} ${prov.y})`);
      gg.innerHTML = `
        <rect x="${-size * 1.7}" y="${-size}" width="${size * 3.4}" height="${size * 2}" rx="${size * 0.45}"
          fill="#0b1113" fill-opacity="0.85" stroke="${nation?.color || '#fff'}" stroke-width="${1.2 * s * 2}" />
        <text x="0" y="${size * 0.55}" text-anchor="middle" font-size="${size * 1.25}"
          fill="#e9f5ef" font-family="inherit" font-weight="700">${fmtMen(item.men)}</text>`;
      g.appendChild(gg);
    }

    // marcador de guerra (espadas) nas capitais em guerra
    for (const n of world.nations) {
      if (!n.alive || !n.wars.length) continue;
      const prov = world.owners[n.capital] === n.i ? n.capital : null;
      if (prov === null) continue;
      const p = this.map.provinces[prov];
      const gg = document.createElementNS(SVG_NS, 'g');
      const k = 0.95 / this.zoom;
      gg.setAttribute('transform', `translate(${p.x} ${p.y - 16 / this.zoom}) scale(${k}) translate(-12 -12)`);
      gg.setAttribute('class', 'war-mark');
      gg.innerHTML = ICONS.swords;
      g.appendChild(gg);
    }
  }

  /* ------------------------------------------------------------------ */
  /* interação                                                           */
  /* ------------------------------------------------------------------ */

  _bind() {
    const host = this.host;
    host.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      this.zoomAt(e, factor);
    }, { passive: false });

    host.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this._drag = { x: e.clientX, y: e.clientY, view: { ...this.view }, moved: false };
      host.setPointerCapture?.(e.pointerId);
      this._pointers = new Set([e.pointerId]);
    });

    host.addEventListener('pointermove', (e) => {
      if (this._drag) {
        const dx = e.clientX - this._drag.x;
        const dy = e.clientY - this._drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) this._drag.moved = true;
        if (this._drag.moved) {
          const scale = this.view.w / host.clientWidth;
          this.view.x = this._drag.view.x - dx * scale;
          this.view.y = this._drag.view.y - dy * scale;
          this.clampView();
          this.applyView();
        }
        return;
      }
      this.onHover?.(this.pointToMap(e));
    });

    host.addEventListener('pointerup', (e) => {
      const drag = this._drag;
      this._drag = null;
      if (!drag || drag.moved) return;
      const pt = this.pointToMap(e);
      const prov = findProvinceAt(this.map, pt.x, pt.y);
      this.onClick?.(prov, e);
    });

    host.addEventListener('pointercancel', () => { this._drag = null; });
    host.addEventListener('pointerleave', () => this.onHover?.(null));

    // pinça com dois dedos
    host.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      if (this._pinch) {
        const factor = d / this._pinch;
        this.zoomAt({ clientX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          clientY: (e.touches[0].clientY + e.touches[1].clientY) / 2 }, factor);
      }
      this._pinch = d;
    }, { passive: false });
    host.addEventListener('touchend', () => { this._pinch = null; });

    host.addEventListener('dblclick', (e) => this.zoomAt(e, 1.7));
  }

  pointToMap(e) {
    const rect = this.host.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    // preserveAspectRatio="xMidYMid meet"
    const scale = Math.min(rect.width / this.view.w, rect.height / this.view.h);
    const offX = (rect.width - this.view.w * scale) / 2;
    const offY = (rect.height - this.view.h * scale) / 2;
    const x = this.view.x + (e.clientX - rect.left - offX) / scale;
    const y = this.view.y + (e.clientY - rect.top - offY) / scale;
    return { x, y, px, py };
  }

  zoomAt(e, factor) {
    const pt = this.pointToMap(e);
    const z = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const realFactor = z / this.zoom;
    this.zoom = z;
    this.view.w = this.map.width / z;
    this.view.h = this.map.height / z;
    this.view.x = pt.x - (pt.x - this.view.x) / realFactor;
    this.view.y = pt.y - (pt.y - this.view.y) / realFactor;
    this.clampView();
    this.applyView();
    this.drawMarkers(this.world || { armies: [], nations: [], player: -1 });
    this.drawSelection();
  }

  setZoom(z) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, z));
    this.view.w = this.map.width / this.zoom;
    this.view.h = this.map.height / this.zoom;
    this.clampView();
    this.applyView();
  }

  centerOn(x, y, zoom = this.zoom) {
    this.setZoom(zoom);
    this.view.x = x - this.view.w / 2;
    this.view.y = y - this.view.h / 2;
    this.clampView();
    this.applyView();
  }

  clampView() {
    const padX = this.view.w * 0.25;
    const padY = this.view.h * 0.25;
    this.view.x = Math.max(-padX, Math.min(this.map.width - this.view.w + padX, this.view.x));
    this.view.y = Math.max(-padY, Math.min(this.map.height - this.view.h + padY, this.view.y));
    if (this.view.w > this.map.width * 1.4) this.view.x = (this.map.width - this.view.w) / 2;
  }

  applyView() {
    const v = this.view;
    this.svg.setAttribute('viewBox', `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`);
    this.host.dispatchEvent(new CustomEvent('mapview', { detail: { zoom: this.zoom, view: v } }));
  }

  select(provIndex) {
    this.selected = provIndex;
    if (this.world) this.paint(this.world, { highlight: this.highlight });
    this.drawSelection();
  }

  setMode(mode) {
    this.mode = mode;
    this.host.setAttribute('data-mode', mode);
    if (this.world) this.paint(this.world);
  }

  fit() {
    this.zoom = 1;
    this.view = { x: 0, y: 0, w: this.map.width, h: this.map.height };
    this.applyView();
  }
}

function dist(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function fmtMen(men) {
  if (men >= 1000000) return `${(men / 1000000).toFixed(1)}M`;
  if (men >= 1000) return `${(men / 1000).toFixed(men >= 10000 ? 0 : 1)}k`;
  return String(Math.round(men));
}
