import type { FasePartido, EstadoPartido } from "@prisma/client";

const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const WC_DATES = "20260611-20260719";

export interface EspnCompetitor {
  homeAway: "home" | "away";
  score: string | null;
  team: { abbreviation: string; displayName: string };
}

export interface EspnEvent {
  id: string;
  date: string;
  season: { slug: string };
  status: { type: { name: string } };
  competitions: [{ competitors: EspnCompetitor[] }];
}

const SLUG_TO_FASE: Record<string, FasePartido> = {
  "group-stage":    "grupos",
  "round-of-32":   "dieciseisavos",
  "round-of-16":   "octavos",
  "quarterfinals":  "cuartos",
  "semifinals":     "semifinal",
  "3rd-place-match":"tercer_puesto",
  "final":          "final",
};

export function espnMapFase(slug: string): FasePartido {
  return SLUG_TO_FASE[slug] ?? "grupos";
}

export function espnMapStatus(name: string): EstadoPartido {
  switch (name) {
    case "STATUS_IN_PROGRESS":
    case "STATUS_HALFTIME":
      return "en_juego";
    case "STATUS_FULL_TIME":
    case "STATUS_FINAL":
    case "STATUS_FINAL_OT":
    case "STATUS_FINAL_PK":
      return "finalizado";
    case "STATUS_POSTPONED":
    case "STATUS_CANCELLED":
    case "STATUS_SUSPENDED":
      return "aplazado";
    default:
      return "programado";
  }
}

// TLAs con dígitos son placeholders (RD32, 2J, 3RD, QFW1, SFW1, etc.)
export function esPlaceholderTla(tla: string): boolean {
  return /\d/.test(tla);
}

export function espnHomeTeam(e: EspnEvent): EspnCompetitor | undefined {
  return e.competitions?.[0]?.competitors?.find(c => c.homeAway === "home");
}

export function espnAwayTeam(e: EspnEvent): EspnCompetitor | undefined {
  return e.competitions?.[0]?.competitors?.find(c => c.homeAway === "away");
}

export function espnScore(e: EspnEvent): { home: number | null; away: number | null } {
  const estado = espnMapStatus(e.status.type.name);
  if (estado === "programado") return { home: null, away: null };
  const h = parseInt(espnHomeTeam(e)?.score ?? "", 10);
  const a = parseInt(espnAwayTeam(e)?.score ?? "", 10);
  if (isNaN(h) || isNaN(a)) return { home: null, away: null };
  return { home: h, away: a };
}

export async function fetchEspnMatches(): Promise<EspnEvent[]> {
  const res = await fetch(`${ESPN_URL}?limit=200&dates=${WC_DATES}`, {
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`ESPN API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.events) ? data.events : [];
}
