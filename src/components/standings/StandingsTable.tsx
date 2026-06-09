"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PosicionTabla } from "@/types";
import { useSession } from "next-auth/react";

interface Props {
  tabla: PosicionTabla[];
}

export function StandingsTable({ tabla }: Props) {
  const { data: session } = useSession();

  return (
    <div className="card overflow-hidden">
      {/* Encabezado */}
      <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <span>#</span>
        <span>Jugador</span>
        <span className="text-center">Pts</span>
        <span className="text-center" title="Achuntes">⭐</span>
        <span className="text-center" title="Resultados">✓</span>
      </div>

      {tabla.map((row, i) => {
        const isMe = session?.user?.id === row.userId;
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

        return (
          <Link
            key={row.userId}
            href={`/jugador/${row.userId}`}
            className={cn(
              "grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-3 items-center",
              "border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
              isMe && "bg-primary-50 dark:bg-primary-950 hover:bg-primary-50 dark:hover:bg-primary-950"
            )}
          >
            {/* Posición */}
            <div className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {medal ?? row.posicion}
              {row.cambio > 0 && <TrendingUp className="w-3 h-3 text-green-500" />}
              {row.cambio < 0 && <TrendingDown className="w-3 h-3 text-red-400" />}
              {row.cambio === 0 && i >= 3 && <Minus className="w-3 h-3 text-gray-300 dark:text-gray-600" />}
            </div>

            {/* Nombre */}
            <div className="min-w-0">
              <p className={cn("font-semibold text-sm truncate text-gray-900 dark:text-gray-100", isMe && "text-primary-700 dark:text-primary-400")}>
                {row.nombre} {isMe && <span className="text-xs font-normal">(tú)</span>}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{row.partidosConPronostico} pronósticos</p>
            </div>

            {/* Puntos */}
            <div className="text-center">
              <span className={cn("font-black text-base tabular-nums text-gray-900 dark:text-gray-100", isMe && "text-primary-700 dark:text-primary-400")}>
                {row.puntosTotales}
              </span>
            </div>

            {/* Plenos */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {row.plenos}
            </div>

            {/* Aciertos resultado */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400 tabular-nums">
              {row.aciertosResultado}
            </div>
          </Link>
        );
      })}

      {tabla.length === 0 && (
        <div className="py-12 text-center text-gray-400 dark:text-gray-600">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aún no hay puntos registrados.</p>
        </div>
      )}
    </div>
  );
}
