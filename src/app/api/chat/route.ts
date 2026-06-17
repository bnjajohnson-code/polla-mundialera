import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/chat — últimos 100 mensajes (orden cronológico ascendente)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const mensajes = await prisma.mensaje.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      texto: true,
      createdAt: true,
      user: { select: { id: true, nombre: true } },
    },
  });

  // Devolver en orden ascendente (más antiguo primero)
  return NextResponse.json({ mensajes: mensajes.reverse() });
}

const postSchema = z.object({
  texto: z.string().trim().min(1, "Mensaje vacío").max(1000, "Máximo 1000 caracteres"),
});

// POST /api/chat — enviar un mensaje
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { texto } = postSchema.parse(await req.json());
    const mensaje = await prisma.mensaje.create({
      data: { userId: session.user.id, texto },
      select: {
        id: true,
        texto: true,
        createdAt: true,
        user: { select: { id: true, nombre: true } },
      },
    });
    return NextResponse.json({ mensaje });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/chat?id=X — moderación: el admin (o el autor) borra un mensaje
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const mensaje = await prisma.mensaje.findUnique({ where: { id }, select: { userId: true } });
  if (!mensaje) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const esAutor = mensaje.userId === session.user.id;
  const esAdmin = session.user.role === "admin";
  if (!esAutor && !esAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.mensaje.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
