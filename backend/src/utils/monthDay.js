import { config } from '../config.js';

/** Dia do mês válido para todo mês (1–28); fora disso volta o padrão. */
export function clampMonthDay(value, fallback) {
  const day = Number(value);
  if (!Number.isFinite(day)) {
    return fallback;
  }
  return Math.min(28, Math.max(1, Math.round(day)));
}

/**
 * Ano, mês e dia de `date` no fuso do app (padrão America/Sao_Paulo).
 * O servidor da Vercel roda em UTC: às 22h de Brasília ele já estaria no dia seguinte.
 */
export function localDateParts(date = new Date(), timeZone = config.timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date)
    .reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});

  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** Data de hoje no fuso do app, no formato AAAA-MM-DD. */
export function todayIso(date = new Date()) {
  const { year, month, day } = localDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
