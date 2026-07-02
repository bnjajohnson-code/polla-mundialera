"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registrado:", reg.scope);
          // Forzar el chequeo de una versión nueva del SW en cada carga, para
          // que un fix (como bump de CACHE_NAME) llegue lo antes posible a
          // usuarios con la PWA instalada, sin esperar al ciclo automático
          // del navegador.
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.error("SW error:", err);
        });
    }
  }, []);

  return null;
}
