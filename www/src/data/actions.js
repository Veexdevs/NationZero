/*
 * Ações de NationZero — o que você pode fazer.
 *
 * cost: { poder, influencia, tesouro }
 * require: { role: [min role], regime: [...], stats: { x: min }, statsMax: { x: max }, party: true, politics: true }
 * cooldown: turnos
 * dialog: abre UI especial ('coup','election','war','target','custom')
 */

export const ACTION_CATEGORIES = {
  politica:  { label: 'Política',    icon: '🏛️', desc: 'Partido, povo, parlamento.' },
  poder:     { label: 'Poder',       icon: '👑', desc: 'Como você se mantém no topo.' },
  espionagem:{ label: 'Espionagem',  icon: '🕵️', desc: 'Informação é poder.' },
  militar:   { label: 'Militar',     icon: '🎖️', desc: 'Força, ou a ameaça dela.' },
  economia:  { label: 'Economia',    icon: '💰', desc: 'Intervenções de emergência.' },
  mundo:     { label: 'Mundo',       icon: '🌐', desc: 'Diplomacia e sabotagem.' },
};

export const ACTIONS = [
  /* ============================ POLÍTICA ============================ */
  {
    id: 'organizar_movimento', cat: 'politica', name: 'Organizar um movimento', icon: '✊', tier: 1,
    desc: 'Reúne gente, cria uma pauta e vira uma liderança nas ruas.',
    cost: { tesouro: 5, influencia: 3 }, cooldown: 3, repeatable: true, require: { roleExact: ['cidadao'] },
    effect: {
      stats: { influencia: 8, aprovacao: 2, agitacao: 2 }, factions: { juventude: 6, trabalhadores: 4 },
      set: { role: 'ativista' },
      text: 'Você organizou um movimento de base. Agora tem gente te ouvindo.',
      tone: 'good', icon: '✊',
    },
  },
  {
    id: 'negociar_ministério', cat: 'politica', name: 'Negociar um ministério', icon: '🗂️', tier: 1,
    desc: 'Usa sua influência para ganhar uma pasta no governo.',
    cost: { influencia: 28 }, cooldown: 12, repeatable: true,
    require: { role: ['lider_partido', 'deputado'], stats: { influencia: 30 } },
    effect: {
      stats: { poder: 12, legitimidade: 6, influencia: -4 }, factions: { imprensa: 2 },
      set: { role: 'ministro' }, text: 'Você foi nomeado ministro de Estado.',
      tone: 'good', icon: '🗂️',
    },
  },
  {
    id: 'articular_chapa', cat: 'politica', name: 'Articular a vice-presidência', icon: '🥈', tier: 2,
    desc: 'Entra na chapa presidencial como vice. A um passo do topo.',
    cost: { influencia: 35, tesouro: 20 }, cooldown: 16, repeatable: true,
    require: { role: ['ministro', 'deputado'], stats: { influencia: 45 } },
    effect: {
      stats: { poder: 15, legitimidade: 8 }, set: { role: 'vice' },
      text: 'Você é o novo vice-presidente. O palácio tem uma porta aberta.',
      tone: 'good', icon: '🥈',
    },
  },
  {
    id: 'fundar_partido', cat: 'politica', name: 'Fundar partido', icon: '🎩', tier: 1,
    desc: 'Escolha nome, sigla, cor, ideologia e símbolo. Todo império começa com uma placa.',
    dialog: 'party_create', require: { noParty: true, role: ['cidadao'] },
    effect: {},
  },
  {
    id: 'discurso', cat: 'politica', name: 'Discurso à nação', icon: '🎤', tier: 1,
    desc: 'Fale direto para o país e mexa com os ânimos.',
    dialog: 'speech', cooldown: 2, repeatable: true,
    effect: {},
  },
  {
    id: 'comicio', cat: 'politica', name: 'Comício de massa', icon: '📣', tier: 1,
    desc: 'Levar o povo à praça. Custa caro, rende aprovação e militância.',
    cost: { tesouro: 8, influencia: 4 }, cooldown: 2, repeatable: true, require: { party: true },
    effect: {
      stats: { aprovacao: 3, agitacao: 1 }, factions: { trabalhadores: 3, juventude: 4, nacionalistas: 2 },
      ideology: {},
      text: 'Comício gigante tomou as ruas da capital.',
    },
  },
  {
    id: 'campanha_porta', cat: 'politica', name: 'Campanha porta a porta', icon: '🚪', tier: 1,
    desc: 'Trabalho de base, bairro por bairro.',
    cost: { tesouro: 4 }, cooldown: 1, repeatable: true, require: { party: true },
    effect: { stats: { aprovacao: 1.5, influencia: 1 }, factions: { camponeses: 2, trabalhadores: 1 }, text: 'Militantes bateram em 40 mil portas.' },
  },
  {
    id: 'compra_votos', cat: 'politica', name: 'Comprar votos no parlamento', icon: '🤝', tier: 2,
    desc: 'Emendas, cargos e malas de dinheiro. A velha política.',
    cost: { tesouro: 25, influencia: 6 }, cooldown: 3, repeatable: true, require: { party: true },
    effect: { stats: { corrupcao: 3, aprovacao: -1 }, flags: { votos_comprados: true }, text: 'Bancada comprada para a próxima votação.' },
  },
  {
    id: 'chantagem', cat: 'politica', name: 'Chantagear opositores', icon: '🗂️', tier: 2,
    desc: 'Dossiês sujos compram silêncio.',
    cost: { poder: 6, influencia: 5 }, cooldown: 3, repeatable: true,
    effect: { stats: { medo: 5, liberdades: -3, corrupcao: 2 }, factions: { imprensa: -5 }, text: 'Oposicionistas-chave mudaram de posição de repente.' },
  },
  {
    id: 'mobilizar_ruas', cat: 'politica', name: 'Mobilizar as ruas', icon: '✊', tier: 1,
    desc: 'Coloca sua base na rua para pressionar o sistema.',
    cost: { influencia: 8 }, cooldown: 2, repeatable: true, require: { party: true },
    effect: { stats: { agitacao: 5, aprovacao: 2, estabilidade: -2 }, factions: { trabalhadores: 5, juventude: 5 }, text: 'Manifestação gigante pressiona o governo.' },
  },
  {
    id: 'acalmar_ruas', cat: 'politica', name: 'Acalmar o país', icon: '🕯️', tier: 1,
    desc: 'Discurso de conciliação, mesas de negociação, gestos simbólicos.',
    cost: { influencia: 6 }, cooldown: 2, repeatable: true,
    effect: { stats: { agitacao: -8, estabilidade: 3 }, text: 'Tensão reduzida com gestos de conciliação.' },
  },
  {
    id: 'plebiscito', cat: 'politica', name: 'Convocar plebiscito', icon: '🗳️', tier: 2,
    desc: 'Leva uma decisão ao povo. Pode legitimar — ou enterrar — seu projeto.',
    cost: { tesouro: 20, influencia: 10 }, cooldown: 6, dialog: 'plebiscite',
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {},
  },
  {
    id: 'fechar_congresso', cat: 'politica', name: 'Fechar o parlamento', icon: '🔒', tier: 3,
    desc: 'Decreta o fechamento do Congresso e governa por decreto.',
    cost: { poder: 25, tesouro: 10 }, cooldown: 12,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { liberdades: -15, repressao: 12, medo: 12, estabilidade: -6, agitacao: 8, reputacao: -12, legitimidade: -8 },
      control: { eleitoral: 18 }, set: { regime: 'autoritarismo' },
      factions: { imprensa: -14, militares: 6, juventude: -10 },
      flags: { congresso_fechado: true },
      text: 'Congresso fechado por decreto. Governo legislará sozinho.',
    },
  },
  {
    id: 'dissolver_parlamento', cat: 'politica', name: 'Dissolver o parlamento', icon: '💥', tier: 3,
    desc: 'Eleições antecipadas. Alto risco, alta recompensa.',
    cost: { poder: 20, tesouro: 15 }, cooldown: 12, dialog: 'snap_election',
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {},
  },
  {
    id: 'reeleicao_decreto', cat: 'politica', name: 'Adiar eleições', icon: '⏳', tier: 3,
    desc: 'Uma "instabilidade momentânea" justifica manter o mandato.',
    cost: { poder: 22, influencia: 15 }, cooldown: 10,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { liberdades: -10, legitimidade: -10, agitacao: 8, medo: 6, reputacao: -8 },
      factions: { imprensa: -12, juventude: -8 }, flags: { eleicoes_adiadas: true },
      text: 'Eleições adiadas "até que a situação se normalize".',
    },
  },

  /* ============================ PODER ============================ */
  {
    id: 'autogolpe', cat: 'poder', name: 'Autogolpe', icon: '⚡', tier: 3,
    desc: 'Você já está no poder — agora toma o poder de verdade.',
    cost: { poder: 30, lealdadeMilitarMin: 55 }, cooldown: 24, dialog: 'coup',
    require: { role: ['presidente', 'vice'], regime: ['democracia', 'semidemocracia'] },
    effect: {},
  },
  {
    id: 'golpe_militar', cat: 'poder', name: 'Golpe militar', icon: '🪖', tier: 3,
    desc: 'Convence os quartéis a tomar o palácio. Você pode sair ditador — ou preso.',
    cost: { poder: 15, influencia: 20 }, cooldown: 24, dialog: 'coup',
    require: { role: ['cidadao', 'ativista', 'lider_partido', 'deputado', 'ministro', 'vice', 'presidente'] },
    effect: {},
  },
  {
    id: 'proclamar_ditadura', cat: 'poder', name: 'Proclamar ditadura', icon: '👑', tier: 3,
    desc: 'Assume poderes absolutos sem eleição. A comunidade internacional vai reclamar.',
    cost: { poder: 35 }, cooldown: 30, dialog: 'coup',
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {},
  },
  {
    id: 'purgar', cat: 'poder', name: 'Purgar adversários', icon: '🚪', tier: 3,
    desc: 'Demite, prende ou "desaparece" com quem ameaça você.',
    cost: { poder: 12, influencia: 8 }, cooldown: 4, repeatable: true, dialog: 'purge',
    require: { role: ['ministro', 'vice', 'presidente', 'ditador', 'monarca'] },
    effect: {},
  },
  {
    id: 'prender_oposicao', cat: 'poder', name: 'Prisões políticas em massa', icon: '⛓️', tier: 3,
    desc: 'Enche presídios com líderes oposicionistas, jornalistas e sindicalistas.',
    cost: { poder: 18, tesouro: 10 }, cooldown: 6, repeatable: true,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { repressao: 12, medo: 10, liberdades: -12, agitacao: 6, aprovacao: -3, reputacao: -8 },
      control: { policia: 6, judiciario: 4 },
      factions: { imprensa: -14, juventude: -10, trabalhadores: -8, militares: 6, policia: 8 },
      legacy: { purges: 1 },
      text: 'Ondas de prisões políticas em todo o país.',
    },
  },
  {
    id: 'censurar_midia', cat: 'poder', name: 'Intervir na imprensa', icon: '📺', tier: 2,
    desc: 'Nomeia interventores em TVs, rádios e portais.',
    cost: { poder: 12, tesouro: 15 }, cooldown: 4, repeatable: true,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { liberdades: -8, medo: 6, aprovacao: 2 }, control: { midia: 12 },
      factions: { imprensa: -16 }, text: 'Grupos de mídia sob intervenção federal.',
    },
  },
  {
    id: 'controlar_judiciario', cat: 'poder', name: 'Subordinar o Judiciário', icon: '⚖️', tier: 2,
    desc: 'Aposenta juízes incômodos e nomeia aliados.',
    cost: { poder: 14, influencia: 10 }, cooldown: 5, repeatable: true,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { liberdades: -6, legitimidade: -4 }, control: { judiciario: 10 },
      factions: { imprensa: -8, intelectuais: -8 }, text: 'Tribunais reformados com nomes leais.',
    },
  },
  {
    id: 'controlar_policia', cat: 'poder', name: 'Reformar a polícia', icon: '🚔', tier: 2,
    desc: 'Troca comandos por gente de confiança e amplia orçamento.',
    cost: { poder: 8, tesouro: 20 }, cooldown: 4, repeatable: true,
    effect: {
      stats: { repressao: 5, criminalidade: -3 }, control: { policia: 10 },
      factions: { policia: 12, minorias: -6 }, text: 'Cúpula das polícias substituída.',
    },
  },
  {
    id: 'comprar_militares', cat: 'poder', name: 'Aumentar soldo militar', icon: '🎖️', tier: 2,
    desc: 'Reajustes e equipamentos compram lealdade.',
    cost: { tesouro: 40 }, cooldown: 3, repeatable: true,
    effect: { stats: { lealdadeMilitar: 8, poderMilitar: 2 }, factions: { militares: 12 }, text: 'Soldo das Forças Armadas reajustado em 40%.' },
  },
  {
    id: 'culto', cat: 'poder', name: 'Promover culto à personalidade', icon: '🖼️', tier: 3,
    desc: 'Estátuas, canções, escolas com seu nome.',
    cost: { tesouro: 30, poder: 8 }, cooldown: 5, repeatable: true,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: { stats: { legitimidade: 6, medo: 3, liberdades: -4 }, factions: { intelectuais: -6 }, flags: { culto: true }, text: 'Seu nome virou sinônimo de pátria.' },
  },
  {
    id: 'referendo_continuidade', cat: 'poder', name: 'Referendo de continuidade', icon: '✅', tier: 3,
    desc: 'Um pleito sob medida para confirmar você no poder.',
    cost: { poder: 16, tesouro: 35 }, cooldown: 12,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      stats: { legitimidade: 6, liberdades: -3 }, control: { eleitoral: 5 },
      text: 'Referendo oficializa sua continuidade no cargo.',
    },
  },
  {
    id: 'autoanistia', cat: 'poder', name: 'Autoanistia', icon: '🕯️', tier: 3,
    desc: 'Perdoa seus próprios crimes antes que alguém pergunte.',
    cost: { poder: 12, influencia: 12 }, cooldown: 20,
    effect: { stats: { corrupcao: 3, legitimidade: -4 }, flags: { anistiado: true }, factions: { imprensa: -8 }, text: 'Lei de autoanistia sancionada.' },
  },
  {
    id: 'fugir', cat: 'poder', name: 'Preparar exílio', icon: '✈️', tier: 3,
    desc: 'Transfere dinheiro e documento para o exterior. Rede de segurança.',
    cost: { tesouro: 30 }, cooldown: 999,
    effect: { stats: { corrupcao: 2 }, flags: { exilio_pronto: true }, text: 'Conta na Suíça e passaporte pronto. Só por precaução.' },
  },
  {
    id: 'renunciar', cat: 'poder', name: 'Renunciar', icon: '🚪', tier: 3,
    desc: 'Entrega o cargo. A história julga.',
    dialog: 'resign', cooldown: 999,
    require: { role: ['presidente', 'ditador', 'monarca', 'vice', 'ministro'] },
    effect: {},
  },

  /* ============================ ESPIONAGEM ============================ */
  {
    id: 'espionar_pais', cat: 'espionagem', name: 'Espionar país', icon: '🕵️', tier: 1,
    desc: 'Descobre planos, vulnerabilidades e segredos de outra nação.',
    cost: { tesouro: 12, influencia: 4 }, cooldown: 2, repeatable: true, dialog: 'target',
    effect: {},
  },
  {
    id: 'sabotar', cat: 'espionagem', name: 'Sabotar economia rival', icon: '💣', tier: 2,
    desc: 'Ataques cibernéticos e desestabilização cambial.',
    cost: { tesouro: 25, poder: 5 }, cooldown: 4, repeatable: true, dialog: 'target',
    effect: {},
  },
  {
    id: 'desinformar', cat: 'espionagem', name: 'Operação de desinformação', icon: '📡', tier: 2,
    desc: 'Fábricas de trolls e notícias falsas contra alvos escolhidos.',
    cost: { tesouro: 18 }, cooldown: 3, repeatable: true, dialog: 'target',
    effect: {},
  },
  {
    id: 'assassinar', cat: 'espionagem', name: 'Eliminar líder estrangeiro', icon: '🎯', tier: 3,
    desc: 'Ordem executada por "agentes não identificados".',
    cost: { tesouro: 60, poder: 14 }, cooldown: 12, dialog: 'target',
    effect: {},
  },
  {
    id: 'golpe_externo', cat: 'espionagem', name: 'Golpe no país vizinho', icon: '🌍', tier: 3,
    desc: 'Financia e arma opositores para trocar o governo de lá.',
    cost: { tesouro: 90, poder: 20 }, cooldown: 18, dialog: 'target',
    effect: {},
  },
  {
    id: 'dossie', cat: 'espionagem', name: 'Montar dossiê interno', icon: '🗃️', tier: 2,
    desc: 'Coleta material comprometedor sobre a oposição.',
    cost: { tesouro: 10, poder: 4 }, cooldown: 2, repeatable: true,
    effect: { stats: { medo: 4 }, flags: { dossie: true }, text: 'Dossiês prontos na gaveta.' },
  },

  /* ============================ MILITAR ============================ */
  {
    id: 'recrutar', cat: 'militar', name: 'Recrutamento ampliado', icon: '🪖', tier: 1,
    desc: 'Mais soldados, mais custo.',
    cost: { tesouro: 25 }, cooldown: 2, repeatable: true,
    effect: { stats: { poderMilitar: 4, lealdadeMilitar: -1 }, factions: { militares: 4 }, text: 'Efetivo militar ampliado.' },
  },
  {
    id: 'modernizar', cat: 'militar', name: 'Modernizar equipamento', icon: '🛠️', tier: 2,
    desc: 'Compra caças, drones e sistemas de defesa.',
    cost: { tesouro: 70 }, cooldown: 3, repeatable: true,
    effect: { stats: { poderMilitar: 7, tecnologia: 4, economia: 1 }, factions: { militares: 8, nacionalistas: 6 }, text: 'Nova frota de caças e drones entregue.' },
  },
  {
    id: 'enriquecer_uranio', cat: 'militar', name: 'Enriquecer urânio', icon: '☢️', tier: 3,
    desc: 'Passo decisivo rumo à bomba.',
    cost: { tesouro: 120, poder: 8 }, cooldown: 4, repeatable: true,
    require: { stats: { tecnologia: 45 } },
    effect: { stats: { arsenalNuclear: 1, sancoes: 6, reputacao: -6 }, flags: { programa_nuclear: true }, text: 'Centrífugas girando em segredo.' },
  },
  {
    id: 'teste_nuclear', cat: 'militar', name: 'Teste nuclear', icon: '💥', tier: 3,
    desc: 'Detonar uma ogiva no deserto e avisar o mundo.',
    cost: { poder: 16, tesouro: 40 }, cooldown: 6,
    require: { stats: { arsenalNuclear: 1 } },
    effect: {
      stats: { sancoes: 25, reputacao: -25, medo: 15, poder: 8, estabilidade: 4, meioAmbiente: -4 },
      factions: { militares: 15, nacionalistas: 18, imprensa: -10 },
      flags: { nuclear_testado: true }, legacy: { nukes: 1 },
      text: 'Detonação nuclear confirmada. O mundo entra em alerta.',
    },
  },
  {
    id: 'reprimir_protesto', cat: 'militar', name: 'Reprimir protesto', icon: '🛡️', tier: 2,
    desc: 'Tropas e gás lacrimogêneo contra manifestações.',
    cost: { poder: 8 }, cooldown: 2, repeatable: true,
    effect: {
      stats: { agitacao: -6, repressao: 8, medo: 6, aprovacao: -3, liberdades: -4 },
      factions: { militares: 2, juventude: -8, imprensa: -6 }, text: 'Protestos dispersados com força.',
    },
  },
  {
    id: 'cercar_capital', cat: 'militar', name: 'Cercar a capital', icon: '🚧', tier: 3,
    desc: 'Blindados nas ruas. Aviso claro a quem pensar em resistir.',
    cost: { poder: 12, tesouro: 10 }, cooldown: 6,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: { stats: { medo: 12, estabilidade: 4, liberdades: -6, agitacao: 4 }, factions: { militares: 6, imprensa: -8 }, text: 'Tanques posicionados no centro da capital.' },
  },
  {
    id: 'declarar_guerra', cat: 'militar', name: 'Declarar guerra', icon: '⚔️', tier: 3,
    desc: 'Invadir outro país. A conta vem depois.',
    cost: { poder: 20 }, cooldown: 12, dialog: 'target',
    require: { role: ['presidente', 'ditador', 'monarca'], stats: { poderMilitar: 30 } },
    effect: {},
  },
  {
    id: 'armar_milicia', cat: 'militar', name: 'Armar milícias leais', icon: '🔫', tier: 3,
    desc: 'Grupos paramilitares de confiança para o que o exército hesitar.',
    cost: { tesouro: 35, poder: 6 }, cooldown: 4, repeatable: true,
    effect: { stats: { medo: 6, repressao: 5, criminalidade: 3 }, factions: { militares: -4, nacionalistas: 8 }, text: 'Milícias armadas e treinadas.' },
  },

  /* ============================ ECONOMIA ============================ */
  {
    id: 'emitir_titulos', cat: 'economia', name: 'Emitir títulos públicos', icon: '📃', tier: 1,
    desc: 'Antecipa dinheiro agora, paga com juros depois.',
    cost: { influencia: 5 }, cooldown: 2, repeatable: true,
    effect: { treasury: 60, stats: { divida: 6, inflacao: 0.2, economia: 0.3 }, text: 'Emissão de títulos absorvida pelo mercado.' },
  },
  {
    id: 'confiscar', cat: 'economia', name: 'Confiscar bens', icon: '🏚️', tier: 2,
    desc: 'Toma patrimônio de "corruptos" e desafetos.',
    cost: { poder: 10 }, cooldown: 3, repeatable: true,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: { treasury: 50, stats: { corrupcao: 4, medo: 6, estabilidade: -3 }, factions: { empresariado: -10, financeiro: -8 }, text: 'Bens confiscados e leiloados.' },
  },
  {
    id: 'fundo_soberano', cat: 'economia', name: 'Fundo soberano', icon: '🏦', tier: 2,
    desc: 'Reserva estratégica para crises.',
    cost: { tesouro: 80 }, cooldown: 6,
    effect: { stats: { estabilidade: 4, economia: 2, divida: -3 }, flags: { fundo_soberano: true }, factions: { financeiro: 8 }, text: 'Fundo soberano criado.' },
  },
  {
    id: 'ajuste_fiscal', cat: 'economia', name: 'Pacote de ajuste fiscal', icon: '✂️', tier: 2,
    desc: 'Corta gastos e aumenta impostos. Dói — mas arruma a conta.',
    cost: { influencia: 8 }, cooldown: 6,
    effect: { stats: { tesouro: 70, economia: -1, aprovacao: -6, desemprego: 1 }, factions: { financeiro: 12, trabalhadores: -10 }, text: 'Ajuste fiscal anunciado em rede nacional.' },
  },
  {
    id: 'estimulo', cat: 'economia', name: 'Pacote de estímulo', icon: '🎁', tier: 2,
    desc: 'Gasta para fazer a economia girar.',
    cost: { tesouro: 50 }, cooldown: 4,
    effect: { stats: { economia: 3, crescimento: 0.8, aprovacao: 4, inflacao: 0.5 }, factions: { empresariado: 6, trabalhadores: 6 }, text: 'Estímulo econômico injetado.' },
  },
  {
    id: 'estatizar_bancos', cat: 'economia', name: 'Estatizar bancos', icon: '🏛️', tier: 3,
    desc: 'Assume o controle do sistema financeiro.',
    cost: { poder: 14, tesouro: 60 }, cooldown: 12,
    require: { role: ['presidente', 'ditador', 'monarca'] },
    effect: {
      treasury: 90, stats: { economia: -1, inflacao: 1, reputacao: -6 }, factions: { financeiro: -25, trabalhadores: 10 },
      text: 'Bancos privados sob controle estatal.',
    },
  },
  {
    id: 'default', cat: 'economia', name: 'Suspender pagamento da dívida', icon: '🚫', tier: 3,
    desc: 'Dá calote. Alivia o caixa e fecha o crédito internacional.',
    cost: { poder: 10 }, cooldown: 24,
    effect: { stats: { divida: -35, sancoes: 20, reputacao: -18, economia: -4, inflacao: 1.5 }, factions: { financeiro: -20 }, flags: { default: true }, text: 'Moratória declarada. Credores em pânico.' },
  },

  /* ============================ MUNDO ============================ */
  {
    id: 'discurso_onu', cat: 'mundo', name: 'Discurso na ONU', icon: '🌐', tier: 1,
    desc: 'Palco global para vender sua imagem.',
    cost: { influencia: 6 }, cooldown: 3, repeatable: true,
    effect: { stats: { reputacao: 5, aprovacao: 1 }, factions: { nacionalistas: 3 }, text: 'Discurso na assembleia geral aplaudido.' },
  },
  {
    id: 'comprar_aliado', cat: 'mundo', name: 'Comprar aliado', icon: '💵', tier: 2,
    desc: 'Empréstimo "generoso" em troca de voto e amizade.',
    cost: { tesouro: 60 }, cooldown: 4, repeatable: true, dialog: 'target',
    effect: {},
  },
  {
    id: 'boicote', cat: 'mundo', name: 'Boicotar país', icon: '🚫', tier: 2,
    desc: 'Fecha o mercado para um adversário.',
    cost: { influencia: 8 }, cooldown: 4, repeatable: true, dialog: 'target',
    effect: {},
  },
  {
    id: 'exportar_revolucao', cat: 'mundo', name: 'Exportar a revolução', icon: '🚩', tier: 3,
    desc: 'Financia movimentos alinhados ideologicamente mundo afora.',
    cost: { tesouro: 70, poder: 10 }, cooldown: 10, dialog: 'target',
    effect: {},
  },
];

export const ACTION_BY_ID = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export const SPEECH_TOPICS = [
  { id: 'unidade',   label: 'União nacional',        icon: '🤝', effect: { stats: { estabilidade: 4, aprovacao: 2, agitacao: -3 }, factions: { igreja: 3, militares: 2, trabalhadores: 2 } } },
  { id: 'economia',  label: 'Economia e emprego',    icon: '💼', effect: { stats: { economia: 1, aprovacao: 2 }, factions: { empresariado: 5, trabalhadores: 3 } } },
  { id: 'medo',      label: 'Lei e ordem',           icon: '🚔', effect: { stats: { medo: 5, criminalidade: -2, liberdades: -2 }, factions: { policia: 6, militares: 4, juventude: -3 } } },
  { id: 'social',    label: 'Justiça social',        icon: '🤲', effect: { stats: { aprovacao: 3 }, factions: { trabalhadores: 6, camponeses: 5, minorias: 6, empresariado: -4 } } },
  { id: 'patria',    label: 'Soberania e pátria',    icon: '🚩', effect: { stats: { estabilidade: 2, reputacao: -1 }, factions: { nacionalistas: 8, militares: 3 } } },
  { id: 'verdade',   label: 'Transparência total',   icon: '🔎', effect: { stats: { corrupcao: -3, liberdades: 3, reputacao: 3 }, factions: { imprensa: 6, intelectuais: 5, empresariado: -2 } } },
  { id: 'fe',        label: 'Fé e família',          icon: '⛪', effect: { stats: { aprovacao: 2, liberdades: -2 }, factions: { igreja: 8, minorias: -5 } } },
  { id: 'progresso', label: 'Ciência e futuro',      icon: '🚀', effect: { stats: { tecnologia: 2, educacao: 1, reputacao: 2 }, factions: { intelectuais: 6, juventude: 4, igreja: -3 } } },
];

export const PURGE_STYLES = [
  { id: 'demitir',  label: 'Demissão pública',     risk: 0.05, effect: { stats: { medo: 2 }, factions: { imprensa: -2 }, text: 'Demitido em cerimônia televisionada.' } },
  { id: 'prender',  label: 'Prisão',               risk: 0.25, effect: { stats: { medo: 6, repressao: 5, liberdades: -5, reputacao: -4 }, factions: { imprensa: -8 }, text: 'Preso sob acusação de corrupção.' } },
  { id: 'exilar',   label: 'Exílio forçado',       risk: 0.12, effect: { stats: { medo: 4, liberdades: -3 }, factions: { imprensa: -4 }, text: 'Embarcou para o exterior "por motivos de saúde".' } },
  { id: 'sumir',    label: 'Desaparecimento',      risk: 0.45, effect: { stats: { medo: 12, repressao: 8, liberdades: -8, reputacao: -10, agitacao: 5 }, factions: { imprensa: -12, militares: 2 }, text: 'Nunca mais foi visto.' } },
  { id: 'executar', label: 'Execução',             risk: 0.7,  effect: { stats: { medo: 18, repressao: 12, liberdades: -12, reputacao: -16, agitacao: 8 }, factions: { imprensa: -16, militares: 3 }, text: 'Executado sumariamente.' } },
];
