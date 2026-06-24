import { NextResponse } from "next/server";
import { procesarNotificaciones } from "@/lib/notifications";
import { enVentanaPartidos } from "@/lib/sync-window";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Fuera del horario de partidos no hay avisos que enviar: se omite sin tocar
  // la base, para que Neon pueda dormir y no gastar compute.
  if (!enVentanaPartidos()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const result = await procesarNotificaciones();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Cron notifications error:", err);
    return NextResponse.json({ error: "Error en cron notifications" }, { status: 500 });
  }
}
