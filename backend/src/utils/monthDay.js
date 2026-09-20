/** Dia do mês válido para todo mês (1–28); fora disso volta o padrão. */
export function clampMonthDay(value, fallback) {
  const day = Number(value);
  if (!Number.isFinite(day)) {
    return fallback;
  }
  return Math.min(28, Math.max(1, Math.round(day)));
}

/** Data de hoje no formato AAAA-MM-DD. */
export function todayIso(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
