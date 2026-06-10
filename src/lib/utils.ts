import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ_SANTIAGO = "America/Santiago";

export function toSantiago(date: Date | string): Date {
  return new Date(
    new Date(date).toLocaleString("en-US", { timeZone: TZ_SANTIAGO })
  );
}

export function formatFechaPartido(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ_SANTIAGO, "EEEE d 'de' MMMM", {
    locale: es,
  });
}

export function formatHoraPartido(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ_SANTIAGO, "HH:mm", {
    locale: es,
  });
}

export function formatFechaHora(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ_SANTIAGO, "d MMM · HH:mm", {
    locale: es,
  });
}

/** Retorna cuánto tiempo falta hasta una fecha (texto legible). */
export function tiempoRestante(date: Date | string): string {
  const ahora = Date.now();
  const target = new Date(date).getTime();
  const diff = target - ahora;

  if (diff <= 0) return "Iniciado";

  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (horas > 48) {
    const dias = Math.floor(horas / 24);
    return `${dias}d`;
  }
  if (horas > 0) return `${horas}h ${minutos}m`;
  return `${minutos}m`;
}

/** Capitaliza la primera letra. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const FASE_LABELS: Record<string, string> = {
  grupos: "Fase de Grupos",
  dieciseisavos: "Ronda de 32",
  octavos: "Octavos de Final",
  cuartos: "Cuartos de Final",
  semifinal: "Semifinales",
  tercer_puesto: "3er y 4to Puesto",
  final: "Final",
};

export const FASE_ORDER: Record<string, number> = {
  grupos: 1,
  dieciseisavos: 2,
  octavos: 3,
  cuartos: 4,
  semifinal: 5,
  tercer_puesto: 6,
  final: 7,
};

/** URL de la bandera de un país por código ISO 3166-1 alpha-2. */
export function flagUrl(countryCode: string): string {
  const code = countryCode.toLowerCase();
  return `https://flagcdn.com/w40/${code}.png`;
}

/** Verifica si un partido está bloqueado (ya inició o está en juego/finalizado). */
const MINUTOS_ANTES_CIERRE = 10;

export function estaBlockeado(fechaHoraUtc: Date | string, estado: string): boolean {
  if (estado === "en_juego" || estado === "finalizado" || estado === "aplazado") {
    return true;
  }
  const cierreMs = new Date(fechaHoraUtc).getTime() - MINUTOS_ANTES_CIERRE * 60 * 1000;
  return Date.now() >= cierreMs;
}

/** Tiempo restante hasta el cierre de predicciones (10 min antes del inicio). */
export function tiempoHastaCierre(fechaHoraUtc: Date | string): string {
  const cierre = new Date(fechaHoraUtc).getTime() - MINUTOS_ANTES_CIERRE * 60 * 1000;
  if (Date.now() >= cierre) return "Cerrado";
  return tiempoRestante(new Date(cierre));
}
