"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  partidoId: string;
  bloqueado: boolean;
  initialLocal?: number;
  initialVisitante?: number;
  equipoLocal: string;
  equipoVisitante: string;
  onSaved?: (local: number, visitante: number) => void;
}

export function PredictionStepper({
  partidoId,
  bloqueado,
  initialLocal,
  initialVisitante,
  equipoLocal,
  equipoVisitante,
  onSaved,
}: Props) {
  const router = useRouter();
  const [local, setLocal] = useState(initialLocal ?? 0);
  const [visitante, setVisitante] = useState(initialVisitante ?? 0);
  const [saved, setSaved] = useState(initialLocal !== undefined);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (bloqueado) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partidoId, golesLocal: local, golesVisitante: visitante }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Error al guardar");
          return;
        }
        setSaved(true);
        onSaved?.(local, visitante);
        router.refresh();
      } catch {
        setError("Error de conexión");
      }
    });
  };

  if (bloqueado) {
    if (initialLocal === undefined) {
      return (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Lock className="w-4 h-4" />
          <span>Sin pronóstico</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-gray-700 tabular-nums">
          {initialLocal} – {initialVisitante}
        </span>
        <Lock className="w-4 h-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Equipos + steppers */}
      <div className="flex items-center justify-center gap-4">
        {/* Local */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs text-gray-500 truncate max-w-[72px] text-center">
            {equipoLocal}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="stepper-btn"
              onClick={() => { setLocal(Math.max(0, local - 1)); setSaved(false); }}
              aria-label="Restar gol local"
            >
              −
            </button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{local}</span>
            <button
              className="stepper-btn"
              onClick={() => { setLocal(local + 1); setSaved(false); }}
              aria-label="Sumar gol local"
            >
              +
            </button>
          </div>
        </div>

        <span className="text-gray-400 font-bold text-lg">–</span>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-xs text-gray-500 truncate max-w-[72px] text-center">
            {equipoVisitante}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="stepper-btn"
              onClick={() => { setVisitante(Math.max(0, visitante - 1)); setSaved(false); }}
              aria-label="Restar gol visitante"
            >
              −
            </button>
            <span className="text-2xl font-bold tabular-nums w-8 text-center">{visitante}</span>
            <button
              className="stepper-btn"
              onClick={() => { setVisitante(visitante + 1); setSaved(false); }}
              aria-label="Sumar gol visitante"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={isPending}
        className={cn(
          "w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
          saved && !isPending
            ? "bg-green-50 text-green-700 border border-green-200"
            : "btn-primary"
        )}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="w-4 h-4" />
            Guardado
          </>
        ) : (
          "Guardar pronóstico"
        )}
      </button>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
