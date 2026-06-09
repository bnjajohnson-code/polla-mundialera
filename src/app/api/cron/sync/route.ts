import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET ?? "",
      },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Cron sync error:", err);
    return NextResponse.json({ error: "Error en cron sync" }, { status: 500 });
  }
}
