import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const prefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  avisoInicio: z.boolean().optional(),
  avisoFaltante24h: z.boolean().optional(),
  avisoFaltante2h: z.boolean().optional(),
});

const nombreSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(40, "Máximo 40 caracteres").trim(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Solo el perfil propio: este endpoint expone email, preferencias y
  // predicciones de partidos aún abiertos.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, nombre: true, email: true, rol: true, esTesorero: true, createdAt: true,
      notifPrefs: true,
      predicciones: {
        select: {
          puntos: true,
          partido: { select: { estado: true, fase: true } },
        },
        orderBy: { partido: { fechaHoraUtc: "desc" } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  try {
    const body = await req.json();

    // Cambio de nombre
    if ("nombre" in body) {
      const { nombre } = nombreSchema.parse(body);
      const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { nombre },
        select: { nombre: true },
      });
      return NextResponse.json({ nombre: user.nombre });
    }

    // Preferencias de notificación
    const data = prefsSchema.parse(body);
    const prefs = await prisma.notifPreferencia.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json({ prefs });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
