import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

async function getAutorizado() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { rol: true, esTesorero: true },
  });
  if (!user || (user.rol !== "admin" && !user.esTesorero)) return null;
  return session;
}

export async function GET() {
  const session = await getAutorizado();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const jugadores = await prisma.user.findMany({
    select: { id: true, nombre: true, pagado: true },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json({ jugadores });
}

const patchSchema = z.object({
  userId: z.string(),
  pagado: z.boolean(),
});

export async function PATCH(req: Request) {
  const session = await getAutorizado();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { userId, pagado } = patchSchema.parse(await req.json());
    const user = await prisma.user.update({
      where: { id: userId },
      data: { pagado },
      select: { id: true, pagado: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }
}
