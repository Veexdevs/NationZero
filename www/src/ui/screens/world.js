/* Tela: Mundo — diplomacia, tratados, espionagem e guerra */

import { COUNTRIES, BLOCS, TREATIES } from '../../data/world.js';
import { ensureRelations, relationLabel, countryById, signTreaty, breakTreaty, giftCountry, sanctionCountry, peaceTreaty, resolveEspionage, declareWar } from '../../engine/world.js';
import { esc, barColor, sfx, toast } from '../dom.js';
import { statCard, meter, emptyState } from '../parts.js';
import { registerCommands } from '../registry.js';
import { showTargetModal } from '../modals.js';

export function renderWorld(app) {
  const st = app.state;
  ensureRelations(st);
  const d = app.ui.deltas || {};
  const selected = app.ui.worldId || COUNTRIES[0].id;
  const c = countryById(selected);
  const rel = st.relations[c.id];

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">🌐 Mundo</h2>
        <p class="screen-sub">Dez nações observam seu governo. Compre aliados, isole inimigos, ou declare guerra.</p>
      </div>
      <div class="flex gap-8 wrap">
        <span class="pill ${st.stats.sancoes > 20 ? 'bad' : 'good'}">🚫 Sanções ${Math.round(st.stats.sancoes)}</span>
        <span class="pill info">🌐 Reputação ${Math.round(st.stats.reputacao)}</span>
      </div>
    </div>

    ${st.wars.length ? renderWars(st) : ''}

    <div class="grid cols-4">
      ${statCard('reputacao', st.stats.reputacao, d.reputacao)}
      ${statCard('sancoes', st.stats.sancoes, d.sancoes)}
      ${statCard('poderMilitar', st.stats.poderMilitar, d.poderMilitar)}
      ${statCard('arsenalNuclear', st.stats.arsenalNuclear, d.arsenalNuclear)}
    </div>

    <div class="section-title">Nações</div>
    <div class="grid cols-3">
      ${COUNTRIES.map((x) => {
        const r = st.relations[x.id];
        const rl = relationLabel(r.relation);
        const active = x.id === selected;
        return `
          <button class="country ${active ? 'sel' : ''}" data-cmd="wld:select:${x.id}"
            style="${active ? 'border-color:var(--accent);background:rgba(25,224,138,.07)' : ''}">
            <div class="country-top">
              <span class="country-flag">${x.flag}</span>
              <div style="flex:1;min-width:0">
                <div class="country-name">${esc(x.name)}</div>
                <div class="tiny muted">${esc(BLOCS[x.bloc]?.label || '')} · poder ${x.power}</div>
              </div>
              <span class="pill ${rl.tone}" style="font-size:10px">${Math.round(r.relation)}</span>
            </div>
            <div class="rel-bar"><i style="width:${r.relation}%;background:${barColor(r.relation)}"></i></div>
            <div class="country-trait">${esc(x.trait)}</div>
          </button>`;
      }).join('')}
    </div>

    <div class="section-title">${c.flag} ${esc(c.name)} — relações</div>
    <div class="grid cols-2">
      <div class="card">
        <div class="card-title">🤝 Diplomacia <span class="sub">${esc(relationLabel(rel.relation).label)}</span></div>
        ${meter('Relação bilateral', rel.relation, { color: barColor(rel.relation) })}
        <div class="small muted mt-8" style="line-height:1.55">${esc(c.trait)}</div>
        <div class="section-title" style="margin-top:16px">Tratados</div>
        <div class="flex gap-8 wrap">
          ${Object.entries(TREATIES).map(([k, t]) => {
            const signed = !!rel.treaties[k];
            return `
              <button class="chip ${signed ? 'active' : ''}" data-cmd="wld:treaty:${c.id}:${k}" title="${esc(t.desc)}">
                ${t.icon} ${esc(t.label)} ${signed ? '✓' : ''}
              </button>`;
          }).join('')}
        </div>
        <div class="flex gap-8 wrap mt-14">
          <button class="btn small" data-cmd="wld:gift:${c.id}:40">💵 Ajuda N$ 40 bi</button>
          <button class="btn small" data-cmd="wld:gift:${c.id}:100">💵 Ajuda N$ 100 bi</button>
          <button class="btn small danger" data-cmd="wld:sanction:${c.id}">🚫 Sancionar</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🕵️ Operações e força</div>
        <p class="small muted" style="margin-bottom:12px;line-height:1.55">
          Espionagem, sabotagem e guerra. Cada operação pode ser descoberta — e cada descoberta tem preço diplomático.
        </p>
        <div class="grid" style="gap:8px">
          <button class="btn small" data-cmd="wld:spy:${c.id}:espionar_pais">🕵️ Espionar país</button>
          <button class="btn small" data-cmd="wld:spy:${c.id}:sabotar">💣 Sabotar economia</button>
          <button class="btn small" data-cmd="wld:spy:${c.id}:desinformar">📡 Desinformação</button>
          <button class="btn small" data-cmd="wld:spy:${c.id}:comprar_aliado">💼 Comprar aliado (N$ 60 bi)</button>
          <button class="btn small" data-cmd="wld:spy:${c.id}:exportar_revolucao">🚩 Exportar revolução</button>
          <button class="btn small danger" data-cmd="wld:spy:${c.id}:golpe_externo">🌍 Golpe no país</button>
          <button class="btn small danger" data-cmd="wld:spy:${c.id}:assassinar">🎯 Eliminar líder</button>
          <button class="btn small danger" data-cmd="wld:war:${c.id}">⚔️ Declarar guerra</button>
        </div>
      </div>
    </div>
  `;
}

function renderWars(st) {
  return `
    <div class="card" style="border-color:rgba(255,93,108,.4);margin-bottom:14px">
      <div class="card-title">⚔️ Guerras em curso</div>
      ${st.wars.map((w) => {
        const c = countryById(w.countryId);
        const progress = Math.max(-100, Math.min(100, w.progress));
        const youW = Math.max(0, progress) / 2;
        const themW = Math.max(0, -progress) / 2;
        return `
          <div style="margin-bottom:14px">
            <div class="flex between center" style="margin-bottom:6px">
              <span class="small"><b>${c.flag} ${esc(c.name)}</b></span>
              <span class="tiny muted">baixas estimadas: ${w.casualties.toLocaleString('pt-BR')}</span>
            </div>
            <div class="war-bar">
              <span class="you" style="left:${50 - youW}%;width:${youW}%"></span>
              <span class="them" style="right:${50 - themW}%;width:${themW}%"></span>
            </div>
            <div class="flex between mt-8">
              <span class="tiny" style="color:${progress > 0 ? 'var(--good)' : 'var(--muted)'}">Você ${Math.max(0, progress).toFixed(0)}</span>
              <button class="btn tiny" data-cmd="wld:peace:${c.id}">Negociar paz</button>
              <span class="tiny" style="color:${progress < 0 ? 'var(--danger)' : 'var(--muted)'}">${Math.abs(Math.min(0, progress)).toFixed(0)} ${esc(c.name)}</span>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

registerCommands({
  wld(action, arg, el, ev, app) {
    const st = app.state;
    ensureRelations(st);

    if (action === 'select') { app.ui.worldId = arg; sfx('click'); app.render(); return; }

    if (action === 'treaty') {
      const [id, treaty] = arg.split(':');
      const c = countryById(id);
      const rel = st.relations[id];
      const signed = !!rel.treaties[treaty];
      const res = signed ? breakTreaty(st, id, treaty) : signTreaty(st, id, treaty);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); sfx('bad'); return; }
      sfx(signed ? 'warn' : 'good');
      toast(signed ? `Tratado rompido com ${c.name}.` : `Tratado assinado com ${c.name}.`, signed ? 'warn' : 'good', '🤝');
      app.save(); app.render();
      return;
    }

    if (action === 'gift') {
      const [id, amount] = arg.split(':');
      const res = giftCountry(st, id, Number(amount));
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      sfx('good');
      app.save(); app.render();
      return;
    }

    if (action === 'sanction') {
      const res = sanctionCountry(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      sfx('warn');
      app.save(); app.render();
      return;
    }

    if (action === 'spy') {
      const [id, op] = arg.split(':');
      const c = countryById(id);
      const risky = ['assassinar', 'golpe_externo', 'sabotar'].includes(op);
      if (risky && !confirm(`Executar "${op}" contra ${c.name}? Se for descoberto, haverá crise diplomática.`)) return;
      const res = resolveEspionage(st, op, id);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      st.cooldowns[op] = st.turn;
      sfx(res.success ? 'good' : 'bad');
      toast(res.success ? `Operação em ${c.name}: sucesso.` : `Operação em ${c.name}: falhou.`, res.success ? 'good' : 'bad', '🕵️');
      if (res.intel) setTimeout(() => toast(`Intel: ${res.intel.join(' · ')}`, 'info', '📄', 6000), 400);
      app.save(); app.render();
      return;
    }

    if (action === 'war') {
      const c = countryById(arg);
      if (!confirm(`Declarar guerra a ${c.name}? Poder militar seu ${Math.round(st.stats.poderMilitar)} contra ${c.power}.`)) return;
      const res = declareWar(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      sfx('bad');
      toast(`Guerra declarada contra ${c.name}.`, 'bad', '⚔️');
      app.save(); app.render();
      return;
    }

    if (action === 'peace') {
      const res = peaceTreaty(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      toast(res.text, 'info', '🕊️');
      app.save(); app.render();
    }
  },
});
