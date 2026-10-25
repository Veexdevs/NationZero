#!/usr/bin/env node
/*
 * Gera www/src/ui/icons.js a partir do pacote lucide-static.
 * O jogo não usa emojis: todos os símbolos são ícones SVG em linha.
 *
 * Uso: npm run build:icons
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'node_modules', 'lucide-static', 'icons');
const OUT = path.join(__dirname, '..', 'www', 'src', 'ui', 'icons.js');

// emoji usado nos dados antigos → nome do ícone lucide
const EMOJI_MAP = {
  '🏛': 'landmark', '⚠': 'triangle-alert', '🤝': 'handshake', '⚡': 'zap', '🪖': 'shield',
  '🎖': 'medal', '⚖': 'scale', '🚫': 'ban', '🗳': 'vote', '💰': 'coins', '⚔': 'swords',
  '🚨': 'siren', '👑': 'crown', '🌐': 'globe', '🚩': 'flag', '📜': 'scroll-text',
  '💼': 'briefcase', '🕊': 'feather', '🚪': 'door-open', '⚙': 'cog', '🕵': 'user-search',
  '🗂': 'folder', '🎩': 'hat-glasses', '☢': 'radiation', '🛡': 'shield', '🗡': 'sword',
  '📖': 'book-open', '✊': 'hand', '⛓': 'link', '🚔': 'badge', '💵': 'banknote',
  '🤲': 'hand-heart', '⛪': 'church', '💾': 'save', '→': 'arrow-right', '🔒': 'lock',
  '🌳': 'tree-deciduous', '✍': 'pen-line', '🔇': 'volume-off', '🏭': 'factory',
  '🌾': 'wheat', '🔥': 'flame', '🕯': 'flame', '🎯': 'target', '🚧': 'construction',
  '🏦': 'landmark', '✂': 'scissors', '🔎': 'search', '📉': 'trending-down',
  '📰': 'newspaper', '🏷': 'tag', '📢': 'megaphone', '🏳': 'flag', '🏥': 'hospital',
  '🎓': 'graduation-cap', '🧾': 'receipt', '🦅': 'bird', '⭐': 'star', '🎤': 'mic',
  '📣': 'megaphone', '💥': 'bomb', '⏳': 'hourglass', '✅': 'check', '💣': 'bomb',
  '🌍': 'globe', '🚢': 'ship', '🙈': 'eye-off', '🌊': 'waves', '↩': 'undo',
  '🎭': 'drama', '🧪': 'flask-conical', '💀': 'skull', '🔧': 'wrench', '💎': 'gem',
  '☀': 'sun', '🐺': 'paw-print', '🌹': 'flower-2', '🧮': 'calculator', '🏆': 'trophy',
  '🥈': 'award', '✈': 'plane', '📡': 'radio-tower', '🎁': 'gift', '🚀': 'rocket',
  '🌉': 'bridge', '🎧': 'headphones', '🗺': 'map', '🛢': 'fuel', '🎉': 'party-popper',
  '📄': 'file-text', '👤': 'user', '🧠': 'brain', '💳': 'credit-card', '👁': 'eye',
  '🔁': 'repeat', '🐉': 'flame', '🦁': 'paw-print', '🗿': 'mountain', '🟥': 'square',
  '🟩': 'square', '🟨': 'square', '🟧': 'square', '🟫': 'square', '🟪': 'square',
  '🟦': 'square', '⬜': 'square', '🤴': 'crown', '👍': 'thumbs-up', '👥': 'users',
  '🏁': 'flag', '📥': 'download', '📺': 'tv', '🛠': 'wrench', '🔫': 'crosshair',
  '💸': 'banknote-arrow-down', '🕳': 'circle-dot', '🔌': 'plug', '🆘': 'siren',
  '🌈': 'rainbow', '📦': 'package', '💉': 'syringe', '📈': 'trending-up',
  '🏅': 'medal', '⛽': 'fuel', '📚': 'library', '🔨': 'hammer', '🧱': 'brick-wall',
  '★': 'star', '🧭': 'compass', '😨': 'frown', '←': 'arrow-left', '☰': 'menu',
  '🔄': 'refresh-cw', '📊': 'bar-chart', '✓': 'check', '🖼': 'image', '🗃': 'archive',
  '📃': 'file-text', '🏚': 'house', '🪞': 'copy', '🍞': 'wheat', '🧺': 'shopping-basket',
  '🤐': 'ear-off', '🚶': 'footprints', '🏗': 'construction', '🚁': 'plane',
  '🦠': 'virus', '🏠': 'home', '⬆': 'arrow-up', '🎙': 'mic', '👏': 'hand',
  '🧫': 'test-tube', '🌸': 'sparkles', '🎆': 'sparkles', '🚑': 'ambulance',
  '👋': 'hand', '📋': 'clipboard', '💻': 'laptop', '😤': 'angry', '🤫': 'ear-off',
  '🖨': 'printer', '⏰': 'alarm-clock', '🌴': 'tree-pine', '🌿': 'leaf', '🏫': 'school',
  '📕': 'book-open', '🌙': 'moon', '☠': 'skull', '🧑': 'user', '🔤': 'languages',
  '⚽': 'trophy', '⛏': 'pickaxe', '🌞': 'sun', '🤖': 'bot', '🌤': 'cloud-sun',
  '🌩': 'cloud-lightning', '👪': 'users', '💧': 'droplet', '🌱': 'sprout',
  '🧍': 'user', '💨': 'wind', '😠': 'angry', '📅': 'calendar', '⚑': 'flag',
  '🎚': 'sliders', '❓': 'circle-help', '🔊': 'volume-2', '🛒': 'shopping-cart',
  '👵': 'user', '📤': 'upload', '💡': 'lightbulb', '💚': 'heart', '✏': 'pencil',
  '⬇': 'arrow-down', '🧼': 'droplets', '🪜': 'arrow-up',
  // UI
  '▶': 'play', '⏸': 'pause', '✕': 'x', '＋': 'plus', '−': 'minus', '…': 'ellipsis',
  '␣': 'space',
};

// ícones usados diretamente pela interface
const UI_ICONS = [
  'map', 'globe-2', 'landmark', 'scroll-text', 'coins', 'shield', 'handshake', 'user-search',
  'book-open', 'trophy', 'play', 'pause', 'skip-forward', 'fast-forward', 'chevron-right',
  'chevron-left', 'chevron-up', 'chevron-down', 'chevron-down', 'x', 'check', 'plus', 'minus',
  'menu', 'settings', 'circle-help', 'zoom-in', 'zoom-out', 'maximize', 'minimize',
  'layers', 'locate-fixed', 'crosshair', 'swords', 'shield-check', 'flag', 'users', 'user',
  'crown', 'vote', 'scale', 'siren', 'ban', 'lock', 'unlock', 'eye', 'eye-off', 'radar',
  'satellite', 'radio-tower', 'bomb', 'radiation', 'skull', 'flame', 'zap', 'heart',
  'thumbs-up', 'thumbs-down', 'trending-up', 'trending-down', 'bar-chart', 'pie-chart',
  'activity', 'gauge', 'calculator', 'banknote', 'wallet', 'piggy-bank', 'percent',
  'trending-up', 'triangle-alert', 'info', 'circle-alert', 'hourglass', 'calendar',
  'clock', 'history', 'undo', 'refresh-cw', 'repeat', 'arrow-right', 'arrow-left',
  'arrow-up', 'arrow-down', 'move', 'target', 'crosshair', 'map-pin', 'package', 'truck',
  'factory', 'wheat', 'flask-conical', 'microscope', 'graduation-cap', 'hospital',
  'stethoscope', 'pill', 'syringe', 'tree-deciduous', 'leaf', 'waves', 'droplet', 'sun',
  'moon', 'wind', 'cloud-lightning', 'mountain', 'church', 'mosque', 'castle', 'building',
  'house', 'tent', 'briefcase', 'handshake', 'file-text', 'folder', 'archive', 'save',
  'download', 'upload', 'pencil', 'pen-line', 'trash-2', 'copy', 'search', 'filter',
  'sliders', 'megaphone', 'newspaper', 'tv', 'mic', 'headphones', 'music', 'drama',
  'award', 'medal', 'gem', 'star', 'sparkles', 'party-popper', 'gift', 'rocket', 'plane',
  'ship', 'anchor', 'compass', 'fuel', 'plug', 'battery', 'wrench', 'hammer', 'pickaxe',
  'axe', 'sword', 'scissors', 'link', 'unlink', 'key', 'fingerprint', 'scan-face',
  'badge', 'badge-check', 'shield-alert', 'shield-plus', 'shield-half', 'vote', 'megaphone',
  'volume-2', 'volume-off', 'gamepad-2', 'maximize-2', 'pause', 'play',
];

function readIcon(name) {
  const file = path.join(SRC, `${name}.svg`);
  if (!fs.existsSync(file)) return null;
  const svg = fs.readFileSync(file, 'utf8');
  const inner = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .trim();
  return inner.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ');
}

const used = new Set([...Object.values(EMOJI_MAP), ...UI_ICONS]);
const icons = {};
const missing = [];
for (const name of [...used].sort()) {
  const inner = readIcon(name);
  if (!inner) { missing.push(name); continue; }
  icons[name] = inner;
}
if (missing.length) console.warn('⚠️  Ícones não encontrados:', missing.join(', '));

const body = `/* Gerado automaticamente por scripts/build-icons.cjs — não edite à mão.
 * Ícones: Lucide (licença ISC). ${Object.keys(icons).length} símbolos.
 */

export const ICONS = ${JSON.stringify(icons, null, 0)};

/** Emoji (dados legados) → nome do ícone. */
export const EMOJI_TO_ICON = ${JSON.stringify(EMOJI_MAP, null, 0)};

/** Retorna o SVG do ícone. */
export function icon(name, size = 18, extraClass = '') {
  const body = ICONS[name] || ICONS['circle-help'] || '';
  return \`<svg class="ico-svg \${extraClass}" width="\${size}" height="\${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\${body}</svg>\`;
}

/** Aceita emoji legado ou nome de ícone. */
export function resolveIcon(key) {
  if (!key) return 'circle-help';
  if (ICONS[key]) return key;
  const bare = String(key).replace(/\\uFE0F/g, '');
  return EMOJI_TO_ICON[bare] || EMOJI_TO_ICON[String(key)] || 'circle-help';
}

export function iconOf(key, size = 18, cls = '') {
  return icon(resolveIcon(key), size, cls);
}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body);
console.log(`✓ ${Object.keys(icons).length} ícones → ${path.relative(process.cwd(), OUT)} (${(body.length / 1024).toFixed(0)} KB)`);
