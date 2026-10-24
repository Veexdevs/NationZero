/* Registro de comandos de UI por módulo de tela (evita import circular). */

const registry = {};

export function registerCommands(obj) {
  Object.assign(registry, obj);
}

export function getCommand(ns) {
  return registry[ns];
}
