/* Tela: Leis e decretos */

import { LAW_CATEGORIES, LAWS, LAW_BY_ID } from '../../data/laws.js';
import { lawRequirement, enactLaw, repealLaw } from '../../engine/politics.js';
import { esc } from '../dom.js';
import { lawEffects, emptyState } from '../parts.js';
import { registerCommands } from '../registry.js';
import { toast, sfx } from '../dom.js';
import { iconOf } from '../icons.js';

const TIER_LABEL = { 1: 'Comum', 2: 'Avançada', 3: 'Radical' };

export function renderLaws(app) {
  const st = app.state;
  const cat = app.ui.lawCat;
  const show = app.ui.lawShow;
  const active = Object.keys(st.policies);
  const list = LAWS.filter((l) => l.cat === cat);
  const filtered = list.filter((l) => {
    if (show === 'ativas') return !!st.policies[l.id];
    if (show === 'disponiveis') {
      const req = lawRequirement(st, l);
      return req.ok && !st.policies[l.id];
    }
    return true;
  });

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${iconOf('scroll-text', 15)} Leis & decretos</h2>
        <p class="screen-sub">Transforme o país por escrito. Cada lei muda a economia, o humor das ruas e o seu próprio poder.</p>
      </div>
      <div class="flex gap-8">
        <span class="pill good">${iconOf('check', 15)} ${active.length} em vigor</span>
      </div>
    </div>

    <div class="subtabs">
      ${Object.entries(LAW_CATEGORIES).map(([k, c]) => `
        <button class="chip ${cat === k ? 'active' : ''}" data-cmd="laws:cat:${k}">${iconOf(c.icon, 15)} ${esc(c.label)}</button>`).join('')}
    </div>

    <div class="flex gap-8 wrap" style="margin-bottom:14px">
      <button class="chip ${show === 'todas' ? 'active' : ''}" data-cmd="laws:show:todas">Todas</button>
      <button class="chip ${show === 'disponiveis' ? 'active' : ''}" data-cmd="laws:show:disponiveis">Disponíveis agora</button>
      <button class="chip ${show === 'ativas' ? 'active' : ''}" data-cmd="laws:show:ativas">Em vigor</button>
    </div>

    ${filtered.length ? `
      <div class="grid cols-2">
        ${filtered.map((law) => renderLawCard(st, law)).join('')}
      </div>` : emptyState('folder', show === 'ativas' ? 'Nenhuma lei desta categoria em vigor ainda.' : 'Nenhuma lei disponível com seus requisitos atuais.')}
  `;
}

function renderLawCard(st, law) {
  const inPower = !!st.policies[law.id];
  const req = lawRequirement(st, law);
  const costParts = [];
  if (law.cost?.influencia) costParts.push(`${iconOf('handshake', 15)} ${law.cost.influencia}`);
  if (law.cost?.poder) costParts.push(`${iconOf('zap', 15)} ${law.cost.poder}`);
  if (law.cost?.tesouro) costParts.push(`${iconOf('coins', 15)} N$ ${law.cost.tesouro} bi`);

  return `
    <div class="law ${inPower ? 'active' : ''}">
      <div class="law-top">
        <span class="law-ico">${iconOf(law.icon, 15)}</span>
        <div style="flex:1;min-width:0">
          <div class="flex between center gap-8">
            <div class="law-name">${esc(law.name)}</div>
            ${inPower ? '<span class="pill good" style="font-size:10px">em vigor</span>' : `<span class="pill" style="font-size:10px">${TIER_LABEL[law.tier] || ''}</span>`}
          </div>
          <div class="law-desc" style="margin-top:4px">${esc(law.desc)}</div>
        </div>
      </div>

      <div class="law-effects">${lawEffects(law)}</div>

      <div class="law-foot">
        ${costParts.length && !inPower ? `<span class="law-cost">${costParts.join(' · ')}</span>` : ''}
        <div style="flex:1"></div>
        ${inPower
          ? `<button class="btn tiny ghost" style="border:1px solid var(--line)" data-cmd="laws:revoke:${law.id}">Revogar</button>`
          : req.ok
            ? `<button class="btn tiny primary" data-cmd="laws:enact:${law.id}">Aprovar</button>`
            : `<span class="tiny" style="color:var(--warn)">${esc(req.reasons[0])}</span>`}
      </div>
    </div>`;
}

registerCommands({
  laws(action, arg) {
    const app = window.NZ;
    const st = app.state;
    if (action === 'cat') { app.ui.lawCat = arg; sfx('click'); app.render(); }
    if (action === 'show') { app.ui.lawShow = arg; app.render(); }
    if (action === 'enact') {
      const res = enactLaw(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', 'triangle-alert'); sfx('bad'); return; }
      sfx('good');
      toast(`Lei aprovada: ${res.law.name}`, 'good', res.law.icon);
      app.save();
      app.render();
    }
    if (action === 'revoke') {
      const res = repealLaw(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', 'triangle-alert'); return; }
      const law = LAW_BY_ID[arg];
      toast(`Lei revogada: ${law.name}`, 'warn', 'undo');
      app.save();
      app.render();
    }
  },
});
