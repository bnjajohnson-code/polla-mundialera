/**
 * Cliente de la API secundaria worldcup26.ir (github.com/rezarahiminia/worldcup2026).
 * Se usa solo para live scores, porque el plan gratuito de football-data.org
 * entrega los resultados con horas de retraso. football-data.org sigue siendo
 * la fuente autoritativa: una vez que reporta un partido como finalizado,
 * esta fuente deja de tocarlo.
 */

const BASE_URL = "https://worldcup26.ir";

export interface Wc26Game {
  id: string;
  home_team_name_en: string | null;
  away_team_name_en: string | null;
  home_score: string | null;
  away_score: string | null;
  finished: string; // "TRUE" | "FALSE"
  time_elapsed: string; // "notstarted" | minutos | "finished"
  group: string | null;
  matchday: string | null;
  type: string; // "group" | "r32" | "r16" | "qf" | "sf" | "tp" | "f"
  local_date: string | null; // "MM/DD/YYYY HH:MM" en PDT (UTC-7)
}

// Nombre en inglés de worldcup26.ir → código TLA usado en nuestra BD (football-data)
const WC26_NAME_TO_TLA: Record<string, string> = {
  "Mexico": "MEX",
  "South Africa": "RSA",
  "South Korea": "KOR",
  "Czech Republic": "CZE",
  "Canada": "CAN",
  "Bosnia and Herzegovina": "BIH",
  "Qatar": "QAT",
  "Switzerland": "SUI",
  "Brazil": "BRA",
  "Morocco": "MAR",
  "Haiti": "HAI",
  "Scotland": "SCO",
  "United States": "USA",
  "Paraguay": "PAR",
  "Australia": "AUS",
  "Turkey": "TUR",
  "Germany": "GER",
  "Curaçao": "CUW",
  "Ivory Coast": "CIV",
  "Ecuador": "ECU",
  "Netherlands": "NED",
  "Japan": "JPN",
  "Sweden": "SWE",
  "Tunisia": "TUN",
  "Belgium": "BEL",
  "Egypt": "EGY",
  "Iran": "IRN",
  "New Zealand": "NZL",
  "Spain": "ESP",
  "Cape Verde": "CPV",
  "Saudi Arabia": "KSA",
  "Uruguay": "URY",
  "France": "FRA",
  "Senegal": "SEN",
  "Iraq": "IRQ",
  "Norway": "NOR",
  "Argentina": "ARG",
  "Algeria": "ALG",
  "Austria": "AUT",
  "Jordan": "JOR",
  "Portugal": "POR",
  "Democratic Republic of the Congo": "COD",
  "Uzbekistan": "UZB",
  "Colombia": "COL",
  "England": "ENG",
  "Croatia": "CRO",
  "Ghana": "GHA",
  "Panama": "PAN",
};

export function wc26NameToTla(name: string | null): string | null {
  if (!name) return null;
  return WC26_NAME_TO_TLA[name] ?? null;
}

/**
 * Obtiene los 104 partidos. Devuelve null si la API falla o no hay token,
 * para que el sync continúe solo con football-data.org.
 */
export async function fetchWc26Games(): Promise<Wc26Game[] | null> {
  const token = process.env.WORLDCUP26_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}/get/games`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error(`worldcup26.ir respondió ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data.games) ? data.games : null;
  } catch (err) {
    console.error("Error consultando worldcup26.ir:", err);
    return null;
  }
}

/** Estado del partido según worldcup26.ir */
export function wc26Estado(game: Wc26Game): "notstarted" | "en_juego" | "finalizado" {
  if (game.finished === "TRUE" || game.time_elapsed === "finished") return "finalizado";
  if (game.time_elapsed && game.time_elapsed !== "notstarted") return "en_juego";
  return "notstarted";
}

import type { FasePartido } from "@prisma/client";

const WC26_TYPE_TO_FASE: Record<string, FasePartido> = {
  r32: "dieciseisavos",
  r16: "octavos",
  qf:  "cuartos",
  sf:  "semifinal",
  tp:  "tercer_puesto",
  f:   "final",
};

export function wc26MapFase(type: string): FasePartido {
  return WC26_TYPE_TO_FASE[type] ?? "grupos";
}

/**
 * Convierte local_date de worldcup26.ir a UTC.
 * El campo está en PDT (UTC-7): se comprobó que Qatar vs Suiza
 * aparece como "06/13/2026 12:00" y la BD tiene 2026-06-13T19:00:00Z (+7h).
 */
export function wc26ParseDate(localDate: string | null): Date | null {
  if (!localDate) return null;
  const m = localDate.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, month, day, year, hour, min] = m.map(Number);
  const pdtMs = Date.UTC(year, month - 1, day, hour, min);
  return new Date(pdtMs + 7 * 60 * 60 * 1000); // PDT → UTC
}

export function wc26Score(game: Wc26Game): { home: number; away: number } | null {
  const home = parseInt(game.home_score ?? "", 10);
  const away = parseInt(game.away_score ?? "", 10);
  if (Number.isNaN(home) || Number.isNaN(away)) return null;
  return { home, away };
}
