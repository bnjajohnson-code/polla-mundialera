import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { recalcularYGuardar } from "@/lib/scoring";

const schema = z.object({
  golesLocal: z.number().int().min(0).max(30),
  golesVisitante: z.number().int().min(0).max(30),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());

    const partido = await prisma.partido.findUnique({ where: { id: params.id } });
    if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

    await prisma.partido.update({
      where: { id: params.id },
      data: {
        golesLocal: data.golesLocal,
        golesVisitante: data.golesVisitante,
        golesLocalReg: data.golesLocal,
        golesVisitanteReg: data.golesVisitante,
        estado: "finalizado",
        resultadoManual: true,
      },
    });

    // Recalcular puntos de todas las predicciones de este partido
    await recalcularYGuardar(params.id, data.golesLocal, data.golesVisitante, partido.fase);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
