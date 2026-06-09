import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

const schema = z.object({
  nombrePolla: z.string().min(2).max(100).optional(),
  regenerarCodigo: z.boolean().optional(),
  codigoInvitacion: z.string().min(4).max(20).regex(/^[A-Z0-9]+$/, "Solo letras mayúsculas y números").optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const config = await prisma.configuracion.findFirst();
  return NextResponse.json({ config });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const data = schema.parse(await req.json());
    const config = await prisma.configuracion.findFirst();
    if (!config) return NextResponse.json({ error: "Configuración no encontrada" }, { status: 404 });

    const updateData: Record<string, string> = {};
    if (data.nombrePolla) updateData.nombrePolla = data.nombrePolla;
    if (data.codigoInvitacion) {
      updateData.codigoInvitacion = data.codigoInvitacion;
    } else if (data.regenerarCodigo) {
      updateData.codigoInvitacion = crypto.randomBytes(4).toString("hex").toUpperCase();
    }

    const updated = await prisma.configuracion.update({
      where: { id: config.id },
      data: updateData,
    });

    return NextResponse.json({ config: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 422 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
