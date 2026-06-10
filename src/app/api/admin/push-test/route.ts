import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { titulo, mensaje } = await req.json();

  const subs = await prisma.pushSubscription.findMany({
    include: { user: { select: { nombre: true } } },
  });

  if (subs.length === 0) {
    return NextResponse.json({ ok: false, error: "No hay suscriptores push registrados." });
  }

  let enviadas = 0;
  let errores = 0;

  for (const sub of subs) {
    try {
      await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
        title: titulo ?? "⚽ Polla Mundialera",
        body: mensaje ?? "Notificación de prueba",
        url: "/fixture",
      });
      enviadas++;
    } catch {
      errores++;
    }
  }

  return NextResponse.json({ ok: true, enviadas, errores, total: subs.length });
}
