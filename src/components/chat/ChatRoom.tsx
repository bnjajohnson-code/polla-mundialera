"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Send, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mensaje {
  id: string;
  texto: string;
  createdAt: string;
  user: { id: string; nombre: string };
}

const POLL_MS = 4000;

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

export function ChatRoom() {
  const { data: session } = useSession();
  const miId = session?.user?.id;
  const esAdmin = session?.user?.role === "admin";

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const estaAlFondo = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const cargar = useCallback(async (forzarScroll = false) => {
    try {
      const fondoAntes = estaAlFondo();
      const d = await fetch("/api/chat").then((r) => r.json());
      setMensajes(d.mensajes ?? []);
      // Mantener pegado al fondo si el usuario ya estaba ahí
      if (forzarScroll || fondoAntes) {
        requestAnimationFrame(() => finRef.current?.scrollIntoView({ block: "end" }));
      }
    } catch {
      /* silencioso */
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar(true);
    const t = setInterval(() => {
      if (!document.hidden) cargar();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: t }),
    });
    setEnviando(false);
    if (res.ok) {
      setTexto("");
      await cargar(true);
    }
  };

  const borrar = async (id: string) => {
    if (!confirm("¿Borrar este mensaje?")) return;
    setMensajes((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/chat?id=${id}`, { method: "DELETE" });
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-11rem)]">
      {/* Mensajes */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
        {cargando ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : mensajes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-sm">Aún no hay mensajes. ¡Rompe el hielo!</p>
          </div>
        ) : (
          mensajes.map((m, i) => {
            const mio = m.user.id === miId;
            const prev = mensajes[i - 1];
            const mismoAutor = prev && prev.user.id === m.user.id;
            return (
              <div key={m.id} className={cn("flex flex-col", mio ? "items-end" : "items-start")}>
                {!mismoAutor && !mio && (
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-0.5">
                    {m.user.nombre}
                  </span>
                )}
                <div className={cn("group flex items-end gap-1.5 max-w-[80%]", mio && "flex-row-reverse")}>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm break-words",
                      mio
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md border border-gray-100 dark:border-gray-700"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.texto}</p>
                    <span className={cn("block text-[10px] mt-0.5", mio ? "text-primary-100/80 text-right" : "text-gray-400")}>
                      {hora(m.createdAt)}
                    </span>
                  </div>
                  {(mio || esAdmin) && (
                    <button
                      onClick={() => borrar(m.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500 shrink-0"
                      title="Borrar mensaje"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={finRef} />
      </div>

      {/* Input */}
      <div className="pt-2 flex items-end gap-2">
        <textarea
          className="input flex-1 resize-none max-h-28 py-2.5"
          rows={1}
          placeholder="Escribe un mensaje…"
          value={texto}
          maxLength={1000}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          className="btn-primary p-3 rounded-full shrink-0 disabled:opacity-40"
          aria-label="Enviar"
        >
          {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
