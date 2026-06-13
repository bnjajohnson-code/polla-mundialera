"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, BellOff, LogOut, User, Star, Trophy, Target, Loader2, Pencil, Check, X } from "lucide-react";
import { PushNotifications } from "@/components/notifications/PushNotifications";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { TreasuryPanel } from "@/components/profile/TreasuryPanel";
import { ChangePasswordPanel } from "@/components/profile/ChangePasswordPanel";

interface Prefs {
  emailEnabled: boolean;
  pushEnabled: boolean;
  avisoInicio: boolean;
  avisoFaltante24h: boolean;
  avisoFaltante2h: boolean;
}

interface Notif {
  id: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  createdAt: string;
}

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ puntos: 0, plenos: 0, jugados: 0 });
  const [editingNombre, setEditingNombre] = useState(false);
  const [nombreDraft, setNombreDraft] = useState("");
  const [nombreActual, setNombreActual] = useState("");
  const [nombreError, setNombreError] = useState("");
  const [savingNombre, setSavingNombre] = useState(false);
  const [esTesorero, setEsTesorero] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.name) setNombreActual(session.user.name);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.notifPrefs) setPrefs(d.user.notifPrefs);
        setEsTesorero(d.user?.esTesorero ?? false);
        const preds = d.user?.predicciones ?? [];
        const fin = preds.filter((p: { partido: { estado: string } }) => p.partido.estado === "finalizado");
        const pts = fin.reduce((s: number, p: { puntos: number | null }) => s + (p.puntos ?? 0), 0);
        const maxPts = (fase: string) => fase === "grupos" ? 10 : 20;
        const ple = fin.filter((p: { puntos: number | null; partido: { fase: string } }) => p.puntos === maxPts(p.partido.fase)).length;
        setStats({ puntos: pts, plenos: ple, jugados: fin.length });
      });
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifs(d.notificaciones ?? []));
  }, [session]);

  const updatePref = async (key: keyof Prefs, value: boolean) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
    setSaving(false);
  };

  const startEditNombre = () => {
    setNombreDraft(nombreActual);
    setNombreError("");
    setEditingNombre(true);
  };

  const cancelEditNombre = () => {
    setEditingNombre(false);
    setNombreError("");
  };

  const saveNombre = async () => {
    const trimmed = nombreDraft.trim();
    if (trimmed.length < 2) { setNombreError("Mínimo 2 caracteres"); return; }
    if (trimmed.length > 40) { setNombreError("Máximo 40 caracteres"); return; }
    setSavingNombre(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: trimmed }),
    });
    setSavingNombre(false);
    if (res.ok) {
      setNombreActual(trimmed);
      setEditingNombre(false);
    } else {
      const d = await res.json();
      setNombreError(d.error ?? "Error al guardar");
    }
  };

  const marcarLeidas = async () => {
    await fetch("/api/notifications?all=true", { method: "PATCH" });
    setNotifs((n) => n.map((x) => ({ ...x, leido: true })));
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <AppShell title="Mi Perfil">
      {/* Avatar / Info */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            {editingNombre ? (
              <div className="space-y-1.5">
                <input
                  className="input w-full text-sm font-bold"
                  value={nombreDraft}
                  onChange={(e) => { setNombreDraft(e.target.value); setNombreError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNombre(); if (e.key === "Escape") cancelEditNombre(); }}
                  maxLength={40}
                  autoFocus
                />
                {nombreError && <p className="text-xs text-red-500">{nombreError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={saveNombre}
                    disabled={savingNombre}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {savingNombre ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Guardar
                  </button>
                  <button
                    onClick={cancelEditNombre}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg"
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate">{nombreActual || session.user.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{session.user.email}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {session.user.role === "admin" && (
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                    {esTesorero && (
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">
                        💰 Tesorero
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={startEditNombre}
                  className="ml-auto flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Cambiar nombre"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-3 text-center">
          <Trophy className="w-5 h-5 text-primary-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-primary-900 dark:text-primary-300">{stats.puntos}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Puntos</p>
        </div>
        <div className="card p-3 text-center">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.plenos}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Achuntes</p>
        </div>
        <div className="card p-3 text-center">
          <Target className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.jugados}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Jugados</p>
        </div>
      </div>

      {/* Apariencia */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Apariencia</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Modo oscuro</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Cambiar el tema de la aplicación</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Notificaciones preferencias */}
      {prefs && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Notificaciones</h3>
            {saving && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>

          <div className="space-y-3">
            {([
              { key: "avisoInicio", label: "Inicio de partido (1h antes)", desc: "Para todos los partidos" },
              { key: "avisoFaltante24h", label: "Pronóstico pendiente (24h)", desc: "Si no has completado tu predicción" },
              { key: "avisoFaltante2h", label: "Pronóstico pendiente (2h)", desc: "Recordatorio urgente" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
                </div>
                <button
                  onClick={() => updatePref(key, !prefs[key])}
                  className={`w-11 h-6 rounded-full transition-colors ${prefs[key] ? "bg-primary-600" : "bg-gray-200 dark:bg-gray-700"} flex items-center px-0.5`}
                >
                  <span
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${prefs[key] ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            ))}
          </div>

          {/* Web Push */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <PushNotifications pushEnabled={prefs.pushEnabled} />
          </div>
        </div>
      )}

      {/* Cambio de contraseña */}
      <ChangePasswordPanel />

      {/* Panel de tesorería (solo admin y tesorero) */}
      {(session.user.role === "admin" || esTesorero) && <TreasuryPanel />}

      {/* Historial de notificaciones */}
      <div className="card overflow-hidden mb-4" id="notificaciones">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Notificaciones recientes</h3>
          {notifs.some((n) => !n.leido) && (
            <button onClick={marcarLeidas} className="text-xs text-primary-600 dark:text-primary-400 font-medium">
              Marcar todas como leídas
            </button>
          )}
        </div>
        {notifs.length === 0 ? (
          <div className="py-8 text-center text-gray-400 dark:text-gray-600 text-sm">Sin notificaciones.</div>
        ) : (
          notifs.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${!n.leido ? "bg-blue-50 dark:bg-blue-950/50" : ""}`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.titulo}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.mensaje}</p>
            </div>
          ))
        )}
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full flex items-center justify-center gap-2 py-3 text-red-600 dark:text-red-400 font-semibold text-sm border border-red-200 dark:border-red-900 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </AppShell>
  );
}
