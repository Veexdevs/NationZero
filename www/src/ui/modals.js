/* Modais: eventos, eleições, golpes, partido, discursos, alvos internacionais. */

import { EVENTS, EVENT_BY_ID } from '../data/events.js';
import { SPEECH_TOPICS, PURGE_STYLES } from '../data/actions.js';
import { PARTY_COLORS, PARTY_SYMBOLS } from '../data/origins.js';
import { COUNTRIES } from '../data/world.js';
import { closeModal, openModal, toast, sfx, esc, download, readFile } from './dom.js';
import { ROLES, REGIMES, exportState, importState, clearSave, clamp, applyEffect, isRuler, factionAverage, dateLabel } from '../engine/state.js';
import { resolveEventChoice } from '../engine/simulation.js';
import { createParty, giveSpeech, resolveCoup, coupOdds, resolvePurge, PURGE_TARGETS } from '../engine/politics.js';
import { ensureRelations, relationLabel, resolveEspionage, declareWar, peaceTreaty, giftCountry } from '../engine/world.js';
import { countryById } from '../engine/world.js';

/* ------------------------------------------------------------------ */
/* Eventos                                                             */
/* ------------------------------------------------------------------ */

export function showEventModal(app, eventId, onDone) {
  const event = EVENT_BY_ID[eventId];
  if (!event) { onDone && onDone(); return; }
  openModal(`
    <div class="modal-head event-modal">
      <div class="modal-ico">${event.icon}</div>
      <div>
        <div class="modal-tag">Evento · ${esc(dateLabel(app.state))}</div>
        <div class="modal-title">${esc(event.title)}</div>
      </div>
    </div>
    <div class="modal-text">${esc(event.text)}</div>
    <div class="modal-choices">
      ${event.choices.map((c, i) => `
        <button class="choice" data-evt-choice="${i}">
          <span class="cico">${c.icon || '▸'}</span>
          <span style="flex:1">
            <span class="ct">${esc(c.label)}</span>
            ${c.hint ? `<span class="cd">${esc(c.hint)}</span>` : ''}
          </span>
        </button>`).join('')}
    </div>
  `, {
    className: 'event-modal',
    onMount(root) {
      root.querySelectorAll('[data-evt-choice]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-evt-choice'));
          const choice = event.choices[idx];
          sfx('click');
          resolveEventChoice(app.state, eventId, idx);
          closeModal();
          toast(`${event.title}: ${choice.label}`, choice.special ? 'warn' : 'info', choice.icon || event.icon);
          app.save();
          app.render();
          if (app.state.over) {
            app.screen = 'gameover';
            app.render();
            setTimeout(() => showGameOver(app), 300);
          }
          onDone && onDone();
        });
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Eleições                                                            */
/* ------------------------------------------------------------------ */

export function showElectionModal(app, result, onDone) {
  const won = result.presidency;
  const st = app.state;
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">${won ? '🎖️' : '🗳️'}</div>
      <div>
        <div class="modal-tag">Eleições · ${esc(result.date)}</div>
        <div class="modal-title">${won ? 'Você venceu a eleição!' : 'Resultado das eleições'}</div>
      </div>
    </div>
    <div class="modal-text">
      ${result.playerShare !== undefined && app.state.party
        ? `Seu partido ${esc(app.state.party.sigla)} obteve <b>${(result.playerShare * 100).toFixed(1)}%</b> dos votos.`
        : 'Você não tinha partido nem candidatura. Apenas assistiu.'}
      ${won ? ' Você é o novo chefe de Estado.' : (result.threshold ? ` Era preciso ${(result.threshold * 100).toFixed(0)}% para governar.` : '')}
    </div>
    ${(result.parties || []).map((p) => {
      const total = result.parties.reduce((a, x) => a + x.seats, 0) || 1;
      const color = p.npc ? '#7c8f89' : (st.party?.color || '#19e08a');
      return `
        <div class="faction-row">
          <span class="fi">${p.npc ? '🏛️' : '⭐'}</span>
          <span class="fn">${esc(p.sigla)} ${p.npc ? '' : '(você)'}</span>
          <span class="ft" style="width:120px"><i style="width:${(p.seats / total) * 100}%;background:${color}"></i></span>
          <span class="fv" style="width:44px">${p.seats}</span>
        </div>`;
    }).join('')}
    <div class="modal-actions">
      <button class="btn primary" data-close>Continuar</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', () => {
        closeModal();
        app.save();
        app.render();
        onDone && onDone();
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Fim de jogo                                                         */
/* ------------------------------------------------------------------ */

export function showGameOver(app) {
  const st = app.state;
  if (!st?.over) return;
  const over = st.over;
  openModal(`
    <div class="modal-head event-modal">
      <div class="modal-ico">${over.icon || '🏁'}</div>
      <div>
        <div class="modal-tag">Fim da linha</div>
        <div class="modal-title">${esc(over.title)}</div>
      </div>
    </div>
    <div class="modal-text">${esc(over.text)}</div>
    <div class="legacy-grid">
      <div class="legacy-item"><b>${Math.floor((st.legacy.daysInPower || 0) / 365)} anos</b><span>No poder</span></div>
      <div class="legacy-item"><b>${Object.keys(st.policies).length}</b><span>Leis em vigor</span></div>
      <div class="legacy-item"><b>${st.legacy.lawsPassed || 0}</b><span>Leis aprovadas</span></div>
      <div class="legacy-item"><b>${st.legacy.coups || 0}</b><span>Golpes</span></div>
      <div class="legacy-item"><b>${st.legacy.purges || 0}</b><span>Purgas</span></div>
      <div class="legacy-item"><b>${st.legacy.wars || 0}</b><span>Guerras</span></div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" data-close>Ver o país</button>
      <button class="btn primary" data-newgame>Nova nação</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', () => closeModal());
      root.querySelector('[data-newgame]').addEventListener('click', () => {
        closeModal();
        clearSave();
        app.state = null;
        app.screen = 'setup';
        app.render();
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Partido                                                             */
/* ------------------------------------------------------------------ */

export function showPartyModal(app, onDone) {
  const st = app.state;
  const draft = {
    name: '', sigla: '', color: PARTY_COLORS[0], symbol: PARTY_SYMBOLS[0], slogan: '',
    ideo: { ...st.ideology },
  };
  const axes = {
    economico: ['Coletivista', 'Mercado'],
    social: ['Libertário', 'Autoritário'],
    nacionalismo: ['Globalista', 'Nacionalista'],
    religiao: ['Secular', 'Confessional'],
    ecologia: ['Produtivista', 'Ecológico'],
    tradicao: ['Progressista', 'Tradicional'],
  };

  openModal(`
    <div class="modal-head">
      <div class="modal-ico">🎩</div>
      <div>
        <div class="modal-tag">Política</div>
        <div class="modal-title">Fundar seu partido</div>
      </div>
    </div>
    <div class="modal-text">Uma sigla, um programa, uma ambição. Escolha com cuidado: a imprensa vai julgar cada palavra.</div>

    <div class="grid cols-2">
      <div class="field">
        <label>Nome do partido</label>
        <input class="input" id="party-name" maxlength="40" placeholder="Partido da Renovação Nacional" />
      </div>
      <div class="field">
        <label>Sigla</label>
        <input class="input" id="party-sigla" maxlength="6" placeholder="PRN" style="text-transform:uppercase" />
      </div>
    </div>
    <div class="field">
      <label>Slogan</label>
      <input class="input" id="party-slogan" maxlength="60" placeholder="Por um país que funcione." />
    </div>
    <div class="field">
      <label>Cor</label>
      <div class="color-swatches" id="party-colors">
        ${PARTY_COLORS.map((c) => `<button class="swatch ${c === draft.color ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
      </div>
    </div>
    <div class="field">
      <label>Símbolo</label>
      <div class="chips" id="party-symbols">
        ${PARTY_SYMBOLS.map((s) => `<button class="chip ${s === draft.symbol ? 'active' : ''}" data-symbol="${s}" style="font-size:16px">${s}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label>Ideologia do partido</label>
      <div class="ideology-bars">
        ${Object.entries(axes).map(([k, [neg, pos]]) => `
          <div class="ideology-bar">
            <div class="top"><span>${neg}</span><span style="color:var(--dim)">${k}</span><span>${pos}</span></div>
            <div class="track"><div class="mid"></div></div>
            <input type="range" min="-100" max="100" value="${draft.ideo[k] || 0}" data-ax="${k}" />
          </div>`).join('')}
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn ghost" data-close>Cancelar</button>
      <button class="btn primary" id="party-create">Fundar partido</button>
    </div>
  `, {
    wide: true,
    onMount(root) {
      const ideo = { ...draft.ideo };
      root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
        root.querySelectorAll('[data-color]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        draft.color = b.getAttribute('data-color');
      }));
      root.querySelectorAll('[data-symbol]').forEach((b) => b.addEventListener('click', () => {
        root.querySelectorAll('[data-symbol]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        draft.symbol = b.getAttribute('data-symbol');
      }));
      root.querySelectorAll('[data-ax]').forEach((input) => input.addEventListener('input', () => {
        ideo[input.getAttribute('data-ax')] = Number(input.value);
      }));
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelector('#party-create').addEventListener('click', () => {
        const name = root.querySelector('#party-name').value.trim();
        const sigla = root.querySelector('#party-sigla').value.trim().toUpperCase();
        if (!name || !sigla) { toast('Preencha nome e sigla', 'warn', '⚠️'); return; }
        st.ideology = { ...st.ideology, ...ideo };
        createParty(st, {
          name, sigla, color: draft.color, symbol: draft.symbol,
          slogan: root.querySelector('#party-slogan').value.trim() || 'Por um país novo.',
        });
        st.party.ideology = { ...ideo };
        closeModal();
        sfx('epic');
        toast(`Partido ${sigla} fundado!`, 'good', '🎩');
        app.save();
        app.render();
        onDone && onDone();
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Discurso                                                            */
/* ------------------------------------------------------------------ */

export function showSpeechModal(app) {
  const st = app.state;
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">🎤</div>
      <div><div class="modal-tag">Ação</div><div class="modal-title">Discurso à nação</div></div>
    </div>
    <div class="modal-text">Escolha o tema — e o tom. Um discurso bem calibrado move a opinião; um erro pode custar caro.</div>
    <div class="modal-choices">
      ${SPEECH_TOPICS.map((t) => `
        <button class="choice" data-topic="${t.id}">
          <span class="cico">${t.icon}</span>
          <span style="flex:1"><span class="ct">${esc(t.label)}</span>
          <span class="cd">${Object.entries(t.effect.factions || {}).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(' · ') || 'Efeito geral'}</span></span>
        </button>`).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn ghost" data-close>Cancelar</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelectorAll('[data-topic]').forEach((btn) => btn.addEventListener('click', () => {
        const topic = btn.getAttribute('data-topic');
        giveSpeech(st, topic);
        st.cooldowns.discurso = st.turn;
        closeModal();
        sfx('good');
        toast('Discurso transmitido em rede nacional.', 'info', '🎤');
        app.save();
        app.render();
      }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Golpe                                                               */
/* ------------------------------------------------------------------ */

export function showCoupModal(app, actionId) {
  const st = app.state;
  const type = actionId === 'autogolpe' ? 'autogolpe' : actionId === 'proclamar_ditadura' ? 'proclamar' : 'militar';
  const chance = coupOdds(st, type);
  const titles = {
    autogolpe: ['⚡', 'Autogolpe', 'Você está no poder — mas não no poder de verdade. Feche o Congresso, prenda os líderes da oposição e assuma.'],
    militar: ['🪖', 'Golpe militar', 'Os quartéis estão inquietos. Com a lealdade certa, você pode convencê-los a tomar o palácio em seu nome.'],
    proclamar: ['👑', 'Proclamar ditadura', 'Sem eleições, sem parlamento, sem desculpas. A história será escrita por você — ou contra você.'],
  };
  const [ico, title, text] = titles[type];

  openModal(`
    <div class="modal-head event-modal">
      <div class="modal-ico">${ico}</div>
      <div><div class="modal-tag">Decisão irreversível</div><div class="modal-title">${esc(title)}</div></div>
    </div>
    <div class="modal-text">${esc(text)}</div>

    <div class="card tight" style="margin-bottom:14px">
      <div class="flex between center">
        <span class="small muted">Chance de sucesso</span>
        <span style="font-size:22px;font-weight:800;color:${chance > 60 ? 'var(--good)' : chance > 35 ? 'var(--warn)' : 'var(--danger)'}">${chance.toFixed(0)}%</span>
      </div>
      <div class="bar" style="height:8px;margin-top:8px"><i style="width:${chance}%;background:${chance > 60 ? 'var(--good)' : chance > 35 ? 'var(--warn)' : 'var(--danger)'}"></i></div>
      <div class="small muted mt-14">
        Baseado em: lealdade militar (${Math.round(st.stats.lealdadeMilitar)}), controle das Forças Armadas (${Math.round(st.institutions.militar)}),
        poder (${Math.round(st.stats.poder)}), apoio dos militares (${Math.round(st.factions.militares)}), estabilidade (${Math.round(st.stats.estabilidade)}) e aprovação (${Math.round(st.stats.aprovacao)}).
      </div>
    </div>

    <div class="modal-text" style="color:var(--danger);font-size:12.5px">
      ⚠️ Se falhar: crise política imediata, perda de poder e — no pior cenário — prisão e deposição.
    </div>
    <div class="modal-actions">
      <button class="btn ghost" data-close>Recuar</button>
      <button class="btn danger" id="confirm-coup">Executar o golpe</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelector('#confirm-coup').addEventListener('click', () => {
        const res = resolveCoup(st, type);
        st.cooldowns[actionId] = st.turn;
        closeModal();
        sfx(res.success ? 'epic' : 'bad');
        app.save();
        app.render();
        showCoupResult(app, res);
      });
    },
  });
}

function showCoupResult(app, res) {
  const st = app.state;
  openModal(`
    <div class="modal-head event-modal">
      <div class="modal-ico">${res.success ? '👑' : '🚨'}</div>
      <div>
        <div class="modal-tag">${res.success ? 'Poder absoluto' : 'Fracasso'}</div>
        <div class="modal-title">${res.success ? 'O país é seu' : 'O golpe falhou'}</div>
      </div>
    </div>
    <div class="modal-text">
      ${res.success
        ? 'Tanques nas ruas, congresso dissolvido, imprensa sob controle. Você não precisa mais de eleições — mas agora precisa vigiar quem vigia você.'
        : 'Oficiais leais reagiram antes. Suas redes de apoio foram expostas e o país está em choque.'}
    </div>
    <div class="flex between small"><span class="muted">Chance calculada</span><span class="mono">${res.chance.toFixed(0)}%</span></div>
    <div class="flex between small mt-8"><span class="muted">Sorteio</span><span class="mono">${res.roll.toFixed(0)}</span></div>
    <div class="modal-actions">
      <button class="btn primary" data-close>${st.over ? 'Ver o fim' : 'Continuar'}</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', () => {
        closeModal();
        app.save();
        app.render();
        if (st.over) { app.screen = 'gameover'; app.render(); showGameOver(app); }
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Purgas                                                              */
/* ------------------------------------------------------------------ */

export function showPurgeModal(app) {
  const st = app.state;
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">🗡️</div>
      <div><div class="modal-tag">Poder</div><div class="modal-title">Purgar adversários</div></div>
    </div>
    <div class="modal-text">Escolha o alvo e o método. Quanto mais brutal, maior o medo — e o risco de vazamento.</div>

    <div class="field">
      <label>Alvo</label>
      <select class="input" id="purge-target">
        ${PURGE_TARGETS.map((t) => `<option value="${t.id}">${t.icon} ${esc(t.label)} (risco ×${t.risk})</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label>Método</label>
      <select class="input" id="purge-style">
        ${PURGE_STYLES.map((s) => `<option value="${s.id}">${esc(s.label)} — risco ${(s.risk * 100).toFixed(0)}%</option>`).join('')}
      </select>
    </div>
    <div class="small muted" style="margin-bottom:10px">Seu poder (${Math.round(st.stats.poder)}) reduz o risco de vazamento.</div>

    <div class="modal-actions">
      <button class="btn ghost" data-close>Cancelar</button>
      <button class="btn danger" id="purge-go">Executar</button>
    </div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelector('#purge-go').addEventListener('click', () => {
        const target = root.querySelector('#purge-target').value;
        const style = root.querySelector('#purge-style').value;
        const res = resolvePurge(st, target, style);
        st.cooldowns.purgar = st.turn;
        closeModal();
        sfx(res.success ? 'warn' : 'bad');
        toast(res.success ? 'Purga executada sem vazamentos.' : 'A purga vazou! Crise política.', res.success ? 'warn' : 'bad', '🗡️');
        app.save();
        app.render();
        if (st.over) { app.screen = 'gameover'; app.render(); showGameOver(app); }
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Alvos internacionais                                                */
/* ------------------------------------------------------------------ */

const TARGET_LABEL = {
  espionar_pais: 'Espionar país',
  sabotar: 'Sabotar economia',
  desinformar: 'Desinformação',
  assassinar: 'Eliminar líder',
  golpe_externo: 'Golpe no país',
  comprar_aliado: 'Comprar aliado',
  boicote: 'Boicotar país',
  exportar_revolucao: 'Exportar revolução',
  declarar_guerra: 'Declarar guerra',
};

export function showTargetModal(app, actionId) {
  const st = app.state;
  ensureRelations(st);
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">🌐</div>
      <div><div class="modal-tag">Exterior</div><div class="modal-title">${esc(TARGET_LABEL[actionId] || 'Escolher alvo')}</div></div>
    </div>
    <div class="modal-text">Selecione o país-alvo.</div>
    <div class="modal-choices">
      ${COUNTRIES.map((c) => {
        const rel = st.relations[c.id];
        const rl = relationLabel(rel.relation);
        return `
          <button class="choice" data-target="${c.id}">
            <span class="cico">${c.flag}</span>
            <span style="flex:1">
              <span class="ct">${esc(c.name)}</span>
              <span class="cd">${esc(rl.label)} (${Math.round(rel.relation)}) · poder militar ${c.power} · ${esc(c.trait)}</span>
            </span>
          </button>`;
      }).join('')}
    </div>
    <div class="modal-actions"><button class="btn ghost" data-close>Cancelar</button></div>
  `, {
    wide: true,
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelectorAll('[data-target]').forEach((btn) => btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-target');
        handleTarget(app, actionId, id);
      }));
    },
  });
}

function handleTarget(app, actionId, countryId) {
  const st = app.state;
  const c = countryById(countryId);

  if (actionId === 'declarar_guerra') {
    openModal(`
      <div class="modal-head event-modal">
        <div class="modal-ico">⚔️</div>
        <div><div class="modal-tag">Guerra</div><div class="modal-title">Invadir ${esc(c.name)}?</div></div>
      </div>
      <div class="modal-text">
        Poder militar seu: <b>${Math.round(st.stats.poderMilitar)}</b> · deles: <b>${c.power}</b>.<br />
        Uma guerra custa vidas, dinheiro e reputação. A vitória traz territórios e prestígio.
      </div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>Cancelar</button>
        <button class="btn danger" id="go-war">Declarar guerra</button>
      </div>
    `, {
      onMount(root) {
        root.querySelector('[data-close]').addEventListener('click', closeModal);
        root.querySelector('#go-war').addEventListener('click', () => {
          const res = declareWar(st, countryId);
          closeModal();
          sfx('bad');
          toast(res.ok ? `Guerra contra ${c.name} declarada.` : res.reason, res.ok ? 'bad' : 'warn', '⚔️');
          app.save(); app.render();
        });
      },
    });
    return;
  }

  const res = resolveEspionage(st, actionId, countryId);
  st.cooldowns[actionId] = st.turn;
  closeModal();
  if (!res.ok) { toast(res.reason, 'warn', '⚠️'); return; }
  sfx(res.success ? 'good' : 'bad');
  toast(res.success ? `${TARGET_LABEL[actionId]} em ${c.name}: sucesso.` : `${TARGET_LABEL[actionId]} em ${c.name}: falhou.`, res.success ? 'good' : 'bad', '🕵️');
  if (res.intel) {
    setTimeout(() => toast(`Intel: ${res.intel.join(' · ')}`, 'info', '📄', 6000), 400);
  }
  app.save();
  app.render();
}

/* ------------------------------------------------------------------ */
/* Plebiscito                                                          */
/* ------------------------------------------------------------------ */

export function showPlebisciteModal(app) {
  const st = app.state;
  const questions = [
    { id: 'reeleicao', label: 'Permitir reeleição ilimitada', icon: '🔁', pass: { flags: { mandato_ilimitado: true } }, fail: { stats: { aprovacao: -3 } } },
    { id: 'monarquia', label: 'Restaurar a monarquia', icon: '👑', pass: { set: { regime: 'monarquia', role: 'monarca' }, stats: { legitimidade: 8 } }, fail: { stats: { legitimidade: -4 } } },
    { id: 'constituinte', label: 'Convocar assembleia constituinte', icon: '📜', pass: { flags: { nova_constituicao: true }, stats: { legitimidade: 10, estabilidade: 4 } }, fail: { stats: { estabilidade: -3 } } },
    { id: 'privatizar', label: 'Privatizar as estatais', icon: '🏷️', pass: { treasury: 120, factions: { empresariado: 12 } }, fail: { factions: { trabalhadores: 6 } } },
    { id: 'saida', label: 'Sair dos organismos internacionais', icon: '🚪', pass: { flags: { isolamento: true }, stats: { sancoes: 10, reputacao: -10 } }, fail: { stats: { reputacao: 3 } } },
  ];

  openModal(`
    <div class="modal-head">
      <div class="modal-ico">🗳️</div>
      <div><div class="modal-tag">Democracia direta</div><div class="modal-title">Convocar plebiscito</div></div>
    </div>
    <div class="modal-text">Leve uma decisão ao povo. Se o povo disser não, sua autoridade sai menor do que entrou.</div>
    <div class="modal-choices">
      ${questions.map((q) => `
        <button class="choice" data-q="${q.id}">
          <span class="cico">${q.icon}</span>
          <span style="flex:1"><span class="ct">${esc(q.label)}</span></span>
        </button>`).join('')}
    </div>
    <div class="modal-actions"><button class="btn ghost" data-close>Cancelar</button></div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelectorAll('[data-q]').forEach((btn) => btn.addEventListener('click', () => {
        const q = questions.find((x) => x.id === btn.getAttribute('data-q'));
        // resultado depende de aprovação + alinhamento ideológico
        const yes = clamp(st.stats.aprovacao + (st.stats.legitimidade - 30) * 0.4 + (Math.random() * 30 - 15), 5, 95);
        const passed = yes > 50;
        const eff = passed ? q.pass : q.fail;
        applyEffect(st, {
          ...eff,
          text: `Plebiscito "${q.label}": ${passed ? 'APROVADO' : 'REJEITADO'} com ${yes.toFixed(0)}% dos votos.`,
          tone: passed ? 'good' : 'warn', icon: '🗳️',
        });
        st.cooldowns.plebiscito = st.turn;
        closeModal();
        sfx(passed ? 'good' : 'bad');
        toast(`Plebiscito ${passed ? 'aprovado' : 'rejeitado'}: ${yes.toFixed(0)}% sim`, passed ? 'good' : 'warn', '🗳️');
        app.save(); app.render();
        if (st.over) { app.screen = 'gameover'; app.render(); showGameOver(app); }
      }));
    },
  });
}

/* ------------------------------------------------------------------ */
/* Ajuda                                                               */
/* ------------------------------------------------------------------ */

export function showHelp(app) {
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">📖</div>
      <div><div class="modal-tag">Manual do governante</div><div class="modal-title">Como jogar NationZero</div></div>
    </div>
    <div class="modal-text" style="line-height:1.7">
      Você começa como <b>um cidadão comum</b> em um país fictício. Seu objetivo é… o que você quiser.
      Não existe vitória única: dá para ser um democrata premiado, um ditador temido ou um desastre nacional.
    </div>

    <div class="section-title">O ciclo</div>
    <div class="small muted" style="line-height:1.7;margin-bottom:12px">
      Cada clique em <b>Avançar mês</b> passa um mês. A economia, as ruas, as facções e o mundo reagem.
      Eventos aparecem e pedem decisões. Eleições acontecem a cada 4 anos (48 meses).
    </div>

    <div class="section-title">Recursos</div>
    <div class="small muted" style="line-height:1.8;margin-bottom:12px">
      ⚡ <b>Poder</b> — capital político para golpes, purgas e decretos. Cresce com legitimidade e controle institucional.<br />
      🤝 <b>Influência</b> — sua capacidade de articular. Gasta em leis, cargos e diplomacia.<br />
      💰 <b>Tesouro</b> — dinheiro do Estado em bilhões. Ajuste impostos e gastos na aba Economia.<br />
      👍 <b>Aprovação</b> — o povo. 👥 <b>Bases</b> — cada facção tem sua agenda. Agradar todos é impossível.
    </div>

    <div class="section-title">Caminhos de carreira</div>
    <div class="small muted" style="line-height:1.8;margin-bottom:12px">
      Cidadão → Ativista → fundar partido → eleger-se deputado → ministro → vice → presidente → e, se quiser, ditador ou monarca.<br />
      Fora da política formal: golpe militar, autogolpe, revolução, teocracia, junta… Você escolhe.
    </div>

    <div class="section-title">Dicas</div>
    <div class="small muted" style="line-height:1.8;margin-bottom:12px">
      • Leis radicais exigem cargos altos e regimes compatíveis.<br />
      • O país reage: repressão gera medo e estabilidade no curto prazo, revolta no longo.<br />
      • O mundo observa: sanções, guerras e espionagem mudam sua economia.<br />
      • Use a aba <b>Crônica</b> para revisitar sua história e <b>Legado</b> para ver conquistas.
    </div>

    <div class="modal-actions"><button class="btn primary" data-close>Entendi</button></div>
  `, { wide: true, onMount: (root) => root.querySelector('[data-close]').addEventListener('click', closeModal) });
}

/* ------------------------------------------------------------------ */
/* Ajustes                                                             */
/* ------------------------------------------------------------------ */

export function showSettings(app) {
  const soundOff = localStorage.getItem('nz.sound') === 'off';
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">⚙️</div>
      <div><div class="modal-tag">Sistema</div><div class="modal-title">Ajustes</div></div>
    </div>

    <div class="row" style="margin-bottom:8px">
      <span class="ico">${soundOff ? '🔇' : '🔊'}</span>
      <div class="body"><div class="name">Som</div><div class="desc">Efeitos sonoros de interface</div></div>
      <div class="right"><button class="btn small" data-sound="${soundOff ? 'on' : 'off'}">${soundOff ? 'Ligar' : 'Desligar'}</button></div>
    </div>

    <div class="row" style="margin-bottom:8px">
      <span class="ico">💾</span>
      <div class="body"><div class="name">Exportar save</div><div class="desc">Baixa um arquivo .json do seu país</div></div>
      <div class="right"><button class="btn small" data-export ${app.state ? '' : 'disabled'}>Exportar</button></div>
    </div>

    <div class="row" style="margin-bottom:8px">
      <span class="ico">📥</span>
      <div class="body"><div class="name">Importar save</div><div class="desc">Carrega um arquivo .json</div></div>
      <div class="right"><button class="btn small" data-import>Importar</button></div>
    </div>
    <input type="file" id="import-file" accept="application/json,.json" class="hidden" />

    ${app.state ? `
    <div class="row" style="margin-bottom:8px">
      <span class="ico">🔄</span>
      <div class="body"><div class="name">Recomeçar</div><div class="desc">Abandona o país atual e funda outro</div></div>
      <div class="right"><button class="btn small danger" data-restart>Recomeçar</button></div>
    </div>` : ''}

    <div class="modal-actions"><button class="btn primary" data-close>Fechar</button></div>
  `, {
    onMount(root) {
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      const soundBtn = root.querySelector('[data-sound]');
      soundBtn.addEventListener('click', () => {
        const next = soundBtn.getAttribute('data-sound') === 'on' ? 'on' : 'off';
        localStorage.setItem('nz.sound', next);
        soundBtn.setAttribute('data-sound', next === 'on' ? 'off' : 'on');
        soundBtn.textContent = next === 'on' ? 'Desligar' : 'Ligar';
        sfx('click');
      });
      root.querySelector('[data-export]')?.addEventListener('click', () => {
        if (!app.state) return;
        download(`nationzero-${app.state.meta.nationName.replace(/\s+/g, '-').toLowerCase()}.json`, exportState(app.state));
        toast('Save exportado', 'good', '💾');
      });
      root.querySelector('[data-import]')?.addEventListener('click', () => {
        root.querySelector('#import-file').click();
      });
      root.querySelector('#import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const text = await readFile(file);
          const st = importState(text);
          app.state = st;
          app.screen = st.over ? 'gameover' : 'game';
          app.save();
          closeModal();
          app.render();
          toast('Save importado', 'good', '📥');
        } catch (err) {
          toast('Arquivo inválido', 'bad', '⚠️');
        }
      });
      root.querySelector('[data-restart]')?.addEventListener('click', () => {
        if (!confirm('Recomeçar do zero? O país atual será perdido.')) return;
        clearSave();
        app.state = null;
        app.screen = 'setup';
        closeModal();
        app.render();
      });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Decreto personalizado                                               */
/* ------------------------------------------------------------------ */

export const DECREE_PALETTE = [
  { id: 'social', label: 'Pacote social emergencial', icon: '🤲', cost: 8, effect: { treasury: -40, stats: { aprovacao: 7, agitacao: -4, saude: 2 }, factions: { trabalhadores: 8, minorias: 6, financeiro: -4 } } },
  { id: 'austeridade', label: 'Austeridade brutal', icon: '✂️', cost: 8, effect: { treasury: 60, stats: { aprovacao: -7, economia: -1, desemprego: 0.7 }, factions: { financeiro: 12, trabalhadores: -10 } } },
  { id: 'militar', label: 'Militarização do Estado', icon: '🪖', cost: 10, effect: { stats: { repressao: 8, liberdades: -8, lealdadeMilitar: 6, medo: 6 }, factions: { militares: 12, juventude: -8, imprensa: -6 } } },
  { id: 'abertura', label: 'Abertura democrática', icon: '🕊️', cost: 10, effect: { stats: { liberdades: 9, repressao: -6, agitacao: -5, reputacao: 5 }, factions: { imprensa: 10, juventude: 8, militares: -8 } } },
  { id: 'propaganda', label: 'Ofensiva de propaganda', icon: '📺', cost: 8, effect: { stats: { legitimidade: 6, aprovacao: 2, liberdades: -3 }, factions: { imprensa: -6, nacionalistas: 6 } } },
  { id: 'educacao', label: 'Choque educacional', icon: '🎓', cost: 8, effect: { treasury: -30, stats: { educacao: 5, tecnologia: 2 }, factions: { intelectuais: 8, juventude: 6 } } },
  { id: 'censura', label: 'Censura total', icon: '🔇', cost: 12, effect: { stats: { liberdades: -10, medo: 8, repressao: 6 }, control: { midia: 10 }, factions: { imprensa: -14, intelectuais: -8 } } },
  { id: 'impostos_up', label: 'Taxar os mais ricos', icon: '💎', cost: 8, effect: { treasury: 50, stats: { aprovacao: 3 }, factions: { financeiro: -12, trabalhadores: 8 } } },
  { id: 'impostos_down', label: 'Cortar impostos', icon: '📉', cost: 8, effect: { treasury: -50, stats: { economia: 1 }, factions: { empresariado: 10, financeiro: 8, trabalhadores: -4 } } },
  { id: 'anistia', label: 'Anistia ampla', icon: '🕯️', cost: 10, effect: { stats: { agitacao: -8, medo: -6, liberdades: 4, corrupcao: 3 }, factions: { imprensa: 4, militares: 2 } } },
  { id: 'sitio', label: 'Estado de sítio', icon: '🚨', cost: 14, effect: { stats: { estabilidade: 8, liberdades: -12, repressao: 8, medo: 8 }, factions: { militares: 6, imprensa: -10 } } },
  { id: 'nacionalismo', label: 'Campanha patriótica', icon: '🚩', cost: 8, effect: { stats: { estabilidade: 3, reputacao: -3 }, factions: { nacionalistas: 12, militares: 4, minorias: -4 } } },
];

export function showDecreeModal(app) {
  const st = app.state;
  openModal(`
    <div class="modal-head">
      <div class="modal-ico">✍️</div>
      <div><div class="modal-tag">Poder absoluto</div><div class="modal-title">Escrever um decreto</div></div>
    </div>
    <div class="modal-text">
      Nenhuma lei prevista — você inventa. Dê um nome ao decreto e escolha até <b>3 medidas</b>.
      Libere as medidas com ⚡ Poder e 🤝 Influência.
    </div>
    <div class="field">
      <label>Nome do decreto</label>
      <input class="input" id="decree-name" maxlength="48" placeholder="Decreto de Reorganização Nacional" />
    </div>
    <div class="field">
      <label>Justificativa (opcional)</label>
      <textarea class="input" id="decree-desc" maxlength="180" placeholder="Considerando a necessidade imperiosa de…"></textarea>
    </div>
    <div class="field">
      <label>Medidas</label>
      <div class="grid cols-2" id="decree-list" style="gap:8px">
        ${DECREE_PALETTE.map((d) => `
          <button class="law" data-decree="${d.id}" style="text-align:left;padding:10px 12px">
            <div class="law-top">
              <span class="law-ico" style="font-size:16px">${d.icon}</span>
              <div><div class="law-name" style="font-size:12.5px">${esc(d.label)}</div>
              <div class="law-desc" style="font-size:10.5px">⚡ ${d.cost}</div></div>
            </div>
          </button>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" data-close>Cancelar</button>
      <button class="btn primary" id="decree-go">Publicar decreto</button>
    </div>
  `, {
    wide: true,
    onMount(root) {
      const chosen = new Set();
      root.querySelector('[data-close]').addEventListener('click', closeModal);
      root.querySelectorAll('[data-decree]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-decree');
          if (chosen.has(id)) { chosen.delete(id); btn.classList.remove('active'); }
          else {
            if (chosen.size >= 3) { toast('Máximo de 3 medidas por decreto', 'warn', '⚠️'); return; }
            chosen.add(id); btn.classList.add('active');
          }
        });
      });
      root.querySelector('#decree-go').addEventListener('click', () => {
        if (!chosen.size) { toast('Escolha ao menos uma medida', 'warn', '⚠️'); return; }
        const picks = [...chosen].map((id) => DECREE_PALETTE.find((d) => d.id === id));
        const totalCost = picks.reduce((a, p) => a + p.cost, 0);
        if (st.stats.poder < totalCost) { toast(`Poder insuficiente (precisa ${totalCost})`, 'warn', '⚠️'); return; }
        st.stats.poder = clamp(st.stats.poder - totalCost, 0, 100);
        const name = root.querySelector('#decree-name').value.trim() || 'Decreto Executivo';
        const desc = root.querySelector('#decree-desc').value.trim();

        const combined = { stats: {}, factions: {}, control: {}, treasury: 0 };
        for (const p of picks) {
          const e = p.effect;
          if (e.treasury) combined.treasury += e.treasury;
          for (const [k, v] of Object.entries(e.stats || {})) combined.stats[k] = (combined.stats[k] || 0) + v;
          for (const [k, v] of Object.entries(e.factions || {})) combined.factions[k] = (combined.factions[k] || 0) + v;
          for (const [k, v] of Object.entries(e.control || {})) combined.control[k] = (combined.control[k] || 0) + v;
        }
        applyEffect(st, {
          stats: combined.stats, factions: combined.factions, control: combined.control, treasury: combined.treasury,
          text: `${name}${desc ? ` — "${desc}"` : ''}. Medidas: ${picks.map((p) => p.label).join(', ')}.`,
          tone: 'warn', icon: '✍️',
        });
        st.custom.push({ name, desc, picks: picks.map((p) => p.id), turn: st.turn, date: dateLabel(st) });
        st.legacy.lawsPassed = (st.legacy.lawsPassed || 0) + 1;
        st.cooldowns.decreto = st.turn;
        closeModal();
        sfx('epic');
        toast(`Decreto publicado: ${name}`, 'warn', '✍️');
        app.save();
        app.render();
      });
    },
  });
}
