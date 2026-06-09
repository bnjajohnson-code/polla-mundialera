"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("SW registrado:", reg.scope);
        })
        .catch((err) => {
          console.error("SW error:", err);
        });
    }
  }, []);

  return null;
}
