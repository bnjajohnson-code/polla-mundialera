import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { estaBlockeado } from "@/lib/utils";
import { getPuntos } from "@/lib/scoring";

const schema = z.object({
  partidoId: z.string().cuid(),
  golesLocal: z.number().int().min(0).max(30),
  golesVisitante: z.number().int().min(0).max(30),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const data = schema.parse(await req.json());

    // Verificar que el partido existe y no está bloqueado
    const partido = await prisma.partido.findUnique({ where: { id: data.partidoId } });
    if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    if (estaBlockeado(partido.fechaHoraUtc, partido.estado)) {
      return NextResponse.json(
        { error: "Las predicciones para este partido están cerradas." },
        { status: 403 }
      );
    }

    if (partido.codigoLocal === null || partido.codigoVisitante === null) {
      return NextResponse.json(
        { error: "Los equipos de este partido aún no están definidos." },
        { status: 403 }
      );
    }

    const prediccion = await prisma.prediccion.upsert({
      where: { userId_partidoId: { userId: session.user.id, partidoId: data.partidoId } },
      create: {
        userId: session.user.id,
        partidoId: data.partidoId,
        golesLocal: data.golesLocal,
        golesVisitante: data.golesVisitante,
      },
      update: {
        golesLocal: data.golesLocal,
        golesVisitante: data.golesVisitante,
        puntos: null, // Se recalcula cuando finaliza el partido
      },
    });

    return NextResponse.json({ prediccion }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partidoId = searchParams.get("partidoId");

  const where = partidoId
    ? { userId: session.user.id, partidoId }
    : { userId: session.user.id };

  const predicciones = await prisma.prediccion.findMany({ where });
  return NextResponse.json({ predicciones });
}
