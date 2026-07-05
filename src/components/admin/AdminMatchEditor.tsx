"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

interface Partido {
  id: string;
  equipoLocal: string;
  equipoVisitante: string;
  fase: string;
  estado: string;
  golesLocal: number | null;
  golesVisitante: number | null;
}

interface Props {
  onSaved: () => void;
}

export function AdminMatchEditor({ onSaved }: Props) {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [selected, setSelected] = useState<Partido | null>(null);
  const [local, setLocal] = useState(0);
  const [visitante, setVisitante] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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
    setResult(null);
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
          </>
        )}

        {result && (
          <div className={`p-3 rounded-xl text-sm ${result.startsWith("✓") ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
