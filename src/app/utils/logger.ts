/**
 * logger.ts — logging condicional por entorno.
 *
 * En producción se silencian log/info/debug/warn (ruido y posible fuga de
 * detalles internos en la consola del navegador). `error` siempre pasa porque
 * es útil para diagnósticos incluso en producción.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: isDev ? console.log.bind(console) : () => {},
  info: isDev ? console.info.bind(console) : () => {},
  debug: isDev ? console.debug.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: console.error.bind(console),
};
