import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nombre: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  codigoInvitacion: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Verificar código de invitación
    const config = await prisma.configuracion.findFirst({
      where: { codigoInvitacion: data.codigoInvitacion },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Código de invitación inválido." },
        { status: 400 }
      );
    }

    // Verificar que el email no exista
    const existente = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese email." },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        nombre: data.nombre,
        email: data.email.toLowerCase(),
        password: hash,
        rol: "jugador",
        notifPrefs: { create: {} },
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
