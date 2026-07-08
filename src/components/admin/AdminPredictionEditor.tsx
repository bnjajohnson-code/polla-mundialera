"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Users } from "lucide-react";

interface Partido {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  fase: string;
}

interface Fila {
  userId: string;
  nombre: string;
  prediccion: { id: string; golesLocal: number; golesVisitante: number; puntos: number | null } | null;
}

export function AdminPredictionEditor() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [partidoId, setPartidoId] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { l: string; v: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setPartidos(d.partidos ?? []))
      .catch(() => {});
  }, []);

  const cargarJugadores = async (id: string) => {
    setPartidoId(id);
    setFilas([]);
    if (!id) return;
    setLoading(true);
    try {
      const d = await fetch(`/api/admin/predictions?partidoId=${id}`).then((r) => r.json());
      const fs: Fila[] = d.jugadores ?? [];
      setFilas(fs);
      const dr: Record<string, { l: string; v: string }> = {};
      fs.forEach((f) => {
        dr[f.userId] = {
          l: f.prediccion ? String(f.prediccion.golesLocal) : "",
          v: f.prediccion ? String(f.prediccion.golesVisitante) : "",
        };
      });
      setDrafts(dr);
    } catch {
      // Falla de red: la lista queda vacía pero el loading no se cuelga
    } finally {
      setLoading(false);
    }
  };

  const guardar = async (userId: string) => {
    const d = drafts[userId];
    if (!d || d.l === "" || d.v === "") return;
    setSavingId(userId);
    const res = await fetch("/api/admin/predictions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partidoId,
        userId,
        golesLocal: Number(d.l),
        golesVisitante: Number(d.v),
      }),
    });
    setSavingId(null);
    if (res.ok) {
      setSavedId(userId);
      setTimeout(() => setSavedId((s) => (s === userId ? null : s)), 2000);
      cargarJugadores(partidoId);
    }
  };

  const partido = partidos.find((p) => p.id === partidoId);

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Editar pronósticos de jugadores</h3>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Corrige el pronóstico de cualquier jugador. Si el partido ya finalizó, los puntos se recalculan al guardar.
      </p>

      <select
        className="input mb-3"
        value={partidoId}
        onChange={(e) => cargarJugadores(e.target.value)}
      >
        <option value="">Seleccionar partido…</option>
        {partidos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.equipoLocal} vs {p.equipoVisitante} ({p.fase})
          </option>
        ))}
      </select>

      {loading && (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      )}

      {!loading && partido && filas.length > 0 && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
            <span>Jugador</span>
            <span className="text-center w-[5.5rem]">{partido.equipoLocal.slice(0, 3)} – {partido.equipoVisitante.slice(0, 3)}</span>
            <span className="w-8"></span>
          </div>
          {filas.map((f) => (
            <div key={f.userId} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{f.nombre}</p>
                {f.prediccion?.puntos != null && (
                  <p className="text-[11px] text-gray-400">{f.prediccion.puntos} pts</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={30}
                  className="input w-10 text-center px-1 py-1.5 text-sm"
                  value={drafts[f.userId]?.l ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [f.userId]: { ...d[f.userId], l: e.target.value } }))}
                />
                <span className="text-gray-400">–</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  className="input w-10 text-center px-1 py-1.5 text-sm"
                  value={drafts[f.userId]?.v ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [f.userId]: { ...d[f.userId], v: e.target.value } }))}
                />
              </div>
              <button
                onClick={() => guardar(f.userId)}
                disabled={savingId === f.userId || !drafts[f.userId]?.l || !drafts[f.userId]?.v}
                className="p-2 rounded-lg text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 transition-colors"
                title="Guardar"
              >
                {savingId === f.userId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedId === f.userId ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4 opacity-60" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
