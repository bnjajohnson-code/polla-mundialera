/**
 * Control de cuándo conviene ejecutar los crons (sync y notificaciones).
 *
 * Motivo: Neon (la base de datos) cobra por el tiempo que el compute está
 * "despierto" y se duerme solo (scale-to-zero) tras ~5 min sin consultas.
 * Si un cron toca la base cada 5 min las 24 horas, nunca se duerme y se
 * agota el compute mensual. Estas decisiones se toman SOLO con la hora
 * (sin consultar la base), para que fuera de horario la base pueda dormir.
 */

// Ventana horaria (UTC) en la que pueden ocurrir partidos del Mundial 2026.
// Los kickoffs van ~19:00–03:00 UTC; con margen y la demora de la API el
// período relevante es 15:00–06:00 UTC. Fuera de eso no hay nada que sincronizar.
export function enVentanaPartidos(now: Date = new Date()): boolean {
  const h = now.getUTCHours();
  return h >= 15 || h < 6; // 15:00–06:00 UTC
}

// Aunque el cron dispare cada 5 min, limitamos el sync a ~1 corrida cada 10 min
// para que la base alcance a dormirse entre corridas dentro de la ventana.
// Corre en los bloques de 10 min (minutos 0-4, 10-14, 20-24, …) y omite el resto.
export function tocaSyncAhora(now: Date = new Date()): boolean {
  if (!enVentanaPartidos(now)) return false;
  return Math.floor(now.getUTCMinutes() / 5) % 2 === 0;
}
