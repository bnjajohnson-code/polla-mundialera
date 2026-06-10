"use client";

import Link from "next/link";
import { PredictionStepper } from "./PredictionStepper";
import {
  formatHoraPartido,
  tiempoHastaCierre,
  estaBlockeado,
  FASE_LABELS,
  cn,
} from "@/lib/utils";
import { formatTeamDisplay } from "@/lib/teams";
import { Clock, ChevronRight, Star } from "lucide-react";

interface Partido {
  id: string;
  fase: string;
  equipoLocal: string;
  equipoVisitante: string;
  codigoLocal: string | null;
  codigoVisitante: string | null;
  fechaHoraUtc: Date | string;
  estado: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  miPrediccion?: {
    golesLocal: number;
    golesVisitante: number;
    puntos: number | null;
  } | null;
}

interface Props {
  partido: Partido;
}

const ESTADO_BADGE: Record<string, { label: string; class: string }> = {
  programado: { label: "Próximo", class: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  en_juego: { label: "En juego", class: "bg-green-100 text-green-700 animate-pulse dark:bg-green-950 dark:text-green-400" },
  finalizado: { label: "Finalizado", class: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  aplazado: { label: "Aplazado", class: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" },
};

export function MatchCard({ partido }: Props) {
  const bloqueado = estaBlockeado(partido.fechaHoraUtc, partido.estado);
  const finalizado = partido.estado === "finalizado";
  const badge = ESTADO_BADGE[partido.estado] ?? ESTADO_BADGE.programado;
  const pred = partido.miPrediccion;
  const tienePronostico = pred !== null && pred !== undefined;

  return (
    <div className="card p-4">
      {/* Header: hora + estado */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatHoraPartido(partido.fechaHoraUtc)}</span>
          {!bloqueado && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              · cierra en {tiempoHastaCierre(partido.fechaHoraUtc)}
            </span>
          )}
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", badge.class)}>
          {badge.label}
        </span>
      </div>

      {/* Equipos + resultado real */}
      {finalizado ? (
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)}</p>
          </div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-2xl font-black tabular-nums dark:text-gray-100">{partido.golesLocal}</span>
            <span className="text-gray-400 dark:text-gray-600">–</span>
            <span className="text-2xl font-black tabular-nums dark:text-gray-100">{partido.golesVisitante}</span>
          </div>
          <div className="flex-1 text-right">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)}</p>
          <span className="text-gray-300 dark:text-gray-600 font-bold">vs</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm text-right">{formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}</p>
        </div>
      )}

      {/* Puntos obtenidos */}
      {finalizado && tienePronostico && (
        <div className="flex items-center justify-between mb-3 bg-primary-50 dark:bg-primary-950 rounded-lg px-3 py-2">
          <span className="text-sm text-primary-700 dark:text-primary-400">
            Mi pronóstico: <strong>{pred!.golesLocal} – {pred!.golesVisitante}</strong>
          </span>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-gold-500 fill-gold-400" />
            <span className="font-bold text-primary-900 dark:text-primary-200">{pred!.puntos ?? 0} pts</span>
          </div>
        </div>
      )}

      {/* Stepper (solo si el partido aún acepta pronósticos) */}
      {!bloqueado && (
        <PredictionStepper
          partidoId={partido.id}
          bloqueado={bloqueado}
          initialLocal={pred?.golesLocal}
          initialVisitante={pred?.golesVisitante}
          equipoLocal={partido.equipoLocal}
          equipoVisitante={partido.equipoVisitante}
        />
      )}

      {/* Pronóstico propio (bloqueado pero no finalizado) */}
      {bloqueado && !finalizado && tienePronostico && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
          Mi pronóstico: <strong className="text-gray-800 dark:text-gray-200">{pred!.golesLocal} – {pred!.golesVisitante}</strong>
        </div>
      )}

      {/* Link siempre visible */}
      <Link
        href={`/partido/${partido.id}`}
        className="flex items-center justify-center gap-1 text-sm text-primary-600 dark:text-primary-400 font-medium py-1 mt-1"
      >
        Ver pronósticos del grupo <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
