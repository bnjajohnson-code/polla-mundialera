import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { PosicionTabla } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const usuarios = await prisma.user.findMany({
    include: {
      predicciones: {
        where: { partido: { estado: "finalizado" } },
        select: { puntos: true, partido: { select: { fase: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tabla: PosicionTabla[] = usuarios.map((user) => {
    const preds = user.predicciones;
    const puntosTotales = preds.reduce((s, p) => s + (p.puntos ?? 0), 0);
    const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);
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
      createdAt: user.createdAt,
      posicion: 0,
      cambio: 0,
    };
  });

  // Ordenar por criterios de desempate
  tabla.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales;
    if (b.plenos !== a.plenos) return b.plenos - a.plenos;
    if (b.aciertosResultado !== a.aciertosResultado)
      return b.aciertosResultado - a.aciertosResultado;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  tabla.forEach((t, i) => {
    t.posicion = i + 1;
  });

  return NextResponse.json({ tabla });
}
