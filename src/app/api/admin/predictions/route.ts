import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { recalcularYGuardar } from "@/lib/scoring";

// GET /api/admin/predictions?partidoId=X
// Lista todos los jugadores con su pronóstico (o null) para ese partido.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const partidoId = searchParams.get("partidoId");
  if (!partidoId) return NextResponse.json({ error: "Falta partidoId" }, { status: 400 });

  const jugadores = await prisma.user.findMany({
    where: { rol: "jugador" },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      predicciones: {
        where: { partidoId },
        select: { id: true, golesLocal: true, golesVisitante: true, puntos: true },
      },
    },
  });

  const filas = jugadores.map((u) => ({
    userId: u.id,
    nombre: u.nombre,
    prediccion: u.predicciones[0] ?? null,
  }));

  return NextResponse.json({ jugadores: filas });
}

const putSchema = z.object({
  partidoId: z.string(),
  userId: z.string(),
  golesLocal: z.number().int().min(0).max(30),
  golesVisitante: z.number().int().min(0).max(30),
});

// PUT /api/admin/predictions — crea o actualiza el pronóstico de un jugador.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { partidoId, userId, golesLocal, golesVisitante } = putSchema.parse(await req.json());

    const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
    if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    await prisma.prediccion.upsert({
      where: { userId_partidoId: { userId, partidoId } },
      create: { userId, partidoId, golesLocal, golesVisitante },
      update: { golesLocal, golesVisitante },
    });

    // Si el partido ya finalizó con resultado, recalcular puntos
    if (
      partido.estado === "finalizado" &&
      partido.golesLocal !== null &&
      partido.golesVisitante !== null
    ) {
      await recalcularYGuardar(partidoId, partido.golesLocal, partido.golesVisitante, partido.fase);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
