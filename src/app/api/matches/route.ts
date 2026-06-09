import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fase = searchParams.get("fase");

  const partidos = await prisma.partido.findMany({
    where: fase ? { fase: fase as never } : undefined,
    orderBy: [{ fechaHoraUtc: "asc" }],
    include: {
      predicciones: {
        where: { userId: session.user.id },
        select: { id: true, golesLocal: true, golesVisitante: true, puntos: true, updatedAt: true },
      },
    },
  });

  // Mapeamos para que la predicción propia sea un objeto simple
  const resultado = partidos.map((p) => ({
    ...p,
    miPrediccion: p.predicciones[0] ?? null,
    predicciones: undefined,
  }));

  return NextResponse.json({ partidos: resultado });
}
