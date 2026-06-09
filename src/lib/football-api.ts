/**
 * Integración con football-data.org
 *
 * Sobre regularTime vs fullTime:
 * - Para partidos de grupos, `score.fullTime` es el resultado final.
 * - Para eliminatorias con alargue: `score.regularTime` contiene el marcador a 90 min.
 *   Si `score.regularTime` existe, usamos eso; si no, usamos `score.fullTime`.
 * - Si hubo penales, el resultado que cuenta para la polla es el de `regularTime`.
 */

import type { FasePartido, EstadoPartido } from "@prisma/client";

const BASE_URL = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";

const HEADERS = {
  "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY ?? "",
};

export interface ApiMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | SUSPENDED | POSTPONED | CANCELLED
  stage: string;
  group: string | null;
  matchday: number | null;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    winner: string | null; // HOME_TEAM | AWAY_TEAM | DRAW | null
    duration: string;      // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    regularTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
}

interface ApiMatchesResponse {
  matches: ApiMatch[];
}

interface ApiStandingsResponse {
  standings: Array<{
    stage: string;
    type: string;
    group: string | null;
    table: Array<{
      position: number;
      team: { id: number; name: string; tla: string; crest: string };
    }>;
  }>;
}

export async function fetchMatches(): Promise<ApiMatch[]> {
  const url = `${BASE_URL}/competitions/${COMPETITION_CODE}/matches`;
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }

  const data: ApiMatchesResponse = await res.json();
  return data.matches;
}

export async function fetchMatch(externalId: number): Promise<ApiMatch> {
  const url = `${BASE_URL}/matches/${externalId}`;
  const res = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

// ─── Mapeo de stage de la API → FasePartido ──────────────────────────────────

const STAGE_MAP: Record<string, FasePartido> = {
  GROUP_STAGE: "grupos",
  ROUND_OF_16: "dieciseisavos",
  LAST_16: "dieciseisavos",
  QUARTER_FINALS: "octavos",
  SEMI_FINALS: "cuartos",
  THIRD_PLACE: "semifinal",
  FINAL: "final",
};

// Mundial 2026 tiene 48 equipos y nueva estructura:
// 12 grupos de 4, luego 32 equipos → R32, R16, QF, SF, 3rd place, Final
const STAGE_MAP_2026: Record<string, FasePartido> = {
  GROUP_STAGE: "grupos",
  // WC 2026 usa LAST_32 y LAST_16 (48 equipos → R32 → R16 → QF → SF → Final)
  LAST_32: "dieciseisavos",
  LAST_16: "octavos",
  ROUND_OF_32: "dieciseisavos",
  ROUND_OF_16: "octavos",
  QUARTER_FINALS: "cuartos",
  SEMI_FINALS: "semifinal",
  THIRD_PLACE: "tercer_puesto",
  FINAL: "final",
};

export function mapStage(stage: string): FasePartido {
  return STAGE_MAP_2026[stage] ?? STAGE_MAP[stage] ?? "grupos";
}

// ─── Mapeo de status de la API → EstadoPartido ───────────────────────────────

export function mapStatus(status: string): EstadoPartido {
  switch (status) {
    case "IN_PLAY":
    case "PAUSED":
      return "en_juego";
    case "FINISHED":
      return "finalizado";
    case "POSTPONED":
    case "CANCELLED":
    case "SUSPENDED":
      return "aplazado";
    default:
      return "programado";
  }
}

// ─── Extracción del marcador de 90 min ───────────────────────────────────────

/**
 * Devuelve el marcador a considerar para la polla (tiempo reglamentario).
 * Si el partido tuvo alargue o penales, retorna `regularTime` (marcador al 90').
 * Si solo fue a 90 min, retorna `fullTime`.
 */
export function getScoreRegular(
  score: ApiMatch["score"]
): { home: number | null; away: number | null } {
  const needsRegular =
    score.duration === "EXTRA_TIME" || score.duration === "PENALTY_SHOOTOUT";

  if (needsRegular && score.regularTime) {
    return score.regularTime;
  }

  return score.fullTime;
}

// ─── Descripción humana del estado ───────────────────────────────────────────

export function formatTeamName(team: ApiMatch["homeTeam"] | null): string {
  if (!team) return "Por definir";
  return team.shortName || team.name || "Por definir";
}

export function formatTeamCode(team: ApiMatch["homeTeam"] | null): string | null {
  if (!team) return null;
  return team.tla || null;
}
