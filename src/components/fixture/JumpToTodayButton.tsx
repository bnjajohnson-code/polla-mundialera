"use client";

import { CalendarClock } from "lucide-react";

/**
 * Botón flotante que hace scroll al primer partido del día actual
 * (ancla #fixture-hoy renderizada en el servidor). Si no existe el ancla,
 * no renderiza nada.
 */
export function JumpToTodayButton({ label = "Hoy" }: { label?: string }) {
  const handleClick = () => {
    const el = document.getElementById("fixture-hoy");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      onClick={handleClick}
      className="pressable fixed right-4 lg:bottom-8 z-30 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm pl-3 pr-4 py-3 rounded-full shadow-lg shadow-primary-600/30"
      style={{ bottom: 'calc(5.5rem + var(--safe-area-inset-bottom))' }}
      aria-label="Ir a los partidos de hoy"
    >
      <CalendarClock className="w-5 h-5" />
      {label}
    </button>
  );
}
