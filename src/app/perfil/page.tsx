"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Bell, BellOff, LogOut, User, Star, Trophy, Target, Loader2 } from "lucide-react";
import { PushNotifications } from "@/components/notifications/PushNotifications";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

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

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/profile?id=${session.user.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.notifPrefs) setPrefs(d.user.notifPrefs);
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
          <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <User className="w-7 h-7 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{session.user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{session.user.email}</p>
            {session.user.role === "admin" && (
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full">
                Admin
              </span>
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
              { key: "emailEnabled", label: "Email", desc: "Recibir avisos por email" },
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
