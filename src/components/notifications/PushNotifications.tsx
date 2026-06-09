"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

interface Props {
  pushEnabled: boolean;
}

export function PushNotifications({ pushEnabled: initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      output[i] = rawData.charCodeAt(i);
    }
    return output.buffer;
  };

  const subscribe = async () => {
    if (!vapidKey) {
      setError("Push no configurado (falta VAPID key).");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const sub = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });

      setEnabled(true);
    } catch (err) {
      setError("No se pudo activar las notificaciones push.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch(
          `/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`,
          { method: "DELETE" }
        );
      }
      setEnabled(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return (
      <p className="text-xs text-gray-400">
        Tu navegador no soporta notificaciones push.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Notificaciones push</p>
          <p className="text-xs text-gray-400">
            {enabled ? "Activadas en este dispositivo" : "Recibe avisos aunque no tengas la app abierta"}
          </p>
        </div>
        <button
          onClick={enabled ? unsubscribe : subscribe}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            enabled
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : enabled ? (
            <><BellOff className="w-4 h-4" /> Desactivar</>
          ) : (
            <><Bell className="w-4 h-4" /> Activar</>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
