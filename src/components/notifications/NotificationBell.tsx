"use client";

import { Bell, BellDot, Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  titulo: string;
  mensaje: string;
  leido: boolean;
  createdAt: string;
}

interface Props {
  /** "header" = ícono compacto (móvil) · "sidebar" = fila con texto (desktop) */
  variant?: "header" | "sidebar";
  className?: string;
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export function NotificationBell({ variant = "header", className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const cargar = () => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notificaciones ?? []);
        setNoLeidas(d.noLeidas ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    // Sin polling: una sola consulta al cargar la página (para mostrar el
    // contador de no leídas) y luego nada hasta que el usuario abra la campana.
    // Antes consultábamos en intervalo, lo que mantenía a Neon/Vercel ocupados
    // 24/7 con pestañas abiertas que nadie mira. Ahora una pestaña abandonada
    // hace 1 consulta al cargar y después cero.
    cargar();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const abrir = () => {
    setOpen((v) => !v);
    if (!open) cargar();
  };

  const marcarLeidas = async () => {
    await fetch("/api/notifications?all=true", { method: "PATCH" });
    setNotifs((n) => n.map((x) => ({ ...x, leido: true })));
    setNoLeidas(0);
  };

  const irA = (n: Notif) => {
    setOpen(false);
    // Resultado final o cambio de líder → tabla; faltantes/inicio → fixture
    const url = n.titulo.startsWith("🏁") || n.titulo.startsWith("👑") ? "/tabla" : "/fixture";
    router.push(url);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      {variant === "header" ? (
        <button onClick={abrir} className="relative p-1" aria-label="Notificaciones">
          {noLeidas > 0 ? (
            <>
              <BellDot className="w-6 h-6 text-primary-600" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            </>
          ) : (
            <Bell className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          )}
        </button>
      ) : (
        <button
          onClick={abrir}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          {noLeidas > 0 ? (
            <>
              <BellDot className="w-5 h-5 text-primary-600" />
              <span className="flex-1 text-left">Notificaciones</span>
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              <span className="flex-1 text-left">Notificaciones</span>
            </>
          )}
        </button>
      )}

      {open && (
        <div
          className={cn(
            "absolute z-50 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden",
            variant === "header" ? "right-0 mt-2" : "left-full bottom-0 ml-2"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {noLeidas > 0 && (
                <button onClick={marcarLeidas} className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Marcar leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-gray-600 text-sm">
                Sin notificaciones.
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => irA(n)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    !n.leido && "bg-blue-50 dark:bg-blue-950/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{n.titulo}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                      {tiempoRelativo(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.mensaje}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
