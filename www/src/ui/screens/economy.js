/* Tela: Economia */

import { monthlyRevenue, monthlySpending, avgTaxRate, statLabel } from '../../engine/state.js';
import { esc, money, barColor } from '../dom.js';
import { statCard, meter } from '../parts.js';
import { registerCommands } from '../registry.js';
import { toast, sfx } from '../dom.js';
import { iconOf } from '../icons.js';

const TAXES = [
  { k: 'renda', label: 'Imposto de renda', icon: 'receipt', hint: 'Progressivo sobre pessoas físicas.' },
  { k: 'empresas', label: 'Imposto de empresas', icon: 'factory', hint: 'Lucro e faturamento corporativo.' },
  { k: 'consumo', label: 'Imposto sobre consumo', icon: 'shopping-cart', hint: 'Recai sobre todos, pesa mais nos pobres.' },
  { k: 'patrimonio', label: 'Imposto sobre patrimônio', icon: 'gem', hint: 'Grandes fortunas, heranças e propriedade.' },
  { k: 'tarifas', label: 'Tarifas de importação', icon: 'ship', hint: 'Protege a indústria, encarece produtos.' },
];

const SPEND = [
  { k: 'saude', label: 'Saúde', icon: 'hospital', hint: 'Hospitais, postos e vacinação.' },
  { k: 'educacao', label: 'Educação', icon: 'graduation-cap', hint: 'Escolas, universidades e professores.' },
  { k: 'infraestrutura', label: 'Infraestrutura', icon: 'bridge', hint: 'Estradas, saneamento, energia.' },
  { k: 'militar', label: 'Defesa', icon: 'medal', hint: 'Salários, equipamento e lealdade militar.' },
  { k: 'seguranca', label: 'Segurança pública', icon: 'badge', hint: 'Polícia, inteligência e prisões.' },
  { k: 'ciencia', label: 'Ciência & tecnologia', icon: 'flask-conical', hint: 'Pesquisa, inovação e tecnologia.' },
  { k: 'cultura', label: 'Cultura', icon: 'drama', hint: 'Museus, artistas e patrimônio.' },
  { k: 'previdencia', label: 'Previdência', icon: 'user', hint: 'Aposentadorias e assistência.' },
];

export function renderEconomy(app) {
  const st = app.state;
  const d = app.ui.deltas || {};
  const revenue = monthlyRevenue(st);
  const spending = monthlySpending(st);
  const balance = revenue - spending;
  const taxRate = avgTaxRate(st);

  return `
    <div class="screen-head">
      <div>
        <h2 class="screen-title">${iconOf('coins', 15)} Economia</h2>
        <p class="screen-sub">Impostos, gastos e os números que sustentam (ou afundam) seu governo.</p>
      </div>
      <div class="flex gap-8 wrap">
        <span class="pill ${balance >= 0 ? 'good' : 'bad'}">${balance >= 0 ? '+' : '−'}${money(Math.abs(balance))}/mês</span>
      </div>
    </div>

    <div class="grid cols-4">
      ${statCard('tesouro', st.stats.tesouro, d.tesouro)}
      ${statCard('economia', st.stats.economia, d.economia)}
      ${statCard('inflacao', st.stats.inflacao, d.inflacao)}
      ${statCard('desemprego', st.stats.desemprego, d.desemprego)}
      ${statCard('divida', st.stats.divida, d.divida)}
      ${statCard('crescimento', st.stats.crescimento, d.crescimento)}
      ${statCard('populacao', st.stats.populacao, d.populacao)}
      ${statCard('reputacao', st.stats.reputacao, d.reputacao)}
    </div>

    <div class="grid cols-2 mt-14">
      <div class="card">
        <div class="card-title">${iconOf('receipt', 15)} Impostos</div>
        ${TAXES.map((t) => sliderRow(`tax:${t.k}`, t.icon, t.label, st.taxes[t.k], 0, 60, '%', t.hint)).join('')}
        <p class="tiny muted mt-8">Carga média efetiva: <b>${taxRate.toFixed(1)}%</b>. Acima de ~35% a economia desacelera e a evasão cresce.</p>
      </div>

      <div class="card">
        <div class="card-title">${iconOf('landmark', 15)} Gastos públicos</div>
        ${SPEND.map((s) => sliderRow(`spend:${s.k}`, s.icon, s.label, st.spending[s.k], 0, 45, '', s.hint)).join('')}
        <p class="tiny muted mt-8">Gasto total: <b>N$ ${spending.toFixed(0)} bi/mês</b>.</p>
      </div>
    </div>

    <div class="card mt-14">
      <div class="card-title">${iconOf('bar-chart', 15)} Balanço <span class="sub">${balance >= 0 ? 'superávit' : 'déficit'}</span></div>
      <div class="grid cols-3">
        <div class="stat">
          <div class="lbl">${iconOf('download', 15)} Receita mensal</div>
          <div class="val">${money(revenue)}</div>
          <div class="bar"><i style="width:${Math.min(100, revenue / 2)}%;background:#19e08a"></i></div>
        </div>
        <div class="stat">
          <div class="lbl">${iconOf('upload', 15)} Despesa mensal</div>
          <div class="val">${money(spending)}</div>
          <div class="bar"><i style="width:${Math.min(100, spending / 2)}%;background:#ffab4a"></i></div>
        </div>
        <div class="stat">
          <div class="lbl">${iconOf('scale', 15)} Saldo</div>
          <div class="val" style="color:${balance >= 0 ? 'var(--good)' : 'var(--danger)'}">${balance >= 0 ? '+' : '−'}${money(Math.abs(balance))}</div>
          <div class="bar"><i style="width:${Math.min(100, Math.abs(balance) * 2)}%;background:${balance >= 0 ? 'var(--good)' : 'var(--danger)'}"></i></div>
        </div>
      </div>
      <div class="mt-14">
        ${meter('Dívida / PIB estimado', Math.min(100, st.stats.divida / 4), { color: barColor(100 - st.stats.divida / 4) })}
        ${meter('Sanções econômicas', st.stats.sancoes, { color: barColor(100 - st.stats.sancoes) })}
      </div>
      <div class="flex gap-8 wrap mt-14">
        <button class="btn small" data-cmd="act:cat:economia">${iconOf('coins', 15)} Intervenções de emergência</button>
        <button class="btn small" data-cmd="nav:laws">${iconOf('scroll-text', 15)} Leis econômicas</button>
      </div>
    </div>

    <div class="card mt-14">
      <div class="card-title">${iconOf('lightbulb', 15)} Como a economia funciona</div>
      <p class="small muted" style="line-height:1.7">
        Impostos financiam gastos. Gastos em saúde, educação, infraestrutura e ciência melhoram serviços
        e a economia no longo prazo. Inflação alta corrói aprovação; desemprego alto enche as ruas.
        Dívida crescente come juros do orçamento. Repressão e sanções espantam investimento.
      </p>
    </div>
  `;
}

function sliderRow(path, icon, label, value, min, max, suffix, hint) {
  return `
    <div class="slider-row" title="${esc(hint || '')}">
      <div class="lab"><span>${icon}</span><span>${esc(label)}</span></div>
      <div class="val">${value}${suffix}</div>
      <input type="range" min="${min}" max="${max}" value="${value}" data-slider="${path}" />
    </div>`;
}

registerCommands({
  eco(action, arg) {
    const app = window.NZ;
    if (action === 'reset') {
      app.state.taxes = { renda: 25, empresas: 25, consumo: 15, patrimonio: 5, tarifas: 10 };
      app.state.spending = { saude: 15, educacao: 15, infraestrutura: 10, militar: 10, seguranca: 8, ciencia: 5, cultura: 3, previdencia: 12 };
      toast('Orçamento restaurado ao padrão', 'info', 'undo');
      app.save();
      app.render();
    }
  },
});
