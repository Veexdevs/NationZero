/*
 * Eventos aleatórios de NationZero.
 * Cada evento tem escolhas com efeitos. `special` é resolvido na simulação.
 */

export const EVENTS = [
  /* ------------------------- CRISES ECONÔMICAS ------------------------- */
  {
    id: 'crise_cambial', title: 'Ataque especulativo', icon: '📉', weight: 10,
    text: 'Fundos internacionais estão vendendo sua moeda em massa. O dólar disparou 18% em uma semana.',
    choices: [
      { label: 'Subir juros brutalmente', icon: '🏦', effect: { stats: { inflacao: -1.5, economia: -1.5, desemprego: 0.8, aprovacao: -3 }, factions: { financeiro: 8 } } },
      { label: 'Queimar reservas para segurar o câmbio', icon: '💸', effect: { treasury: -70, stats: { inflacao: -0.8, economia: 0.5 }, factions: { empresariado: 4 } } },
      { label: 'Fechar o mercado de câmbio', icon: '🚧', effect: { stats: { economia: -2, reputacao: -8, liberdades: -4, sancoes: 6 }, factions: { nacionalistas: 6, financeiro: -14 } } },
    ],
  },
  {
    id: 'greve_geral', title: 'Greve geral', icon: '✊', weight: 12,
    text: 'Sindicatos paralisaram o transporte, a indústria e as escolas. O país está parado há quatro dias.',
    choices: [
      { label: 'Negociar e conceder aumento', icon: '🤝', effect: { treasury: -30, stats: { agitacao: -10, aprovacao: 3, inflacao: 0.3 }, factions: { trabalhadores: 14, empresariado: -6 } } },
      { label: 'Declarar a greve ilegal', icon: '⚖️', effect: { stats: { agitacao: -3, repressao: 5, liberdades: -4 }, factions: { trabalhadores: -16, empresariado: 8 } } },
      { label: 'Enviar a polícia', icon: '🚔', effect: { stats: { agitacao: -8, repressao: 12, medo: 8, liberdades: -8, aprovacao: -4, reputacao: -5 }, factions: { trabalhadores: -20, policia: 6, imprensa: -6 } } },
    ],
  },
  {
    id: 'corrupcao_ministerio', title: 'Escândalo de corrupção', icon: '🕳️', weight: 14,
    text: `Um jornal publicou planilhas mostrando desvio de verbas em um ministério. Seu nome aparece nas margens.`,
    choices: [
      { label: 'Demitir o ministro e abrir investigação', icon: '🔎', effect: { stats: { corrupcao: -4, aprovacao: 1, estabilidade: -2 }, factions: { imprensa: 6 } } },
      { label: 'Negar tudo e atacar o jornalista', icon: '📰', effect: { stats: { corrupcao: 3, aprovacao: -3, liberdades: -2 }, factions: { imprensa: -12, empresariado: 2 } } },
      { label: 'Comprar o silêncio da redação', icon: '💼', effect: { treasury: -25, stats: { corrupcao: 5, medo: 2 }, factions: { imprensa: -4 }, flags: { comprou_imprensa: true } } },
      { label: 'Culpar o governo anterior', icon: '🪞', effect: { stats: { aprovacao: -1 }, factions: { juventude: -2 } } },
    ],
  },
  {
    id: 'apagao', title: 'Apagão nacional', icon: '🔌', weight: 9,
    text: 'Uma falha em cascata deixou 60 milhões de pessoas sem energia por 14 horas.',
    choices: [
      { label: 'Investir na rede elétrica', icon: '🌉', effect: { treasury: -55, stats: { infraestrutura: 5, aprovacao: 2 } } },
      { label: 'Culpar sabotagem estrangeira', icon: '🕵️', effect: { stats: { aprovacao: 2, reputacao: -3, agitacao: 3 }, factions: { nacionalistas: 6 } } },
      { label: 'Privatizar o setor elétrico', icon: '🏷️', effect: { treasury: 50, stats: { infraestrutura: -2, aprovacao: -3 }, factions: { empresariado: 10, trabalhadores: -8 } } },
    ],
  },
  {
    id: 'inflacao_alimentos', title: 'Preço dos alimentos explode', icon: '🍞', weight: 11,
    text: 'O feijão triplicou de preço. Filas em supermercados e saques em algumas cidades.',
    choices: [
      { label: 'Tabelar preços', icon: '🏷️', effect: { stats: { inflacao: -1, aprovacao: 4, economia: -1.5, desemprego: 0.5 } } },
      { label: 'Importar comida com urgência', icon: '🚢', effect: { treasury: -40, stats: { inflacao: -1.2, aprovacao: 3, reputacao: 2 } } },
      { label: 'Distribuir cestas básicas', icon: '🧺', effect: { treasury: -20, stats: { aprovacao: 2, agitacao: -3 }, factions: { trabalhadores: 5, camponeses: 3 } } },
      { label: 'Não fazer nada: o mercado resolve', icon: '🙈', effect: { stats: { inflacao: 1.2, aprovacao: -5, agitacao: 5 }, factions: { financeiro: 3, trabalhadores: -6 } } },
    ],
  },
  {
    id: 'desemprego_jovem', title: 'Geração sem futuro', icon: '🎧', weight: 8,
    text: 'Um em cada três jovens está fora da escola e do trabalho. As redes explodem de raiva.',
    choices: [
      { label: 'Programa de primeiro emprego', icon: '💼', effect: { treasury: -35, stats: { desemprego: -0.8, aprovacao: 3 }, factions: { juventude: 14, empresariado: 4 } } },
      { label: 'Bolsa para jovens', icon: '🎁', effect: { treasury: -25, stats: { aprovacao: 2, desemprego: -0.3 }, factions: { juventude: 10 } } },
      { label: 'Recrutar para as forças armadas', icon: '🪖', effect: { stats: { poderMilitar: 2, desemprego: -0.4 }, factions: { juventude: 2, militares: 6 } } },
    ],
  },

  /* ------------------------- CRISES SOCIAIS ------------------------- */
  {
    id: 'protestos_massivos', title: 'O país foi às ruas', icon: '📢', weight: 13,
    text: 'Milhões ocupam as capitais. As pautas vão de transporte a impeachment. A energia é imprevisível.',
    choices: [
      { label: 'Receber os líderes no palácio', icon: '🤝', effect: { stats: { agitacao: -12, aprovacao: 4, estabilidade: 3 }, factions: { juventude: 8, imprensa: 4 } } },
      { label: 'Anunciar pacote de concessões', icon: '🎁', effect: { treasury: -45, stats: { agitacao: -10, aprovacao: 6 }, factions: { trabalhadores: 8, juventude: 6 } } },
      { label: 'Reprimir com força', icon: '🛡️', effect: { stats: { agitacao: -5, repressao: 14, medo: 10, liberdades: -10, aprovacao: -8, reputacao: -8 }, factions: { juventude: -18, imprensa: -10, policia: 8 } } },
      { label: 'Decretar estado de emergência', icon: '🆘', effect: { stats: { liberdades: -15, repressao: 10, agitacao: 5, estabilidade: 2 }, set: { regime: 'autoritarismo' } } },
    ],
  },
  {
    id: 'crime_organizado', title: 'Facções controlam bairros', icon: '🚨', weight: 10,
    text: 'Em três capitais, o crime organizado cobra "imposto", distribui gás e julga conflitos. O Estado é ausência.',
    choices: [
      { label: 'Intervenção federal na segurança', icon: '🚔', effect: { treasury: -30, stats: { criminalidade: -6, repressao: 5, liberdades: -3 }, factions: { policia: 8 } } },
      { label: 'Programa social nas áreas dominadas', icon: '🤲', effect: { treasury: -25, stats: { criminalidade: -4, aprovacao: 3 }, factions: { minorias: 8, intelectuais: 4 } } },
      { label: 'Legalizar e regulamentar', icon: '📜', effect: { stats: { criminalidade: -5, liberdades: 4, aprovacao: -2 }, factions: { igreja: -12, policia: -6 } } },
      { label: 'Tolerar em troca de paz', icon: '🤐', effect: { stats: { criminalidade: 3, corrupcao: 5, estabilidade: 2 }, factions: { policia: -8 } } },
    ],
  },
  {
    id: 'movimento_identitario', title: 'Debate cultural explode', icon: '🏳️‍🌈', weight: 8,
    text: 'Um projeto sobre direitos de minorias dividiu o país e dominou as redes por semanas.',
    choices: [
      { label: 'Apoiar o projeto publicamente', icon: '🤲', effect: { stats: { liberdades: 6, aprovacao: 2 }, factions: { minorias: 16, juventude: 10, igreja: -14, nacionalistas: -6 } } },
      { label: 'Deixar o Congresso decidir', icon: '🏛️', effect: { stats: { estabilidade: 1 }, factions: { imprensa: 2 } } },
      { label: 'Posicionar-se contra', icon: '⛪', effect: { stats: { liberdades: -5, aprovacao: -1 }, factions: { igreja: 16, nacionalistas: 8, minorias: -18, juventude: -10 } } },
      { label: 'Silenciar o assunto', icon: '🔇', effect: { stats: { liberdades: -4, medo: 3 }, control: { midia: 4 }, factions: { imprensa: -8 } } },
    ],
  },
  {
    id: 'ataque_terrorista', title: 'Ataque terrorista', icon: '💣', weight: 6,
    text: 'Uma explosão em estação central matou 42 pessoas. O país exige resposta imediata.',
    choices: [
      { label: 'Lei antiterrorismo ampla', icon: '🚨', effect: { stats: { repressao: 10, liberdades: -10, medo: 8, estabilidade: 3, aprovacao: 2 }, control: { policia: 8 } } },
      { label: 'Operação militar no exterior', icon: '⚔️', effect: { treasury: -50, stats: { poderMilitar: 1, reputacao: -6, aprovacao: 4, medo: 3 }, factions: { militares: 8 } } },
      { label: 'Investigar com garantias legais', icon: '⚖️', effect: { stats: { aprovacao: -2, liberdades: 3, reputacao: 3 }, factions: { imprensa: 6, intelectuais: 4 } } },
    ],
  },
  {
    id: 'migracao', title: 'Crise migratória', icon: '🚶', weight: 7,
    text: 'Milhares cruzam sua fronteira fugindo de uma guerra vizinha. Acampamentos improvisados crescem.',
    choices: [
      { label: 'Acolher com visto humanitário', icon: '🤲', effect: { stats: { reputacao: 6, populacao: 1.5, aprovacao: -2 }, factions: { igreja: 6, minorias: 10, nacionalistas: -12 } } },
      { label: 'Fechar a fronteira', icon: '🚧', effect: { stats: { reputacao: -5, aprovacao: 3, populacao: 0.2 }, factions: { nacionalistas: 14, minorias: -8 } } },
      { label: 'Usar mão de obra em obras públicas', icon: '🏗️', effect: { treasury: 15, stats: { infraestrutura: 3, aprovacao: -1 }, factions: { empresariado: 6, nacionalistas: -4 } } },
      { label: 'Deportar em massa', icon: '🚫', effect: { stats: { reputacao: -10, repressao: 6, aprovacao: 2 }, factions: { nacionalistas: 12, imprensa: -8 } } },
    ],
  },
  {
    id: 'seca_catastrofe', title: 'Catástrofe climática', icon: '🌊', weight: 8,
    text: 'Chuvas destruíram três estados. 200 mil desabrigados e uma crise humanitária em curso.',
    choices: [
      { label: 'Mobilização total do Estado', icon: '🚁', effect: { treasury: -60, stats: { aprovacao: 6, estabilidade: 2, infraestrutura: -1 }, factions: { imprensa: 4 } } },
      { label: 'Ajuda humanitária mínima', icon: '📦', effect: { treasury: -15, stats: { aprovacao: -3, agitacao: 3 } } },
      { label: 'Culpar o aquecimento global e cobrar o mundo', icon: '🌍', effect: { stats: { reputacao: 3, aprovacao: 1, meioAmbiente: 3 }, factions: { intelectuais: 6, nacionalistas: 2 } } },
    ],
  },
  {
    id: 'vazamento_dados', title: 'Vazamento de dados', icon: '💾', weight: 7,
    text: 'Dados de 40 milhões de cidadãos vazaram. Há registros de vigilância política no pacote.',
    choices: [
      { label: 'Assumir e criar autoridade de proteção', icon: '🛡️', effect: { stats: { liberdades: 4, corrupcao: -3, reputacao: 2 }, factions: { imprensa: 8, intelectuais: 6 } } },
      { label: 'Censurar a divulgação', icon: '🔇', effect: { stats: { liberdades: -6, medo: 3 }, control: { midia: 4 }, factions: { imprensa: -12 } } },
      { label: 'Negar e culpar hackers estrangeiros', icon: '🕵️', effect: { stats: { aprovacao: -2, reputacao: -3 }, factions: { nacionalistas: 3 } } },
    ],
  },
  {
    id: 'pandemia', title: 'Nova pandemia', icon: '🦠', weight: 5,
    text: 'Um vírus respiratório desconhecido já matou 3 mil. Hospitais lotam em duas semanas.',
    choices: [
      { label: 'Lockdown nacional', icon: '🏠', effect: { stats: { economia: -3, saude: 4, aprovacao: -2, desemprego: 1 }, treasury: -40 } },
      { label: 'Vacinação emergencial', icon: '💉', effect: { treasury: -70, stats: { saude: 6, aprovacao: 4, reputacao: 3 } } },
      { label: 'Manter tudo aberto', icon: '🏭', effect: { stats: { saude: -8, economia: 1, aprovacao: -6 }, factions: { empresariado: 6, trabalhadores: -8 } } },
      { label: 'Militarizar a resposta', icon: '🪖', effect: { stats: { saude: 1, repressao: 8, liberdades: -6, medo: 5 }, factions: { militares: 6 } } },
    ],
  },

  /* ------------------------- POLÍTICA INTERNA ------------------------- */
  {
    id: 'impeachment', title: 'Pedido de impeachment', icon: '⚖️', weight: 10, once: false,
    text: 'A oposição protocolou um pedido de impeachment com 100 assinaturas. O parlamento vai votar.',
    require: { role: ['presidente', 'ditador', 'monarca'] },
    choices: [
      { label: 'Negociar com o parlamento', icon: '🤝', effect: { treasury: -30, stats: { estabilidade: 4, aprovacao: 2 }, factions: { imprensa: 2 } } },
      { label: 'Comprar votos contra o pedido', icon: '💼', effect: { treasury: -50, stats: { corrupcao: 6 }, flags: { votos_comprados: true } } },
      { label: 'Mobilizar a base nas ruas', icon: '📣', effect: { stats: { agitacao: 6, aprovacao: 3, estabilidade: -3 }, factions: { trabalhadores: 6, juventude: 4 } } },
      { label: 'Ignorar o pedido', icon: '🙈', special: 'impeachment_risk', effect: { stats: { estabilidade: -4, aprovacao: -4 } } },
    ],
  },
  {
    id: 'desertor_general', title: 'General dissidente', icon: '🎖️', weight: 9,
    text: 'Um general de quatro estrelas deu entrevista criticando o governo. Os quartéis estão em silêncio cúmplice.',
    choices: [
      { label: 'Promover e cooptar', icon: '⬆️', effect: { stats: { lealdadeMilitar: 5 }, factions: { militares: 6 } } },
      { label: 'Transferir para a Amazônia', icon: '🗺️', effect: { stats: { lealdadeMilitar: -2, medo: 2 }, factions: { militares: -4 } } },
      { label: 'Prender por insubordinação', icon: '⛓️', effect: { stats: { medo: 6, lealdadeMilitar: -8, repressao: 4, reputacao: -4 }, factions: { militares: -12, imprensa: -2 } } },
      { label: 'Deixar falar', icon: '🎙️', effect: { stats: { liberdades: 3, lealdadeMilitar: -2 }, factions: { imprensa: 4, militares: -2 } } },
    ],
  },
  {
    id: 'proposta_fortuna', title: 'Proposta indecente', icon: '💼', weight: 8,
    text: 'Um lobista oferece N$ 80 bi "em consultoria" por um contrato de concessão. Ninguém precisa saber.',
    choices: [
      { label: 'Aceitar', icon: '💰', effect: { treasury: 80, stats: { corrupcao: 7, aprovacao: -1 }, flags: { corrupcao_ativa: true } } },
      { label: 'Recusar e denunciar', icon: '🔎', effect: { stats: { corrupcao: -4, aprovacao: 3, reputacao: 2 }, factions: { imprensa: 6 } } },
      { label: 'Aceitar e usar contra ele', icon: '🗂️', effect: { treasury: 40, stats: { medo: 4, corrupcao: 3 }, flags: { dossie: true } } },
    ],
  },
  {
    id: 'greve_militar', title: 'Motim nos quartéis', icon: '🪖', weight: 6,
    text: 'Oficiais intermediários exigem reajuste e ameaçam entregar os crachás.',
    require: { role: ['presidente', 'ditador', 'monarca', 'ministro', 'vice'] },
    choices: [
      { label: 'Reajuste imediato', icon: '💵', effect: { treasury: -45, stats: { lealdadeMilitar: 10 }, factions: { militares: 12 } } },
      { label: 'Chamar os líderes do motim à mesa', icon: '🤝', effect: { stats: { lealdadeMilitar: 4, poder: -3 } } },
      { label: 'Prender os líderes', icon: '⛓️', effect: { stats: { lealdadeMilitar: -14, medo: 6, repressao: 5 }, factions: { militares: -16 }, special: 'coup_risk' } },
    ],
  },
  {
    id: 'golpe_em_curso', title: 'Rumores de golpe', icon: '🚨', weight: 7,
    text: 'Sua inteligência detectou reuniões de oficiais e empresários. Algo está sendo preparado.',
    choices: [
      { label: 'Expurgar preventivamente', icon: '🗡️', effect: { stats: { lealdadeMilitar: -10, medo: 8, repressao: 6, liberdades: -6 }, factions: { militares: -12 }, special: 'coup_risk' } },
      { label: 'Cooptar os conspiradores', icon: '💼', effect: { treasury: -40, stats: { lealdadeMilitar: 6 }, factions: { militares: 8 } } },
      { label: 'Ignorar, é só boato', icon: '🙈', effect: { stats: { estabilidade: -3 }, flags: { golpe_ignorado: true } } },
    ],
  },
  {
    id: 'imprensa_hostil', title: 'Jornal publica série contra você', icon: '📰', weight: 9,
    text: 'Uma reportagem investigativa liga seu governo a esquema de propinas e desvio de verbas.',
    choices: [
      { label: 'Responder com transparência', icon: '🔎', effect: { stats: { corrupcao: -3, aprovacao: -2, reputacao: 2, liberdades: 2 }, factions: { imprensa: 10 } } },
      { label: 'Cancelar assinaturas e censurar', icon: '🔇', effect: { stats: { liberdades: -6, medo: 4, aprovacao: -3 }, control: { midia: 6 }, factions: { imprensa: -14 } } },
      { label: 'Comprar o jornal', icon: '💼', effect: { treasury: -40, stats: { corrupcao: 4 }, control: { midia: 10 }, factions: { imprensa: -4 } } },
      { label: 'Acusar de fake news', icon: '📢', effect: { stats: { aprovacao: 1, liberdades: -2 }, factions: { imprensa: -8, nacionalistas: 4 } } },
    ],
  },
  {
    id: 'igreja_conflito', title: 'Conflito com a Igreja', icon: '⛪', weight: 7,
    text: 'A liderança religiosa condenou publicamente uma de suas medidas e convocou fiéis ao protesto.',
    choices: [
      { label: 'Recuar da medida', icon: '↩️', effect: { stats: { aprovacao: -2 }, factions: { igreja: 14, minorias: -6, intelectuais: -4 } } },
      { label: 'Negociar privilégios fiscais', icon: '🤝', effect: { treasury: -20, factions: { igreja: 8, financeiro: -2 } } },
      { label: 'Confrontar o clero', icon: '⚔️', effect: { stats: { liberdades: 3, agitacao: 3 }, factions: { igreja: -18, intelectuais: 6, juventude: 6 } } },
      { label: 'Criar sua própria igreja nacional', icon: '🏛️', effect: { stats: { liberdades: -5, legitimidade: 4 }, factions: { igreja: -10, nacionalistas: 8, militares: 3 } } },
    ],
  },
  {
    id: 'artista_protesto', title: 'A cultura protesta', icon: '🎭', weight: 6,
    text: 'Um festival de música virou palco de críticas ao governo, transmitido para 90 milhões de pessoas.',
    choices: [
      { label: 'Aplaudir a liberdade artística', icon: '👏', effect: { stats: { liberdades: 4, aprovacao: 2 }, factions: { juventude: 8, intelectuais: 8 } } },
      { label: 'Cortar patrocínio público', icon: '✂️', effect: { treasury: 8, stats: { liberdades: -3 }, factions: { intelectuais: -10, juventude: -6 } } },
      { label: 'Processar os organizadores', icon: '⚖️', effect: { stats: { medo: 2, liberdades: -4, aprovacao: -2 }, factions: { intelectuais: -12, imprensa: -6 } } },
    ],
  },

  /* ------------------------- OPORTUNIDADES ------------------------- */
  {
    id: 'descoberta_petroleo', title: 'Descoberta de petróleo', icon: '🛢️', weight: 6,
    text: 'A perfuração em águas profundas encontrou um campo enorme. Estimativas falam em décadas de produção.',
    choices: [
      { label: 'Explorar com estatal', icon: '🏛️', effect: { treasury: 40, stats: { economia: 3, aprovacao: -2 }, factions: { trabalhadores: 8, empresariado: -4, financeiro: -4 }, flags: { petroleo_estatal: true } } },
      { label: 'Leilão internacional', icon: '🌐', effect: { treasury: 160, stats: { economia: 2, reputacao: 3, meioAmbiente: -3 }, factions: { empresariado: 12, financeiro: 10 } } },
      { label: 'Proibir: preservar a costa', icon: '🌳', effect: { stats: { meioAmbiente: 6, reputacao: 4, economia: -1 }, factions: { intelectuais: 8, minorias: 4, empresariado: -10 } } },
    ],
  },
  {
    id: 'tecnologia_promissora', title: 'Startup nacional decola', icon: '🚀', weight: 6,
    text: 'Uma empresa de tecnologia do seu país virou unicórnio e quer apoio do Estado para escalar.',
    choices: [
      { label: 'Investir pelo banco de fomento', icon: '💵', effect: { treasury: -30, stats: { tecnologia: 5, economia: 2, reputacao: 3 }, factions: { empresariado: 8, intelectuais: 4 } } },
      { label: 'Nacionalizar a tecnologia', icon: '🏛️', effect: { stats: { tecnologia: 3, liberdades: -2 }, factions: { empresariado: -12, trabalhadores: 4 } } },
      { label: 'Deixar o mercado agir', icon: '📈', effect: { stats: { tecnologia: 2, economia: 1 }, factions: { empresariado: 6, financeiro: 4 } } },
    ],
  },
  {
    id: 'mediacao_paz', title: 'Convite para mediar a paz', icon: '🕊️', weight: 6,
    text: 'Dois países em guerra pedem que você medie o acordo. Visibilidade global.',
    choices: [
      { label: 'Aceitar e investir na paz', icon: '🕊️', effect: { treasury: -30, stats: { reputacao: 12, influencia: 10 }, factions: { imprensa: 8, igreja: 5 } } },
      { label: 'Apoiar secretamente um dos lados', icon: '🎯', effect: { treasury: 25, stats: { reputacao: -6, influencia: 5, sancoes: 3 }, factions: { militares: 6 } } },
      { label: 'Recusar: não é nosso problema', icon: '🚪', effect: { stats: { reputacao: -3, influencia: -2 } } },
    ],
  },
  {
    id: 'patrimonio_unesco', title: 'Patrimônio mundial', icon: '🏛️', weight: 5,
    text: 'A UNESCO oferece reconhecer um sítio histórico seu, com investimento de turismo previsto.',
    choices: [
      { label: 'Aceitar com festa nacional', icon: '🎉', effect: { treasury: 20, stats: { reputacao: 5, aprovacao: 3 }, factions: { nacionalistas: 8, imprensa: 3 } } },
      { label: 'Recusar: patrimônio é do povo, não da ONU', icon: '🚩', effect: { stats: { reputacao: -4, aprovacao: 2 }, factions: { nacionalistas: 10 } } },
    ],
  },
  {
    id: 'heranca_politica', title: 'Um velho rival procura acordo', icon: '🤝', weight: 7,
    text: 'Seu maior adversário político oferece trégua em troca de um ministério para o filho dele.',
    choices: [
      { label: 'Aceitar o acordo', icon: '🤝', effect: { stats: { estabilidade: 5, aprovacao: 2, corrupcao: 3 }, factions: { imprensa: -3 } } },
      { label: 'Recusar publicamente', icon: '🚫', effect: { stats: { aprovacao: 3, corrupcao: -2, agitacao: 2 }, factions: { imprensa: 6, intelectuais: 4 } } },
      { label: 'Aceitar e depois trair', icon: '🗡️', effect: { stats: { medo: 5, aprovacao: -2, corrupcao: 2 }, factions: { imprensa: -6 } } },
    ],
  },
  {
    id: 'superbacteria', title: 'Bactéria resistente', icon: '🧫', weight: 5,
    text: 'Uma superbactéria surgiu em hospitais públicos. O sistema de saúde está no limite.',
    choices: [
      { label: 'Financiar pesquisa urgente', icon: '🧪', effect: { treasury: -35, stats: { saude: 5, tecnologia: 3, reputacao: 2 }, factions: { intelectuais: 6 } } },
      { label: 'Importar medicamentos', icon: '🚢', effect: { treasury: -25, stats: { saude: 3 } } },
      { label: 'Cortar custos e conter informação', icon: '🔇', effect: { stats: { saude: -5, liberdades: -3, aprovacao: -4 }, factions: { imprensa: -8 } } },
    ],
  },

  /* ------------------------- EVENTOS DE REGIME ------------------------- */
  {
    id: 'onu_convoca', title: 'ONU convoca seu governo', icon: '🌐', weight: 8,
    text: 'O Conselho de Direitos Humanos abriu processo contra seu país por violações sistemáticas.',
    require: { stats: { repressao: 35 } },
    choices: [
      { label: 'Cooperar com a investigação', icon: '📜', effect: { stats: { reputacao: 8, liberdades: 4, repressao: -5 }, factions: { imprensa: 6 }, flags: { investigacao_onu: true } } },
      { label: 'Chamar o Conselho de hipócrita', icon: '🚩', effect: { stats: { reputacao: -6, sancoes: 5, aprovacao: 2 }, factions: { nacionalistas: 8 } } },
      { label: 'Sair da ONU', icon: '🚪', effect: { stats: { reputacao: -15, sancoes: 15, economia: -1 }, factions: { nacionalistas: 12, imprensa: -8 } } },
      { label: 'Subornar diplomatas', icon: '💼', effect: { treasury: -40, stats: { reputacao: 2, corrupcao: 3 }, special: 'coverup' } },
    ],
  },
  {
    id: 'primavera', title: 'Primavera nas ruas', icon: '🌸', weight: 12,
    text: 'Inspirados por um movimento regional, jovens ocupam as praças exigindo liberdade. A faísca pode virar incêndio.',
    require: { stats: { repressao: 25 } },
    choices: [
      { label: 'Abrir diálogo e anistia', icon: '🤝', effect: { stats: { agitacao: -12, liberdades: 10, repressao: -8, aprovacao: 5, estabilidade: 4 }, factions: { juventude: 14, imprensa: 10 } } },
      { label: 'Reprimir com o exército', icon: '🪖', effect: { stats: { agitacao: 10, repressao: 15, medo: 12, reputacao: -12, liberdades: -10 }, factions: { militares: 6, juventude: -20, imprensa: -12 } } },
      { label: 'Cortar a internet', icon: '🔌', effect: { stats: { agitacao: -4, economia: -1.5, liberdades: -8, medo: 5 }, control: { midia: 6 }, factions: { juventude: -8 } } },
      { label: 'Conceder reformas superficiais', icon: '📄', effect: { stats: { agitacao: -6, aprovacao: 3, liberdades: 3 } } },
    ],
  },
  {
    id: 'sancao_global', title: 'Sanções internacionais', icon: '🚫', weight: 7,
    text: 'Um bloco de países aprovou sanções coordenadas contra seu país. Bancos cortam linhas de crédito.',
    require: { stats: { sancoes: 20 } },
    choices: [
      { label: 'Buscar rutura e novos parceiros', icon: '🌐', effect: { stats: { economia: -1, reputacao: 3, sancoes: -5 }, treasury: 20 } },
      { label: 'Aprofundar o isolamento', icon: '🚩', effect: { stats: { sancoes: 8, economia: -2, aprovacao: 3 }, factions: { nacionalistas: 12 } } },
      { label: 'Ceder e negociar', icon: '🤝', effect: { stats: { sancoes: -10, liberdades: 5, repressao: -5, aprovacao: -3 }, factions: { imprensa: 8 } } },
    ],
  },
  {
    id: 'sucessao', title: 'Questão de sucessão', icon: '👑', weight: 6,
    text: 'Aliados começam a discutir quem será seu sucessor. As facas aparecem nos sorrisos.',
    require: { role: ['presidente', 'ditador', 'monarca'] },
    choices: [
      { label: 'Indicar seu herdeiro', icon: '👤', effect: { stats: { estabilidade: 4 }, factions: { militares: 3 }, flags: { herdeiro: true } } },
      { label: 'Deixar a disputa aberta', icon: '⚔️', effect: { stats: { estabilidade: -4, agitacao: 3 } } },
      { label: 'Eliminar os pretendentes', icon: '🗡️', effect: { stats: { medo: 8, repressao: 6, estabilidade: -2 }, factions: { imprensa: -6, militares: -4 } } },
    ],
  },
  {
    id: 'white_wedding', title: 'A grande festa', icon: '🎉', weight: 4,
    text: 'O país celebra 100 anos de algo. Uma cerimônia gigante pode reunir o povo — ou expor o abismo.',
    choices: [
      { label: 'Festa monumental', icon: '🎆', effect: { treasury: -40, stats: { aprovacao: 5, estabilidade: 3 }, factions: { nacionalistas: 6 } } },
      { label: 'Cerimônia discreta e obras sociais', icon: '🏥', effect: { treasury: -25, stats: { saude: 2, aprovacao: 4 }, factions: { trabalhadores: 5 } } },
      { label: 'Cancelar e culpar a oposição', icon: '🚫', effect: { stats: { aprovacao: -4, agitacao: 3 } } },
    ],
  },
  {
    id: 'quebra_de_estado', title: 'Governador se rebela', icon: '🗺️', weight: 7,
    text: 'Um estado rico anunciou que não vai pagar impostos federais nem acatar seus decretos.',
    choices: [
      { label: 'Intervenção federal', icon: '🪖', effect: { stats: { estabilidade: -5, repressao: 8, liberdades: -6, medo: 6 }, factions: { militares: 4 } } },
      { label: 'Negociar autonomia', icon: '🤝', effect: { stats: { estabilidade: 6, corrupcao: 2 }, flags: { federalismo: true } } },
      { label: 'Cortar repasses', icon: '✂️', effect: { stats: { economia: -1, agitacao: 4 }, treasury: 30 } },
      { label: 'Conceder e depois sabotar', icon: '🗡️', effect: { treasury: 15, stats: { medo: 3, estabilidade: -2 } } },
    ],
  },
  {
    id: 'amnistia_internacional', title: 'Prêmio internacional', icon: '🏅', weight: 5,
    text: 'Uma fundação internacional quer te premiar por "liderança transformadora". O prêmio vem com financiamento.',
    choices: [
      { label: 'Aceitar com discurso', icon: '🏅', effect: { treasury: 30, stats: { reputacao: 8, aprovacao: 2 } } },
      { label: 'Recusar prêmios estrangeiros', icon: '🚩', effect: { stats: { aprovacao: 2, reputacao: -4 }, factions: { nacionalistas: 8 } } },
    ],
  },
  {
    id: 'colapso_estado', title: 'O Estado está quebrando', icon: '💀', weight: 10,
    text: 'Servidores sem salário, hospitais sem insumos, estradas sem manutenção. A máquina está parando.',
    require: { statsMax: { estabilidade: 30 } },
    choices: [
      { label: 'Pacote de emergência', icon: '🚑', effect: { treasury: -60, stats: { estabilidade: 6, aprovacao: 2 } } },
      { label: 'Pedir ajuda ao FMI', icon: '🏦', effect: { treasury: 120, stats: { estabilidade: 5, aprovacao: -4, liberdades: -3, sancoes: -4 }, factions: { financeiro: 12, trabalhadores: -8 } } },
      { label: 'Militarizar serviços essenciais', icon: '🪖', effect: { stats: { estabilidade: 3, repressao: 10, liberdades: -8 }, factions: { militares: 8 } } },
      { label: 'Deixar quebrar', icon: '💀', effect: { stats: { estabilidade: -8, agitacao: 10, economia: -3 } } },
    ],
  },
  {
    id: 'fuga_cerebros', title: 'Fuga de cérebros', icon: '✈️', weight: 6,
    text: 'Médicos, engenheiros e pesquisadores estão emigrando em massa. O país perde sua inteligência.',
    require: { statsMax: { liberdades: 35 } },
    choices: [
      { label: 'Programa de retenção de talentos', icon: '🧠', effect: { treasury: -30, stats: { educacao: 4, tecnologia: 3 } } },
      { label: 'Restringir saída de profissionais', icon: '🚧', effect: { stats: { liberdades: -8, medo: 4, educacao: 1 }, factions: { intelectuais: -14 } } },
      { label: 'Deixar ir', icon: '👋', effect: { stats: { educacao: -3, tecnologia: -2 } } },
    ],
  },
  {
    id: 'crise_energetica', title: 'Combustível a preço de ouro', icon: '⛽', weight: 8,
    text: 'O barril disparou e os caminhoneiros pararam. Em três dias, faltou comida nas cidades.',
    choices: [
      { label: 'Subsidiar combustível', icon: '⛽', effect: { treasury: -55, stats: { inflacao: -0.8, aprovacao: 3 }, factions: { trabalhadores: 5, empresariado: 4 } } },
      { label: 'Racionamento', icon: '📋', effect: { stats: { economia: -2, aprovacao: -2, agitacao: 4, meioAmbiente: 2 } } },
      { label: 'Acelerar produção nacional', icon: '🛢️', effect: { treasury: -20, stats: { economia: 1, meioAmbiente: -4 }, flags: { petroleo: true } } },
      { label: 'Ignorar e culpar o mercado', icon: '🙈', effect: { stats: { inflacao: 1, aprovacao: -5, agitacao: 5 } } },
    ],
  },
  {
    id: 'hacker_ataque', title: 'Ciberataque ao Estado', icon: '💻', weight: 6,
    text: 'Hackers derrubaram sistemas do banco central e do Ministério da Defesa. Pedem resgate em cripto.',
    choices: [
      { label: 'Pagar o resgate em segredo', icon: '💼', effect: { treasury: -25, stats: { corrupcao: 2, reputacao: -2 }, flags: { resgate_pago: true } } },
      { label: 'Reconstruir com equipe própria', icon: '🛠️', effect: { treasury: -40, stats: { tecnologia: 4, estabilidade: 2 } } },
      { label: 'Militarizar a cibersegurança', icon: '🪖', effect: { treasury: -20, stats: { tecnologia: 2, repressao: 4, liberdades: -3 }, factions: { militares: 4 } } },
    ],
  },
  {
    id: 'tribunal_internacional', title: 'Mandado internacional', icon: '⚖️', weight: 5,
    text: 'Um tribunal internacional prepara mandados de prisão contra você e seus ministros.',
    require: { stats: { repressao: 45 } },
    choices: [
      { label: 'Ignorar com desprezo', icon: '😤', effect: { stats: { sancoes: 8, reputacao: -8, aprovacao: 3 }, factions: { nacionalistas: 10 } } },
      { label: 'Buscar imunidade diplomática', icon: '🎩', effect: { treasury: -50, stats: { reputacao: 3, sancoes: -4 } } },
      { label: 'Anistiar presos políticos para amenizar', icon: '🕊️', effect: { stats: { liberdades: 8, repressao: -8, reputacao: 6, medo: -4 }, factions: { imprensa: 10, militares: -4 } } },
    ],
  },
  {
    id: 'bunker', title: 'A bomba e o bunker', icon: '☢️', weight: 8,
    text: 'Seu arsenal nuclear está operacional. Assessores pedem autorização para colocar as forças em alerta máximo.',
    require: { stats: { arsenalNuclear: 1 } },
    choices: [
      { label: 'Alerta máximo', icon: '🚨', effect: { stats: { medo: 15, poder: 10, sancoes: 10, reputacao: -10, estabilidade: 3 }, factions: { militares: 8, nacionalistas: 10 } } },
      { label: 'Manter dissuasão discreta', icon: '🤫', effect: { stats: { poderMilitar: 3, estabilidade: 2 }, factions: { militares: 3 } } },
      { label: 'Negociar desarmamento', icon: '🕊️', effect: { stats: { arsenalNuclear: -1, reputacao: 12, sancoes: -10 }, factions: { imprensa: 8, militares: -8 } } },
    ],
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
