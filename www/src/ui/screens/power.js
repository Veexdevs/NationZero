/* Tela: Poder, regime e ideologia */

import { isRuler, isAuthoritarian, ROLES, REGIMES, factionAverage } from '../../engine/state.js';
import { forecast } from '../../engine/simulation.js';
import { availableActions, coupOdds, performAction } from '../../engine/politics.js';
import { esc, barColor } from '../dom.js';
import { statCard, meter, ideologyBars, factionRows, rolePill, regimePill, emptyState } from '../parts.js';
import { registerCommands } from '../registry.js';
import { showDecreeModal, showCoupModal, showPurgeModal } from '../modals.js';
import { toast, sfx } from '../dom.js';

export function renderPower(app) {
  const st = app.state;
  const fc = forecast(st);
  const role = ROLES[st.role] || ROLES.cidadao;
  const regime = REGIMES[st.regime] || REGIMES.democracia;
  const d = app.ui.deltas || {};
  const powerActions = availableActions(st).filter((a) => ['poder', 'politica'].includes(a.action.cat) && ['golpe', 'purgar', 'prender', 'censurar', 'controlar', 'comprar_militares', 'culto', 'fechar_congresso', 'dissolver', 'reeleicao', 'autoanistia', 'fugir', 'renunciar', 'autogolpe', 'proclamar', 'golpe_militar'].some((k) => a.action.id.includes(k)));

  const riskLevel = fc.coupChance > 50 ? 'Crítico' : fc.coupChance > 30 ? 'Alto' : fc.coupChance > 15 ? 'Moderado' : 'Baixo';
  const riskColor = fc.coupChance > 50 ? 'var(--danger)' : fc.coupChance > 30 ? 'var(--warn)' : 'var(--good)';

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">👑 Poder</h2>
        <p class="screen-sub">Como você se mantém no topo — e o que está disposto a fazer para não sair.</p>
      </div>
      <div class="flex gap-8 wrap">${rolePill(st)} ${regimePill(st)}</div>
    </div>

    <div class="grid cols-4">
      ${statCard('poder', st.stats.poder, d.poder)}
      ${statCard('legitimidade', st.stats.legitimidade, d.legitimidade)}
      ${statCard('medo', st.stats.medo, d.medo)}
      ${statCard('repressao', st.stats.repressao, d.repressao)}
    </div>

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">🏛️ Controle institucional</div>
        ${meter('Mídia', st.institutions.midia, { color: barColor(st.institutions.midia) })}
        ${meter('Judiciário', st.institutions.judiciario, { color: barColor(st.institutions.judiciario) })}
        ${meter('Polícia', st.institutions.policia, { color: barColor(st.institutions.policia) })}
        ${meter('Forças armadas', st.institutions.militar, { color: barColor(st.institutions.militar) })}
        ${meter('Sistema eleitoral', st.institutions.eleitoral, { color: barColor(st.institutions.eleitoral) })}
        <p class="tiny muted mt-14">Controle alto significa obediência — e menos legitimidade democrática.</p>
      </div>

      <div class="card" style="border-color:${fc.coupChance > 40 ? 'rgba(255,93,108,.4)' : 'var(--line)'}">
        <div class="card-title">⚠️ Risco de queda <span class="sub" style="color:${riskColor}">${riskLevel}</span></div>
        <div class="flex between center" style="margin-bottom:10px">
          <span class="small muted">Chance de golpe militar contra você</span>
          <span style="font-size:22px;font-weight:800;color:${riskColor}">${fc.coupChance.toFixed(0)}%</span>
        </div>
        ${meter('Estabilidade', st.stats.estabilidade, { color: barColor(st.stats.estabilidade) })}
        ${meter('Agitação popular', st.stats.agitacao, { color: barColor(100 - st.stats.agitacao) })}
        ${meter('Lealdade militar', st.stats.lealdadeMilitar, { color: barColor(st.stats.lealdadeMilitar) })}
        ${meter('Aprovação', st.stats.aprovacao, { color: barColor(st.stats.aprovacao) })}
        <div class="flex gap-8 mt-14 wrap">
          ${isRuler(st) && !isAuthoritarian(st) ? '<button class="btn small danger" data-cmd="pow:coup:autogolpe">⚡ Autogolpe</button>' : ''}
          ${isRuler(st) ? '<button class="btn small danger" data-cmd="pow:coup:proclamar_ditadura">👑 Proclamar ditadura</button>' : ''}
          ${!isRuler(st) ? '<button class="btn small danger" data-cmd="pow:coup:golpe_militar">🪖 Golpe militar</button>' : ''}
        </div>
      </div>
    </div>

    <div class="section-title">Ferramentas do regime</div>
    <div class="grid cols-2">
      <div class="card">
        <div class="card-title">🗡️ Coerção e controle</div>
        <div class="flex gap-8 wrap" style="margin-bottom:10px">
          <button class="btn small" data-cmd="pow:purge">Purgar adversários</button>
          <button class="btn small" data-cmd="pow:action:prender_oposicao">Prisões políticas</button>
          <button class="btn small" data-cmd="pow:action:censurar_midia">Intervir na imprensa</button>
          <button class="btn small" data-cmd="pow:action:controlar_judiciario">Subordinar Judiciário</button>
          <button class="btn small" data-cmd="pow:action:comprar_militares">Aumentar soldo militar</button>
          <button class="btn small" data-cmd="pow:action:reprimir_protesto">Reprimir protesto</button>
          <button class="btn small" data-cmd="pow:action:cercar_capital">Cercar a capital</button>
          <button class="btn small" data-cmd="pow:action:culto">Culto à personalidade</button>
        </div>
        <div class="tiny muted">Ações exigem ⚡ Poder e podem ter recarga. Veja os detalhes na aba Ações.</div>
      </div>

      <div class="card">
        <div class="card-title">✍️ Decretos personalizados</div>
        <p class="small muted" style="line-height:1.55;margin-bottom:12px">
          Invente sua própria medida: escolha um nome, uma justificativa e até três efeitos.
          É o jeito de fazer algo que nenhuma lei prevê.
        </p>
        <button class="btn primary small" data-cmd="pow:decree">Escrever decreto</button>
        ${st.custom.length ? `
          <div class="mt-14">
            <div class="tiny muted" style="margin-bottom:6px">SEUS DECRETOS</div>
            ${st.custom.slice(-4).reverse().map((c) => `
              <div class="row" style="margin-bottom:6px">
                <span class="ico">✍️</span>
                <div class="body"><div class="name">${esc(c.name)}</div><div class="desc">${esc(c.date)} · ${c.picks.length} medidas</div></div>
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">🧭 Ideologia do seu governo</div>
        <p class="tiny muted" style="margin-bottom:12px">Cada eixo puxa facções e eleitores diferentes. Você também pode ajustar aqui, como um reposicionamento público.</p>
        ${ideologyBars(st, true)}
        <p class="tiny dim mt-8">As barras mudam sozinhas conforme suas leis e ações.</p>
      </div>

      <div class="card">
        <div class="card-title">🤝 Bases de apoio <span class="sub">média ${Math.round(factionAverage(st))}</span></div>
        ${factionRows(st)}
      </div>
    </div>

    <div class="card mt-14" style="border-color:rgba(255,93,108,.28)">
      <div class="card-title">☢️ Zona de risco</div>
      <p class="small muted" style="line-height:1.6;margin-bottom:12px">
        Atalhos para decisões que mudam o regime — ou terminam o jogo. Sem confirmação dupla, sem volta.
      </p>
      <div class="flex gap-8 wrap">
        <button class="btn small danger" data-cmd="pow:action:fechar_congresso">🔒 Fechar o parlamento</button>
        <button class="btn small danger" data-cmd="pow:action:reeleicao_decreto">⏳ Adiar eleições</button>
        <button class="btn small danger" data-cmd="pow:action:autoanistia">🕯️ Autoanistia</button>
        <button class="btn small" data-cmd="pow:action:fugir">✈️ Preparar exílio</button>
        <button class="btn small" data-cmd="pow:action:renunciar">🚪 Renunciar</button>
      </div>
    </div>
  `;
}

registerCommands({
  pow(action, arg) {
    const app = window.NZ;
    const st = app.state;
    if (action === 'decree') { sfx('click'); showDecreeModal(app); return; }
    if (action === 'purge') { sfx('click'); showPurgeModal(app); return; }
    if (action === 'coup') { sfx('click'); showCoupModal(app, arg); return; }
    if (action === 'action') {
      const a = availableActions(st).find((x) => x.action.id === arg);
      if (!a) { toast('Ação desconhecida', 'warn'); return; }
      if (arg === 'renunciar') {
        if (!confirm('Renunciar ao cargo? O jogo continua, mas você volta a ser cidadão.')) return;
        st.role = 'cidadao';
        st.legacy.daysInPower = st.legacy.daysInPower || 0;
        toast('Você renunciou.', 'warn', '🚪');
        app.save(); app.render();
        return;
      }
      if (!a.allowed) { toast(a.cooldown > 0 ? `Recarrega em ${a.cooldown} mês(es)` : 'Requisitos não atendidos', 'warn', '⚠️'); sfx('bad'); return; }
      if (!a.afford.ok) { toast(a.afford.reason, 'warn', '⚠️'); sfx('bad'); return; }
      const res = performAction(st, arg);
      if (!res.ok) { toast(res.reason, 'warn', '⚠️'); sfx('bad'); return; }
      sfx('good');
      toast(`${a.action.icon} ${a.action.name}`, 'good', a.action.icon);
      app.save();
      app.render();
      if (st.over) { app.screen = 'gameover'; app.render(); }
    }
  },
});
