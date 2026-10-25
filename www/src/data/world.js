/*
 * Nações do mundo de NationZero.
 * relation: 0-100 (quanto gostam de você)
 */

export const COUNTRIES = [
  {
    id: 'valdoria', name: 'Valdória', flag: '', capital: 'Porto Claro',
    power: 82, economy: 88, trait: 'Potência liberal, dona do sistema financeiro global.',
    align: { economico: 55, social: -45, nacionalismo: -40 },
    relation: 62, bloc: 'ocidente',
  },
  {
    id: 'krasnovia', name: 'Krasnovia', flag: '', capital: 'Novo Krasnogrado',
    power: 88, economy: 58, trait: 'Autocracia militar com arsenal nuclear gigante.',
    align: { economico: 20, social: 65, nacionalismo: 70 },
    relation: 44, bloc: 'leste',
  },
  {
    id: 'shenlong', name: 'Shenlong', flag: '', capital: 'Yun-Chen',
    power: 91, economy: 84, trait: 'Império comercial que compra qualquer coisa — e qualquer um.',
    align: { economico: 35, social: 50, nacionalismo: 45 },
    relation: 58, bloc: 'leste',
  },
  {
    id: 'alrafid', name: 'Al-Rafid', flag: '', capital: 'Madinat al-Nur',
    power: 54, economy: 66, trait: 'Monarquia petroleira, compra lealdade por barril.',
    align: { economico: 60, social: 60, religiao: 85 },
    relation: 51, bloc: 'sul',
  },
  {
    id: 'nordhavn', name: 'Nordhavn', flag: '', capital: 'Fjordvik',
    power: 48, economy: 79, trait: 'Social-democracia modelo, fiscal implacável de direitos humanos.',
    align: { economico: -50, social: -55, ecologia: 80 },
    relation: 66, bloc: 'ocidente',
  },
  {
    id: 'meridia', name: 'Merídia', flag: '', capital: 'Santa Cruz del Sur',
    power: 39, economy: 34, trait: 'Vizinho volátil, gigante em população e dívida.',
    align: { economico: -30, social: 10, nacionalismo: 20 },
    relation: 55, bloc: 'sul',
  },
  {
    id: 'kyushu', name: 'Kyushu', flag: '', capital: 'Takeshi',
    power: 61, economy: 90, trait: 'Tecnocracia insular, obcecada por semicondutores.',
    align: { economico: 70, social: 20, ecologia: 40 },
    relation: 60, bloc: 'ocidente',
  },
  {
    id: 'zangaro', name: 'Zangaro', flag: '', capital: 'Bakara',
    power: 27, economy: 22, trait: 'Estado frágil rico em minérios raros.',
    align: { economico: -10, social: 30, nacionalismo: 30 },
    relation: 47, bloc: 'sul',
  },
  {
    id: 'atlavia', name: 'Atlavia', flag: '', capital: 'Nova Atlântida',
    power: 44, economy: 52, trait: 'Paraíso fiscal com frota mercante e nenhuma pergunta.',
    align: { economico: 85, social: -10, nacionalismo: -20 },
    relation: 53, bloc: 'neutro',
  },
  {
    id: 'tsarvia', name: 'Tsárvia', flag: '', capital: 'Veliky Kamen',
    power: 58, economy: 41, trait: 'Nacionalismo ortodoxo, territórios disputados e muito gás.',
    align: { economico: 15, social: 55, nacionalismo: 90, religiao: 70 },
    relation: 46, bloc: 'leste',
  },
];

export const BLOCS = {
  ocidente: { label: 'Bloco Ocidental', icon: 'square' },
  leste:    { label: 'Eixo do Leste',   icon: 'square' },
  sul:      { label: 'Coalizão do Sul', icon: 'square' },
  neutro:   { label: 'Neutros',         icon: 'square' },
};

export const TREATIES = {
  comercio:   { label: 'Acordo comercial', icon: 'package', cost: 40,  desc: '+economia, +reputação, +empresariado' },
  alianca:    { label: 'Aliança militar',  icon: 'shield', cost: 80,  desc: 'Defesa mútua. Um ataque a você é um ataque a eles.' },
  extradicao: { label: 'Tratado de extradição', icon: 'scale', cost: 25, desc: 'Prende opositores exilados. +medo, −liberdades.' },
  energia:    { label: 'Contrato de energia', icon: 'fuel', cost: 60, desc: 'Energia barata por décadas. +economia.' },
  nuclear:    { label: 'Cooperação nuclear', icon: 'radiation', cost: 120, desc: 'Acelera o programa atômico.' },
  vigilancia: { label: 'Pacto de vigilância', icon: 'eye', cost: 70, desc: 'Compartilha dados de dissidentes. +controle.' },
};

export function initRelations(state, COUNTRIES_) {
  if (!state.relations || Object.keys(state.relations).length) return;
  state.relations = {};
  for (const c of COUNTRIES_) {
    state.relations[c.id] = { relation: c.relation, treaties: {}, threat: 0, spies: 0 };
  }
}
