"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, X } from "lucide-react";

const DISMISS_KEY = "push_prompt_dismissed";

export function PushPromptBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // No mostrar si el navegador no soporta push
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    // No mostrar si ya descartó
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Comprobar si ya está suscrito en este dispositivo
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => { if (!sub) setVisible(true); })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const activate = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;

    setLoading(true);
    try {
      const padding = "=".repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, "+").replace(/_/g, "/");
      const raw = window.atob(base64);
      const key = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer,
      });
      const sub = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    } catch {
      dismiss();
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 rounded-xl p-3 flex items-start gap-3 mb-4">
      <Bell className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {done ? (
          <p className="text-sm text-primary-700 dark:text-primary-300 font-medium">
            ✓ Notificaciones activadas
          </p>
        ) : (
          <>
            <p className="text-sm text-primary-800 dark:text-primary-300 font-medium">
              Activa las notificaciones push
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 mb-2">
              Recibe avisos de partidos y recordatorios de pronósticos.
            </p>
            <button
              onClick={activate}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
              {loading ? "Activando..." : "Activar ahora"}
            </button>
          </>
        )}
      </div>
      {!done && (
        <button onClick={dismiss} className="shrink-0 p-0.5 text-primary-400 hover:text-primary-600">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
