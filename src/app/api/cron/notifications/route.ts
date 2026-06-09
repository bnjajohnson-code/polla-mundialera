import { NextResponse } from "next/server";
import { procesarNotificaciones } from "@/lib/notifications";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await procesarNotificaciones();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Cron notifications error:", err);
    return NextResponse.json({ error: "Error en cron notifications" }, { status: 500 });
  }
}
