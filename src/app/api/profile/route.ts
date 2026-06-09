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

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id") ?? session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, nombre: true, email: true, rol: true, createdAt: true,
      notifPrefs: true,
      predicciones: {
        include: { partido: true },
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
    const data = prefsSchema.parse(await req.json());

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
