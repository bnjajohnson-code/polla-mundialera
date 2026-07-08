"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Loader2, Save, Clock } from "lucide-react";

interface Partido {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  fase: string;
  estado: string;
  golesLocal: number | null;
  golesVisitante: number | null;
  fechaHoraUtc: string;
}

interface Props {
  onSaved: () => void;
}

const TZ = "America/Santiago";

export function AdminMatchEditor({ onSaved }: Props) {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [selected, setSelected] = useState<Partido | null>(null);
  const [local, setLocal] = useState(0);
  const [visitante, setVisitante] = useState(0);
  const [horario, setHorario] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [horarioResult, setHorarioResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setPartidos(d.partidos ?? []))
      .catch(() => setResult("✗ No se pudo cargar la lista de partidos."));
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = partidos.find((x) => x.id === e.target.value) ?? null;
    setSelected(p);
    setLocal(p?.golesLocal ?? 0);
    setVisitante(p?.golesVisitante ?? 0);
    setHorario(p ? formatInTimeZone(new Date(p.fechaHoraUtc), TZ, "yyyy-MM-dd'T'HH:mm") : "");
    setResult(null);
    setHorarioResult(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/matches/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golesLocal: local, golesVisitante: visitante }),
      });
      const data = await res.json();
      setResult(data.ok ? "✓ Resultado guardado y puntos recalculados." : `✗ ${data.error}`);
      if (data.ok) onSaved();
    } catch {
      setResult("✗ Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHorario = async () => {
    if (!selected || !horario) return;
    setSavingHorario(true);
    setHorarioResult(null);
    try {
      const nuevaFechaUtc = fromZonedTime(horario, TZ).toISOString();
      const res = await fetch(`/api/admin/matches/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaHoraUtc: nuevaFechaUtc }),
      });
      const data = await res.json();
      setHorarioResult(data.ok ? "✓ Horario actualizado y jugadores notificados." : `✗ ${data.error}`);
      if (data.ok) onSaved();
    } catch {
      setHorarioResult("✗ Error de conexión.");
    } finally {
      setSavingHorario(false);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Editar resultado manualmente</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Usa esto si la API no trae el marcador correcto de 90 min.
        Al guardar se recalculan los puntos de todos los pronósticos.
      </p>

      <div className="space-y-3">
        <select className="input" onChange={handleSelect} defaultValue="">
          <option value="" disabled>Seleccionar partido…</option>
          {partidos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.equipoLocal} vs {p.equipoVisitante} ({p.fase})
            </option>
          ))}
        </select>

        {selected && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selected.equipoLocal}</p>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={local}
                  onChange={(e) => setLocal(Number(e.target.value))}
                  className="input text-center text-2xl font-bold w-20 mx-auto"
                />
              </div>
              <span className="text-2xl text-gray-400 dark:text-gray-600 font-bold">–</span>
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selected.equipoVisitante}</p>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={visitante}
                  onChange={(e) => setVisitante(Number(e.target.value))}
                  className="input text-center text-2xl font-bold w-20 mx-auto"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 w-full justify-center"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar resultado
            </button>

            {result && (
              <div className={`p-3 rounded-xl text-sm ${result.startsWith("✓") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"}`}>
                {result}
              </div>
            )}

            <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Corregir horario (ej. retraso por clima). Notifica a todos los jugadores al guardar.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="input flex-1"
                />
                <button
                  onClick={handleSaveHorario}
                  disabled={savingHorario || !horario}
                  className="btn-secondary flex items-center gap-2 shrink-0"
                >
                  {savingHorario ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  Guardar horario
                </button>
              </div>
              {horarioResult && (
                <div className={`mt-2 p-3 rounded-xl text-sm ${horarioResult.startsWith("✓") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"}`}>
                  {horarioResult}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
