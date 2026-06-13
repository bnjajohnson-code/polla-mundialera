import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  actual: z.string().min(1, "Ingresa tu contraseña actual"),
  nueva: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const { actual, nueva } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const ok = await bcrypt.compare(actual, user.password);
    if (!ok) return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });

    const hash = await bcrypt.hash(nueva, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
