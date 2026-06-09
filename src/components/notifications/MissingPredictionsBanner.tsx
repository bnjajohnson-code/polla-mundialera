"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

export function MissingPredictionsBanner() {
  const [faltantes, setFaltantes] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/predictions/missing")
      .then((r) => r.json())
      .then((d) => setFaltantes(d.count ?? 0))
      .catch(() => {});
  }, []);

  if (dismissed || faltantes === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-3 mb-4">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
          Te {faltantes === 1 ? "falta" : "faltan"}{" "}
          <strong>{faltantes} pronóstico{faltantes > 1 ? "s" : ""}</strong>{" "}
          para partidos próximos
        </p>
        <Link href="/fixture" className="text-xs text-amber-700 dark:text-amber-400 underline font-medium">
          Completar ahora →
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 p-0.5 text-amber-400 hover:text-amber-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
