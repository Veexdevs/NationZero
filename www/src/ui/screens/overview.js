/* Tela: Visão geral */

import { dateLabel, ROLES, REGIMES, isRuler, isAuthoritarian, playerSeats, totalSeats, monthlyRevenue, monthlySpending, factionAverage } from '../../engine/state.js';
import { forecast } from '../../engine/simulation.js';
import { esc, money, barColor, num } from '../dom.js';
import { statCard, factionRows, parliamentBar, emptyState, seatsLabel, meter, rolePill, regimePill } from '../parts.js';

const OVERVIEW_STATS = ['economia', 'aprovacao', 'estabilidade', 'agitacao', 'liberdades', 'corrupcao', 'inflacao', 'desemprego', 'saude', 'educacao', 'infraestrutura', 'reputacao'];

export function renderOverview(app) {
  const st = app.state;
  const d = app.ui.deltas || {};
  const fc = forecast(st);
  const role = ROLES[st.role] || ROLES.cidadao;
  const regime = REGIMES[st.regime] || REGIMES.democracia;
  const revenue = monthlyRevenue(st);
  const spending = monthlySpending(st);
  const balance = revenue - spending;
  const avgFac = factionAverage(st);
  const nextEl = Math.max(0, (st.elections.nextTurn || 48) - st.turn);

  const crisis = [];
  if (st.stats.inflacao > 20) crisis.push(`🔥 Inflação em ${st.stats.inflacao.toFixed(0)}%`);
  if (st.stats.desemprego > 18) crisis.push(`🧾 Desemprego em ${st.stats.desemprego.toFixed(0)}%`);
  if (st.stats.agitacao > 60) crisis.push('📢 Ruas em ebulição');
  if (st.stats.tesouro < 0) crisis.push('💳 Caixa no vermelho');
  if (st.stats.divida > 130) crisis.push('📉 Dívida insustentável');
  if (st.stats.sancoes > 25) crisis.push('🚫 Sanções internacionais');
  if (st.wars.length) crisis.push('⚔️ Guerra em curso');
  if (st.stats.repressao > 55) crisis.push('⛓️ Repressão em nível crítico');

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${esc(st.meta.flag || '🏛️')} ${esc(st.meta.nationName)}</h2>
        <p class="screen-sub">${esc(st.meta.motto || '')} · Capital: ${esc(st.meta.capital)} · ${esc(dateLabel(st))}</p>
      </div>
      <div class="flex gap-8 wrap">
        ${rolePill(st)}
        ${regimePill(st)}
        ${seatsLabel(st)}
      </div>
    </div>

    ${crisis.length ? `
      <div class="card" style="border-color:rgba(255,93,108,.35);background:rgba(255,93,108,.06);margin-bottom:14px">
        <div class="card-title" style="margin-bottom:8px">🚨 Situações críticas</div>
        <div class="chips">${crisis.map((c) => `<span class="chip" style="color:#ffb0b8;border-color:rgba(255,93,108,.3)">${esc(c)}</span>`).join('')}</div>
      </div>` : ''}

    <div class="section-title">Estado da nação</div>
    <div class="grid cols-4">
      ${OVERVIEW_STATS.map((k) => statCard(k, st.stats[k], d[k])).join('')}
    </div>

    <div class="grid cols-2 mt-20">
      <div class="card">
        <div class="card-title">📊 Orçamento mensal <span class="sub">${balance >= 0 ? 'superávit' : 'déficit'}</span></div>
        <div class="flex between center" style="margin-bottom:12px">
          <div>
            <div class="tiny muted">SALDO</div>
            <div style="font-size:24px;font-weight:800;color:${balance >= 0 ? 'var(--good)' : 'var(--danger)'}">${balance >= 0 ? '+' : '−'}${money(Math.abs(balance)).replace('N$ ', 'N$ ')}</div>
          </div>
          <div class="right">
            <div class="tiny muted">RECEITA / GASTO</div>
            <div class="mono" style="font-size:13px">${revenue.toFixed(0)} / ${spending.toFixed(0)}</div>
          </div>
        </div>
        ${meter('Arrecadação', Math.min(100, revenue), { color: '#19e08a' })}
        ${meter('Gastos', Math.min(100, spending), { color: '#ffab4a' })}
        ${meter('Dívida pública', Math.min(100, st.stats.divida / 2), { color: barColor(100 - st.stats.divida / 2) })}
        <button class="btn small mt-14" data-cmd="nav:economy">⚙️ Ajustar impostos e gastos</button>
      </div>

      <div class="card">
        <div class="card-title">🗳️ Situação política</div>
        <div class="row" style="margin-bottom:8px">
          <span class="ico">${role.icon}</span>
          <div class="body"><div class="name">${esc(role.label)}</div><div class="desc">${esc(role.desc)}</div></div>
        </div>
        <div class="row" style="margin-bottom:8px">
          <span class="ico">${regime.icon}</span>
          <div class="body"><div class="name">${esc(regime.label)}</div><div class="desc">${esc(regime.desc)}</div></div>
        </div>
        <div class="flex between small mt-14">
          <span class="muted">Próxima eleição</span>
          <span class="mono">${nextEl} meses</span>
        </div>
        <div class="flex between small" style="margin-top:6px">
          <span class="muted">Cadeiras do seu partido</span>
          <span class="mono">${playerSeats(st)} / ${totalSeats(st)}</span>
        </div>
        <div class="flex between small" style="margin-top:6px">
          <span class="muted">Chance de golpe contra você</span>
          <span class="mono" style="color:${fc.coupChance > 45 ? 'var(--danger)' : fc.coupChance > 25 ? 'var(--warn)' : 'var(--good)'}">${fc.coupChance.toFixed(0)}%</span>
        </div>
        <button class="btn small mt-14" data-cmd="nav:politics">🗳️ Ver parlamento e eleições</button>
      </div>
    </div>

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">🤝 Bases de apoio <span class="sub">média ${Math.round(avgFac)}</span></div>
        ${factionRows(st)}
      </div>

      <div class="card">
        <div class="card-title">🏛️ Congresso <span class="sub">${st.flags.congresso_fechado ? 'fechado' : 'em funcionamento'}</span></div>
        ${st.flags.congresso_fechado ? emptyState('🔒', 'O Congresso está fechado. Você governa por decreto.') : parliamentBar(st)}
        <div class="mt-14 flex gap-8 wrap">
          <button class="btn small" data-cmd="nav:politics">Ver política</button>
          <button class="btn small" data-cmd="nav:laws">Aprovar leis</button>
        </div>
      </div>
    </div>

    <div class="section-title">Acontecimentos recentes</div>
    <div class="card tight">
      ${st.log.length ? st.log.slice(0, 6).map((l) => `
        <div class="log-entry ${esc(l.tone || 'info')}">
          <div class="log-date">${esc(l.date)}</div>
          <div class="log-ico">${esc(l.icon || '•')}</div>
          <div class="log-text">${esc(l.text)}</div>
        </div>`).join('') : emptyState('📖', 'Nada aconteceu ainda. Avance um mês.')}
    </div>
  `;
}
