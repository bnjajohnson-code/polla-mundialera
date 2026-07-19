"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "campeon_modal_dismissed";
const MEDALLAS = ["🥇", "🥈", "🥉"];

type Props = {
  podio: Array<{
    userId: string;
    nombre: string;
    puntosTotales: number;
    plenos: number;
  }>;
};

export function CampeonModal({ podio }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No mostrar si ya descartó (el torneo termina una sola vez)
    if (localStorage.getItem(DISMISS_KEY)) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const campeon = podio[0];
  if (!visible || !campeon) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campeon-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center page-enter
                   bg-gradient-to-b from-yellow-50 to-amber-50 dark:from-yellow-950/90 dark:to-amber-950/90
                   border border-yellow-200 dark:border-yellow-900 dark:bg-gray-900"
      >
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute top-3 right-3 p-1 text-yellow-500 hover:text-yellow-700 dark:text-yellow-600 dark:hover:text-yellow-400"
        >
          <X className="w-5 h-5" />
        </button>

        <p className="text-6xl mb-2">🏆</p>
        <h2 id="campeon-titulo" className="text-xl font-black text-gray-900 dark:text-gray-100 mb-1">
          🎉 ¡Tenemos campeón! 🎉
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Se jugaron todos los partidos del mundial
        </p>

        <div className="mb-4">
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
            🥇 {campeon.nombre}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {campeon.puntosTotales} puntos · {campeon.plenos} achuntes
          </p>
        </div>

        {podio.length > 1 && (
          <div className="mb-5 space-y-1.5">
            {podio.slice(1).map((p, i) => (
              <div
                key={p.userId}
                className="flex items-center justify-between px-4 py-1.5 rounded-xl bg-white/60 dark:bg-black/20"
              >
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {MEDALLAS[i + 1]} {p.nombre}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {p.puntosTotales} pts
                </span>
              </div>
            ))}
          </div>
        )}

        <Link href="/tabla" onClick={dismiss} className="btn-primary pressable block w-full">
          Ver tabla
        </Link>
      </div>
    </div>
  );
}
