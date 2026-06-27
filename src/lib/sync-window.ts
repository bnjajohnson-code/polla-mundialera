// Ventana horaria (UTC) en la que pueden ocurrir partidos del Mundial 2026.
// Los kickoffs van ~19:00–03:00 UTC; con margen y la demora de la API el
// período relevante es 15:00–06:00 UTC. Fuera de eso no hay nada que sincronizar.
export function enVentanaPartidos(now: Date = new Date()): boolean {
  const h = now.getUTCHours();
  return h >= 15 || h < 6; // 15:00–06:00 UTC
}

// Corre el sync si estamos en ventana de partidos.
// (El throttle de 10 min fue eliminado al migrar a Supabase, que no cobra compute-hours.)
export function tocaSyncAhora(now: Date = new Date()): boolean {
  return enVentanaPartidos(now);
}
