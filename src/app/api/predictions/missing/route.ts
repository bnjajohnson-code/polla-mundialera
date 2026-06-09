import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Partidos que inician en las próximas 48h y no tienen pronóstico
  const en48h = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const partidos = await prisma.partido.findMany({
    where: {
      estado: "programado",
      fechaHoraUtc: { lte: en48h, gte: new Date() },
    },
    select: { id: true },
  });

  const prediccionesExistentes = await prisma.prediccion.findMany({
    where: {
      userId: session.user.id,
      partidoId: { in: partidos.map((p) => p.id) },
    },
    select: { partidoId: true },
  });

  const predecidosIds = new Set(prediccionesExistentes.map((p) => p.partidoId));
  const count = partidos.filter((p) => !predecidosIds.has(p.id)).length;

  return NextResponse.json({ count });
}
