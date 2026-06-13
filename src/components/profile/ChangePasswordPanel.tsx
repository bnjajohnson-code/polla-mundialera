"use client";

import { useState } from "react";
import { KeyRound, Loader2, Eye, EyeOff, Check } from "lucide-react";

export function ChangePasswordPanel() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (nueva !== confirmar) { setError("Las contraseñas nuevas no coinciden"); return; }
    if (nueva.length < 6) { setError("La nueva contraseña debe tener al menos 6 caracteres"); return; }

    setSaving(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.ok) {
      setSuccess(true);
      setActual(""); setNueva(""); setConfirmar("");
      setTimeout(() => setSuccess(false), 4000);
    } else {
      setError(data.error ?? "Error al cambiar contraseña");
    }
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <h3 className="font-bold text-gray-800 dark:text-gray-200">Cambiar contraseña</h3>
      </div>

      {success ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm py-2">
          <Check className="w-4 h-4" />
          Contraseña actualizada correctamente
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Contraseña actual</label>
            <div className="relative">
              <input
                type={showActual ? "text" : "password"}
                className="input w-full pr-10"
                value={actual}
                onChange={(e) => { setActual(e.target.value); setError(""); }}
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowActual((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showNueva ? "text" : "password"}
                className="input w-full pr-10"
                value={nueva}
                onChange={(e) => { setNueva(e.target.value); setError(""); }}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button type="button" onClick={() => setShowNueva((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">Confirmar nueva contraseña</label>
            <input
              type="password"
              className="input w-full"
              value={confirmar}
              onChange={(e) => { setConfirmar(e.target.value); setError(""); }}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving || !actual || !nueva || !confirmar}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {saving ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}
