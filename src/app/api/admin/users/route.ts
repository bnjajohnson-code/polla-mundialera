import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true, nombre: true, email: true, rol: true, createdAt: true,
      _count: { select: { predicciones: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ users });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (!userId) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (userId === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  userId: z.string(),
  rol: z.enum(["admin", "jugador"]),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const { userId, rol } = patchSchema.parse(await req.json());
    if (userId === session.user.id) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { rol },
      select: { id: true, rol: true },
    });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }
}
