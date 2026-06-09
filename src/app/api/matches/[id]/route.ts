import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { estaBlockeado } from "@/lib/utils";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const partido = await prisma.partido.findUnique({
    where: { id: params.id },
    include: {
      predicciones: {
        include: {
          user: { select: { id: true, nombre: true } },
        },
        orderBy: { puntos: "desc" },
      },
    },
  });

  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  const bloqueado = estaBlockeado(partido.fechaHoraUtc, partido.estado);

  // Si no está bloqueado, ocultar predicciones de otros usuarios
  const predicciones = bloqueado
    ? partido.predicciones
    : partido.predicciones.filter((p) => p.userId === session.user.id);

  return NextResponse.json({ partido: { ...partido, predicciones } });
}
