"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Wallet } from "lucide-react";

interface Jugador {
  id: string;
  nombre: string;
  pagado: boolean;
}

export function TreasuryPanel() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then((d) => setJugadores(d.jugadores ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePagado = async (id: string, pagado: boolean) => {
    setSavingId(id);
    // Optimista
    setJugadores((js) => js.map((j) => (j.id === id ? { ...j, pagado } : j)));
    const res = await fetch("/api/treasury", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, pagado }),
    });
    if (!res.ok) {
      // Revertir si falla
      setJugadores((js) => js.map((j) => (j.id === id ? { ...j, pagado: !pagado } : j)));
    }
    setSavingId(null);
  };

  const pagados = jugadores.filter((j) => j.pagado).length;

  return (
    <div className="card overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Tesorería · Pagos del pozo</h3>
        </div>
        {!loading && (
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {pagados}/{jugadores.length} pagados
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {jugadores.map((j) => (
            <label
              key={j.id}
              className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className={`text-sm ${j.pagado ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-500 dark:text-gray-400"}`}>
                {j.nombre}
              </span>
              <span className="flex items-center gap-2">
                {savingId === j.id && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                <input
                  type="checkbox"
                  checked={j.pagado}
                  onChange={(e) => togglePagado(j.id, e.target.checked)}
                  disabled={savingId === j.id}
                  className="sr-only peer"
                />
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    j.pagado
                      ? "bg-green-500 border-green-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {j.pagado && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </span>
              </span>
            </label>
          ))}
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 text-center">
            Pozo recaudado: <strong className="text-gray-700 dark:text-gray-200">${(pagados * 10000).toLocaleString("es-CL")}</strong> de ${(jugadores.length * 10000).toLocaleString("es-CL")}
          </div>
        </>
      )}
    </div>
  );
}
