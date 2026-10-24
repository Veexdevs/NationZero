/* Tela: Política — partido, carreira, eleições e parlamento */

import { ROLES, isRuler, isAuthoritarian, playerSeats, totalSeats, factionAverage, dateLabel, clamp } from '../../engine/state.js';
import { electionForecast, runElection, rigElections, availableActions, performAction, ideologyLabel } from '../../engine/politics.js';
import { esc, barColor, sfx, toast } from '../dom.js';
import { parliamentBar, factionRows, meter, seatsLabel, rolePill } from '../parts.js';
import { registerCommands } from '../registry.js';
import { showPartyModal, showElectionModal } from '../modals.js';

export function renderPolitics(app) {
  const st = app.state;
  const f = electionForecast(st);
  const next = Math.max(0, (st.elections.nextTurn || 48) - st.turn);
  const role = ROLES[st.role] || ROLES.cidadao;
  const campaignActions = availableActions(st).filter((a) => a.action.cat === 'politica');

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">🗳️ Política</h2>
        <p class="screen-sub">Partido, carreira, eleições e o Congresso. Todo poder começa com organização.</p>
      </div>
      <div class="flex gap-8 wrap">${rolePill(st)} ${seatsLabel(st)}</div>
    </div>

    ${st.party ? renderPartyCard(st) : renderNoPartyCard(st)}

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">🗳️ Próxima eleição <span class="sub">${next} meses</span></div>
        <p class="small muted" style="margin-bottom:10px">Estimativa de votos com o cenário atual. Campanhas, aprovação e bases mudam tudo.</p>
        ${f.parties.map((p) => {
          const color = p.npc ? '#7c8f89' : (st.party?.color || '#19e08a');
          return `
            <div class="faction-row">
              <span class="fi">${p.npc ? '🏛️' : '⭐'}</span>
              <span class="fn">${esc(p.sigla)} ${p.npc ? '' : '<b>(você)</b>'}</span>
              <span class="ft" style="width:100px"><i style="width:${(p.share * 100).toFixed(0)}%;background:${color}"></i></span>
              <span class="fv" style="width:42px">${(p.share * 100).toFixed(0)}%</span>
            </div>`;
        }).join('')}
        <div class="flex gap-8 wrap mt-14">
          <button class="btn small" data-cmd="pol:snap">⚡ Eleições antecipadas</button>
          ${st.party ? '<button class="btn small" data-cmd="pol:action:comicio">📣 Comício</button>' : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">🧮 Integridade eleitoral</div>
        ${meter('Controle do sistema eleitoral', st.institutions.eleitoral, { color: barColor(st.institutions.eleitoral) })}
        <p class="small muted mt-8" style="line-height:1.55">
          Controlar o sistema eleitoral aumenta seus votos — e destrói a legitimidade no exterior.
        </p>
        <div class="flex gap-8 wrap mt-14">
          <button class="btn small" data-cmd="pol:rig:0">🧼 Eleição limpa</button>
          <button class="btn small" data-cmd="pol:rig:1">🧮 Manipulação leve</button>
          <button class="btn small danger" data-cmd="pol:rig:2">🎭 Fraude ampla</button>
        </div>
        <div class="tiny muted mt-8">${st.flags.congresso_fechado ? '⚠️ Congresso fechado: resultados são ignorados.' : ''}</div>
      </div>
    </div>

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">🏛️ Congresso <span class="sub">${totalSeats(st)} cadeiras</span></div>
        ${st.flags.congresso_fechado ? '<div class="empty"><span class="eico">🔒</span>Congresso fechado por decreto.</div>' : parliamentBar(st)}
        <div class="small muted mt-14" style="line-height:1.6">
          Maioria = ${Math.floor(totalSeats(st) / 2) + 1} cadeiras.
          ${playerSeats(st) > totalSeats(st) / 2 ? ' ✅ Você tem maioria e pode aprovar quase tudo.' : ' Sem maioria, leis radicais ficam travadas.'}
        </div>
      </div>

      <div class="card">
        <div class="card-title">🪜 Sua carreira</div>
        ${renderCareer(st)}
      </div>
    </div>

    <div class="section-title">Articulação política</div>
    <div class="grid cols-2">
      ${campaignActions.map(({ action, cooldown, allowed, afford }) => `
        <div class="law">
          <div class="law-top">
            <span class="law-ico">${action.icon}</span>
            <div style="flex:1">
              <div class="law-name">${esc(action.name)}</div>
              <div class="law-desc">${esc(action.desc)}</div>
            </div>
          </div>
          <div class="law-foot">
            ${action.cost?.influencia ? `<span class="law-cost">🤝 ${action.cost.influencia}</span>` : ''}
            ${action.cost?.tesouro ? `<span class="law-cost">💰 ${action.cost.tesouro}</span>` : ''}
            ${action.cost?.poder ? `<span class="law-cost">⚡ ${action.cost.poder}</span>` : ''}
            <div style="flex:1"></div>
            ${allowed && afford.ok
              ? `<button class="btn tiny primary" data-cmd="pol:action:${action.id}">Fazer</button>`
              : `<span class="tiny" style="color:var(--warn)">${esc(cooldown > 0 ? `Recarrega em ${cooldown}m` : (!afford.ok ? afford.reason : 'Bloqueado'))}</span>`}
          </div>
        </div>`).join('')}
    </div>

    <div class="card mt-14">
      <div class="card-title">🤝 Bases e eleitorado</div>
      <div class="grid cols-2">
        <div>${factionRows(st)}</div>
        <div>
          <p class="small muted" style="line-height:1.7">
            Seu partido é julgado pela coerência entre o que promete e o que faz.
            ${st.party ? `Hoje ele é visto como <b>${esc(ideologyLabel(st.party.ideology))}</b>.` : ''}
          </p>
          <div class="mt-14">
            ${meter('Aprovação', st.stats.aprovacao, { color: barColor(st.stats.aprovacao) })}
            ${meter('Média das bases', factionAverage(st), { color: barColor(factionAverage(st)) })}
            ${meter('Liberdades civis', st.stats.liberdades, { color: barColor(st.stats.liberdades) })}
            ${meter('Legitimidade', st.stats.legitimidade, { color: barColor(st.stats.legitimidade) })}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNoPartyCard(st) {
  return `
    <div class="card" style="border-color:rgba(25,224,138,.3);background:rgba(25,224,138,.05)">
      <div class="card-title">🎩 Você não tem partido</div>
      <p class="small muted" style="line-height:1.6;margin-bottom:12px">
        Sem partido, você não disputa eleições nem aprova leis no Congresso.
        Funde o seu: escolha nome, sigla, cor, símbolo e ideologia.
      </p>
      <button class="btn primary small" data-cmd="pol:create_party">Fundar meu partido</button>
    </div>`;
}

function renderPartyCard(st) {
  const p = st.party;
  const seats = playerSeats(st);
  return `
    <div class="card" style="border-color:${p.color}55;background:linear-gradient(135deg, ${p.color}12, transparent 60%)">
      <div class="flex between center wrap gap-14">
        <div class="flex gap-14 center">
          <div style="width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:${p.color}22;border:1px solid ${p.color}55">${esc(p.symbol)}</div>
          <div>
            <div style="font-size:18px;font-weight:800">${esc(p.sigla)} · ${esc(p.name)}</div>
            <div class="small muted">${esc(p.slogan || '')}</div>
            <div class="tiny" style="color:${p.color};margin-top:3px">${esc(ideologyLabel(p.ideology))}</div>
          </div>
        </div>
        <div class="flex gap-14">
          <div class="right"><div class="tiny muted">MEMBROS</div><div class="mono" style="font-weight:700">${Math.round(p.members).toLocaleString('pt-BR')}</div></div>
          <div class="right"><div class="tiny muted">CAIXA</div><div class="mono" style="font-weight:700">N$ ${p.funds.toFixed(0)} mi</div></div>
          <div class="right"><div class="tiny muted">CADEIRAS</div><div class="mono" style="font-weight:700">${seats}</div></div>
        </div>
      </div>
    </div>`;
}

function renderCareer(st) {
  const order = ROLES[st.role]?.order ?? 0;
  const steps = ['cidadao', 'ativista', 'lider_partido', 'deputado', 'ministro', 'vice', 'presidente'];
  return steps.map((k) => {
    const r = ROLES[k];
    const done = order >= r.order;
    const current = st.role === k || (k === 'presidente' && (st.role === 'ditador' || st.role === 'monarca'));
    return `
      <div class="row" style="margin-bottom:6px;${current ? 'border-color:rgba(25,224,138,.45);background:rgba(25,224,138,.07)' : done ? '' : 'opacity:.55'}">
        <span class="ico">${r.icon}</span>
        <div class="body"><div class="name">${esc(r.label)}</div><div class="desc">${esc(r.desc)}</div></div>
        <div class="right">${current ? '<span class="pill good" style="font-size:10px">agora</span>' : done ? '<span class="tiny" style="color:var(--good)">✓</span>' : ''}</div>
      </div>`;
  }).join('') + (
    (st.role === 'ditador' || st.role === 'monarca')
      ? `<div class="pill warn mt-8">${ROLES[st.role].icon} ${esc(ROLES[st.role].label)} — acima da hierarquia</div>`
      : ''
  );
}

registerCommands({
  pol(action, arg) {
    const app = window.NZ;
    const st = app.state;
    if (action === 'create_party') { sfx('click'); showPartyModal(app, () => app.render()); return; }
    if (action === 'snap') {
      if (!st.party) { toast('Funde um partido primeiro', 'warn', '🎩'); return; }
      if (!confirm('Convocar eleições antecipadas agora? Pode ganhar ou perder o cargo.')) return;
      const res = runElection(st);
      sfx(res.won ? 'epic' : 'bad');
      app.save(); app.render();
      showElectionModal(app, res, () => app.render());
      return;
    }
    if (action === 'rig') {
      const level = Number(arg);
      const cost = level === 0 ? 0 : level === 1 ? 8 : 20;
      if (st.stats.poder < cost) { toast(`Poder insuficiente (${cost})`, 'warn', '⚠️'); return; }
      if (level > 0 && !confirm(level === 2 ? 'Fraude ampla? Isso destrói sua legitimidade internacional.' : 'Manipulação leve do processo eleitoral?')) return;
      st.stats.poder = clamp(st.stats.poder - cost, 0, 100);
      rigElections(st, level);
      sfx(level ? 'warn' : 'good');
      toast(level ? 'Sistema eleitoral manipulado.' : 'Processo eleitoral limpo.', level ? 'warn' : 'good', '🧮');
      app.save(); app.render();
      return;
    }
    if (action === 'action') {
      const entry = availableActions(st).find((a) => a.action.id === arg);
      if (!entry) return;
      if (entry.action.dialog) {
        if (arg === 'fundar_partido') { showPartyModal(app, () => app.render()); return; }
        if (arg === 'dissolver_parlamento') {
          if (!confirm('Dissolver o parlamento e convocar eleições antecipadas?')) return;
          const res = runElection(st);
          sfx(res.won ? 'epic' : 'bad');
          app.save(); app.render();
          showElectionModal(app, res, () => app.render());
          return;
        }
        if (arg === 'plebiscito') {
          import('../modals.js').then((m) => m.showPlebisciteModal(app));
          return;
        }
        return;
      }
      if (!entry.allowed) { toast(entry.cooldown > 0 ? `Recarrega em ${entry.cooldown}m` : 'Requisitos não atendidos', 'warn', '⚠️'); return; }
      if (!entry.afford.ok) { toast(entry.afford.reason, 'warn', '⚠️'); return; }
      const res = performAction(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
      sfx('good');
      toast(`${entry.action.icon} ${entry.action.name}`, 'good', entry.action.icon);
      app.save(); app.render();
    }
  },
});
