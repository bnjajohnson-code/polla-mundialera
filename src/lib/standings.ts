/**
 * Cómputo de la tabla de posiciones, compartido entre la página /tabla,
 * /api/standings y /api/simulacion para no duplicar el criterio de
 * puntuación ni el orden de desempate.
 */

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PosicionTabla } from "@/types";
import type { EstadoPartido } from "@prisma/client";

export const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);

export type UsuarioConPreds = {
  id: string;
  nombre: string;
  pagado: boolean;
  createdAt: Date;
  predicciones: Array<{ puntos: number | null; partido: { fase: string } }>;
};

/** Calcula la tabla (sin posiciones ordenadas aún) a partir de usuarios con sus predicciones de partidos finalizados. */
export function computarTabla(usuarios: UsuarioConPreds[]): PosicionTabla[] {
  const tabla: PosicionTabla[] = usuarios.map((user) => {
    const preds = user.predicciones;
    const puntosTotales = preds.reduce((s, p) => s + (p.puntos ?? 0), 0);
    const plenos = preds.filter(
      (p) => p.puntos !== null && p.puntos === maxPorFase(p.partido.fase)
    ).length;
    const aciertosResultado = preds.filter(
      (p) => p.puntos !== null && p.puntos >= (p.partido.fase === "grupos" ? 5 : 10)
    ).length;

    return {
      userId: user.id,
      nombre: user.nombre,
      puntosTotales,
      plenos,
      aciertosResultado,
      partidosConPronostico: preds.length,
      pagado: user.pagado,
      createdAt: user.createdAt,
      posicion: 0,
      cambio: 0,
    };
  });

  ordenarTabla(tabla);
  tabla.forEach((t, i) => { t.posicion = i + 1; });
  return tabla;
}

/** Criterio de desempate oficial: puntos → achuntes → resultados → antigüedad. */
export function ordenarTabla(tabla: PosicionTabla[]): void {
  tabla.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales;
    if (b.plenos !== a.plenos) return b.plenos - a.plenos;
    if (b.aciertosResultado !== a.aciertosResultado)
      return b.aciertosResultado - a.aciertosResultado;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** Consulta la base y computa la tabla real (solo jugadores, partidos finalizados). Sin cache. */
export async function obtenerTabla(): Promise<PosicionTabla[]> {
  const usuarios = await prisma.user.findMany({
    where: { rol: "jugador" },
    include: {
      predicciones: {
        where: { partido: { estado: "finalizado" } },
        select: {
          puntos: true,
          partido: { select: { fase: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return computarTabla(usuarios);
}

// La tabla es idéntica para todos los jugadores y solo cambia cuando finaliza un
// partido. La cacheamos 60s para que múltiples refrescos durante un partido no
// despierten/consulten la base de Neon en cada visita (ahorro de compute).
// Compartida entre /tabla y /fixture (modal de campeón) — una sola entrada de cache.
export const getTabla = unstable_cache(obtenerTabla, ["tabla-posiciones"], {
  revalidate: 60,
  tags: ["tabla"],
});

/**
 * La polla terminó cuando hay al menos un partido finalizado y ninguno pendiente
 * (programado o en juego). Un partido aplazado no bloquea la celebración: si se
 * reprograma vuelve a "programado" y la condición se apaga sola.
 */
export function esPollaFinalizada(partidos: Array<{ estado: EstadoPartido }>): boolean {
  return (
    partidos.some((p) => p.estado === "finalizado") &&
    !partidos.some((p) => p.estado === "programado" || p.estado === "en_juego")
  );
}
