import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const notificaciones = await prisma.notificacion.findMany({
    where: { userId: session.user.id, canal: "in_app" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const noLeidas = await prisma.notificacion.count({
    where: { userId: session.user.id, canal: "in_app", leido: false },
  });

  return NextResponse.json({ notificaciones, noLeidas });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const marcarTodas = searchParams.get("all") === "true";

  if (marcarTodas) {
    await prisma.notificacion.updateMany({
      where: { userId: session.user.id, canal: "in_app", leido: false },
      data: { leido: true },
    });
  } else {
    const { id } = await req.json();
    await prisma.notificacion.update({
      where: { id },
      data: { leido: true },
    });
  }

  return NextResponse.json({ ok: true });
}
