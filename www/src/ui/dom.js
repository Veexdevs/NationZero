/* Utilidades de UI: HTML seguro, modais, toasts e som. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(v) {
  const neg = v < 0;
  return `${neg ? '−' : ''}N$ ${Math.abs(v).toFixed(0)}`;
}

export function pct(v, digits = 0) {
  return `${Number(v).toFixed(digits)}%`;
}

export function num(v, digits = 0) {
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: digits });
}

export function barClass(value, good = 'up', warnAt = 35, dangerAt = 18) {
  if (good === 'down') {
    if (value >= 65) return 'bad';
    if (value >= 40) return 'warn';
    return 'good';
  }
  if (value <= dangerAt) return 'bad';
  if (value <= warnAt) return 'warn';
  return 'good';
}

export function barColor(v) {
  if (v >= 65) return '#2ee6a0';
  if (v >= 45) return '#9ad84f';
  if (v >= 30) return '#f5c542';
  if (v >= 18) return '#ffab4a';
  return '#ff5d6c';
}

export function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* -------------------------------- Toasts -------------------------------- */

export function toast(message, tone = 'info', icon = '•', duration = 3200) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `<span style="font-size:16px">${esc(icon)}</span><span>${esc(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 220);
  }, duration);
  if (tone === 'bad' || tone === 'epic') sfx(tone === 'epic' ? 'epic' : 'bad');
}

/* -------------------------------- Modal --------------------------------- */

let modalRoot = null;

export function openModal(html, opts = {}) {
  closeModal();
  modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop="1">
      <div class="modal ${opts.wide ? 'wide' : ''} ${opts.className || ''}" role="dialog" aria-modal="true">
        ${html}
      </div>
    </div>`;
  document.body.style.overflow = 'hidden';
  if (opts.onMount) opts.onMount(modalRoot);
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
  document.body.style.overflow = '';
  modalRoot = null;
}

export function isModalOpen() {
  return !!document.querySelector('.modal-backdrop');
}

/* -------------------------------- Som ---------------------------------- */

let audioCtx = null;

export function sfx(kind = 'click') {
  try {
    if (localStorage.getItem('nz.sound') === 'off') return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    const notes = {
      click: [{ f: 420, d: 0.06, g: 0.05, type: 'sine' }],
      good: [{ f: 520, d: 0.08, g: 0.06, type: 'sine' }, { f: 780, d: 0.12, g: 0.05, type: 'sine', at: 0.07 }],
      bad: [{ f: 220, d: 0.14, g: 0.07, type: 'sawtooth' }, { f: 140, d: 0.18, g: 0.05, type: 'sawtooth', at: 0.1 }],
      turn: [{ f: 330, d: 0.1, g: 0.045, type: 'triangle' }, { f: 440, d: 0.14, g: 0.04, type: 'triangle', at: 0.08 }],
      epic: [{ f: 300, d: 0.14, g: 0.06, type: 'triangle' }, { f: 450, d: 0.16, g: 0.055, type: 'triangle', at: 0.1 }, { f: 600, d: 0.28, g: 0.05, type: 'triangle', at: 0.2 }],
    };
    (notes[kind] || notes.click).forEach((n) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, t + (n.at || 0));
      gain.gain.exponentialRampToValueAtTime(n.g, t + (n.at || 0) + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (n.at || 0) + n.d);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t + (n.at || 0));
      osc.stop(t + (n.at || 0) + n.d + 0.02);
    });
  } catch (e) { /* áudio opcional */ }
}

/* ------------------------------- Diversos ------------------------------- */

export function confirmDialog({ title, text, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    openModal(`
      <div class="modal-head">
        <div class="modal-ico">${danger ? '⚠️' : '❓'}</div>
        <div><div class="modal-title">${esc(title)}</div></div>
      </div>
      <div class="modal-text">${esc(text)}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-confirm="0">${esc(cancelLabel)}</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-confirm="1">${esc(confirmLabel)}</button>
      </div>`);
    document.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-confirm') === '1';
        closeModal();
        resolve(v);
      });
    });
  });
}

export function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
