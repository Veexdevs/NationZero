/* Tela: Crônica — todo o histórico do país */

import { LAW_BY_ID } from '../../data/laws.js';
import { esc } from '../dom.js';
import { emptyState } from '../parts.js';
import { registerCommands } from '../registry.js';

const TONES = [
  { id: 'all', label: 'Tudo', icon: '📖' },
  { id: 'good', label: 'Boas notícias', icon: '✅' },
  { id: 'bad', label: 'Crises', icon: '🚨' },
  { id: 'warn', label: 'Tensões', icon: '⚠️' },
  { id: 'epic', label: 'Momentos históricos', icon: '🏆' },
];

export function renderChronicle(app) {
  const st = app.state;
  const filter = app.ui.logFilter || 'all';
  const entries = st.log.filter((l) => filter === 'all' || l.tone === filter);
  const activeLaws = Object.keys(st.policies).map((id) => LAW_BY_ID[id]).filter(Boolean);

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">📖 Crônica</h2>
        <p class="screen-sub">A história oficial — e as coisas que a história oficial preferiria esquecer.</p>
      </div>
      <span class="pill info">${st.log.length} registros</span>
    </div>

    <div class="subtabs">
      ${TONES.map((t) => `<button class="chip ${filter === t.id ? 'active' : ''}" data-cmd="chr:filter:${t.id}">${t.icon} ${esc(t.label)}</button>`).join('')}
    </div>

    <div class="grid cols-2">
      <div class="card">
        <div class="card-title">📜 Linha do tempo</div>
        ${entries.length ? entries.map((l) => `
          <div class="log-entry ${esc(l.tone || 'info')}">
            <div class="log-date">${esc(l.date)}</div>
            <div class="log-ico">${esc(l.icon || '•')}</div>
            <div class="log-text">${esc(l.text)}</div>
          </div>`).join('') : emptyState('📖', 'Nenhum registro com esse filtro.')}
      </div>

      <div>
        <div class="card" style="margin-bottom:14px">
          <div class="card-title">⚖️ Leis em vigor <span class="sub">${activeLaws.length}</span></div>
          ${activeLaws.length ? activeLaws.map((l) => `
            <div class="row" style="margin-bottom:6px">
              <span class="ico">${l.icon}</span>
              <div class="body"><div class="name">${esc(l.name)}</div><div class="desc">${esc(l.desc)}</div></div>
            </div>`).join('') : emptyState('🗂️', 'Nenhuma lei em vigor.')}
        </div>

        ${st.custom.length ? `
        <div class="card">
          <div class="card-title">✍️ Seus decretos <span class="sub">${st.custom.length}</span></div>
          ${st.custom.slice().reverse().map((c) => `
            <div class="row" style="margin-bottom:6px">
              <span class="ico">✍️</span>
              <div class="body">
                <div class="name">${esc(c.name)}</div>
                <div class="desc">${esc(c.date)}${c.desc ? ` — "${esc(c.desc)}"` : ''}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}
      </div>
    </div>
  `;
}

registerCommands({
  chr(action, arg, el, ev, app) {
    if (action === 'filter') {
      app.ui.logFilter = arg;
      app.render();
    }
  },
});
