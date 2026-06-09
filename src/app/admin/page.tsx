"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2, RefreshCw, Trash2, Copy, Check, Save } from "lucide-react";
import { AdminMatchEditor } from "@/components/admin/AdminMatchEditor";

interface User {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  createdAt: string;
  _count: { predicciones: number };
}

interface Config {
  id: string;
  nombrePolla: string;
  codigoInvitacion: string;
}

interface SyncResult {
  ok: boolean;
  creados?: number;
  actualizados?: number;
  total?: number;
  error?: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [nombrePolla, setNombrePolla] = useState("");
  const [codigoEditable, setCodigoEditable] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingCodigo, setSavingCodigo] = useState(false);
  const [codigoResult, setCodigoResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "admin") {
      router.push("/fixture");
      return;
    }
    loadData();
  }, [session, status, router]);

  const loadData = async () => {
    const [usersRes, configRes] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]);
    setUsers(usersRes.users ?? []);
    setConfig(configRes.config ?? null);
    setNombrePolla(configRes.config?.nombrePolla ?? "");
    setCodigoEditable(configRes.config?.codigoInvitacion ?? "");
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok) loadData();
    } catch {
      setSyncResult({ ok: false, error: "Error de conexión" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteUser = async (userId: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
    setUsers((u) => u.filter((x) => x.id !== userId));
  };

  const handleCopyCode = () => {
    if (!config) return;
    navigator.clipboard.writeText(config.codigoInvitacion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenCode = async () => {
    if (!confirm("¿Regenerar el código? El código anterior dejará de funcionar.")) return;
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerarCodigo: true }),
    });
    const data = await res.json();
    setConfig(data.config);
    setCodigoEditable(data.config?.codigoInvitacion ?? "");
  };

  const handleSaveCodigo = async () => {
    const codigo = codigoEditable.toUpperCase().trim();
    if (codigo.length < 4) return;
    setSavingCodigo(true);
    setCodigoResult(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigoInvitacion: codigo }),
    });
    const data = await res.json();
    setSavingCodigo(false);
    if (data.config) {
      setConfig(data.config);
      setCodigoEditable(data.config.codigoInvitacion);
      setCodigoResult("✓ Código actualizado");
    } else {
      setCodigoResult("✗ " + (data.error ?? "Error"));
    }
    setTimeout(() => setCodigoResult(null), 3000);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombrePolla }),
    });
    setSavingConfig(false);
    setConfig((c) => c ? { ...c, nombrePolla } : c);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <AppShell title="Panel de Administración">
      {/* Sincronización */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Sincronización de Resultados</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Actualiza el fixture y resultados desde football-data.org. Se ejecuta automáticamente cada 15 min.
        </p>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Sincronizando..." : "Sincronizar ahora"}
        </button>

        {syncResult && (
          <div className={`mt-3 p-3 rounded-xl text-sm ${syncResult.ok ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400"}`}>
            {syncResult.ok
              ? `✓ Sincronizado: ${syncResult.creados} creados, ${syncResult.actualizados} actualizados (${syncResult.total} total)`
              : `✗ Error: ${syncResult.error}`}
          </div>
        )}
      </div>

      {/* Editar resultado manual */}
      <AdminMatchEditor onSaved={loadData} />

      {/* Configuración de la polla */}
      {config && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Configuración</h3>

          <div className="space-y-3">
            <div>
              <label className="label">Nombre de la polla</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  value={nombrePolla}
                  onChange={(e) => setNombrePolla(e.target.value)}
                />
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="btn-secondary flex items-center gap-1 shrink-0"
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Código de invitación</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono font-bold text-lg tracking-widest text-center uppercase"
                  value={codigoEditable}
                  onChange={(e) => setCodigoEditable(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  maxLength={20}
                  placeholder="Ej: MUNDIAL26"
                />
                <button
                  onClick={handleSaveCodigo}
                  disabled={savingCodigo || codigoEditable.length < 4}
                  className="btn-secondary flex items-center gap-1 shrink-0"
                >
                  {savingCodigo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleCopyCode}
                  className="btn-secondary flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {codigoResult && (
                <p className={`text-xs mt-1 ${codigoResult.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {codigoResult}
                </p>
              )}
              <button
                onClick={handleRegenCode}
                className="text-xs text-red-500 dark:text-red-400 mt-2 underline"
              >
                Generar código aleatorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
            Jugadores ({users.length})
          </h3>
        </div>
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{user.nombre}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{user._count.predicciones} pronósticos</p>
            </div>
            {user.rol === "admin" && (
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full shrink-0">
                Admin
              </span>
            )}
            {user.rol !== "admin" && (
              <button
                onClick={() => handleDeleteUser(user.id, user.nombre)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
