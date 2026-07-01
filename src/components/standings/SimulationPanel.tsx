"use client";

import { useState, useTransition } from "react";
import { Loader2, FlaskConical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTeamDisplay } from "@/lib/teams";
import { StandingsTable } from "@/components/standings/StandingsTable";
import type { PosicionTabla } from "@/types";

export interface PartidoSimulable {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  codigoLocal: string | null;
  codigoVisitante: string | null;
}

interface Props {
  tabla: PosicionTabla[];
  partidos: PartidoSimulable[];
}

/**
 * Modo simulación: el jugador ingresa un marcador hipotético para un partido
 * cerrado (en juego / bloqueado, sin resultado final) y ve cómo quedaría la
 * tabla. No escribe nada en la base; la tabla real no cambia.
 */
export function SimulationPanel({ tabla, partidos }: Props) {
  const [open, setOpen] = useState(false);
  const [partidoId, setPartidoId] = useState(partidos[0]?.id ?? "");
  const [local, setLocal] = useState(0);
  const [visitante, setVisitante] = useState(0);
  const [simulada, setSimulada] = useState<PosicionTabla[] | null>(null);
  const [puntosSimulados, setPuntosSimulados] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const partido = partidos.find((p) => p.id === partidoId);

  const simular = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/simulacion?partidoId=${partidoId}&gl=${local}&gv=${visitante}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Error al simular");
          return;
        }
        setSimulada(data.tabla);
        setPuntosSimulados(data.puntosSimulados ?? {});
      } catch {
        setError("Error de conexión");
      }
    });
  };

  const cerrar = () => {
    setOpen(false);
    setSimulada(null);
    setError(null);
  };

  return (
    <>
      {partidos.length > 0 && !open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full mb-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900 dark:hover:bg-violet-950/60 transition-colors"
        >
          <FlaskConical className="w-4 h-4" />
          Simular resultado
        </button>
      )}

      {open && (
        <div className="card p-4 mb-4 border-violet-200 dark:border-violet-900">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-violet-500" />
              Modo simulación
            </p>
            <button onClick={cerrar} aria-label="Cerrar simulación" className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {partidos.length > 1 && (
            <select
              value={partidoId}
              onChange={(e) => { setPartidoId(e.target.value); setSimulada(null); }}
              className="w-full mb-3 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200"
            >
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatTeamDisplay(p.equipoLocal, p.codigoLocal)} vs {formatTeamDisplay(p.equipoVisitante, p.codigoVisitante)}
                </option>
              ))}
            </select>
          )}

          {partido && (
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[90px] text-center">
                  {formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)}
                </span>
                <div className="flex items-center gap-2">
                  <button className="stepper-btn" onClick={() => { setLocal(Math.max(0, local - 1)); setSimulada(null); }} aria-label="Restar gol local">−</button>
                  <span className="text-2xl font-bold tabular-nums w-8 text-center dark:text-gray-100">{local}</span>
                  <button className="stepper-btn" onClick={() => { setLocal(Math.min(20, local + 1)); setSimulada(null); }} aria-label="Sumar gol local">+</button>
                </div>
              </div>

              <span className="text-gray-400 font-bold text-lg">–</span>

              <div className="flex flex-col items-center gap-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[90px] text-center">
                  {formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}
                </span>
                <div className="flex items-center gap-2">
                  <button className="stepper-btn" onClick={() => { setVisitante(Math.max(0, visitante - 1)); setSimulada(null); }} aria-label="Restar gol visitante">−</button>
                  <span className="text-2xl font-bold tabular-nums w-8 text-center dark:text-gray-100">{visitante}</span>
                  <button className="stepper-btn" onClick={() => { setVisitante(Math.min(20, visitante + 1)); setSimulada(null); }} aria-label="Sumar gol visitante">+</button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={simular}
            disabled={isPending || !partidoId}
            className={cn(
              "w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
              "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
            )}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simular"}
          </button>

          {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
        </div>
      )}

      {simulada && partido && (
        <div className="mb-2 px-4 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-xs text-violet-700 dark:text-violet-300">
          <span className="font-bold">Tabla simulada</span> — si{" "}
          {formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)} {local}–{visitante}{" "}
          {formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}. Los puntos en verde son los que ganaría cada jugador.
        </div>
      )}

      <StandingsTable
        tabla={simulada ?? tabla}
        puntosSimulados={simulada ? puntosSimulados : undefined}
      />
    </>
  );
}
