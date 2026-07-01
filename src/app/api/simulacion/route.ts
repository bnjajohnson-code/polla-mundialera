import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { estaBlockeado } from "@/lib/utils";
import { calcularPuntos } from "@/lib/scoring";
import { computarTabla, ordenarTabla, maxPorFase } from "@/lib/standings";
import type { FasePartido } from "@prisma/client";

/**
 * Simula el efecto de un resultado hipotético sobre la tabla de posiciones.
 * Solo admite partidos ya cerrados (bloqueados) y sin resultado final: a esa
 * altura los pronósticos de todos son visibles, así que no se filtra nada.
 * No escribe en la base: es un cálculo de lectura.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partidoId = searchParams.get("partidoId");
  const gl = Number(searchParams.get("gl"));
  const gv = Number(searchParams.get("gv"));

  if (!partidoId || !Number.isInteger(gl) || !Number.isInteger(gv) || gl < 0 || gv < 0 || gl > 20 || gv > 20) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });

  if (partido.estado === "finalizado") {
    return NextResponse.json({ error: "El partido ya finalizó" }, { status: 400 });
  }
  // Nunca simular partidos aún abiertos: los totales simulados permitirían
  // inferir pronósticos ajenos que todavía son secretos.
  if (!estaBlockeado(partido.fechaHoraUtc, partido.estado)) {
    return NextResponse.json({ error: "El partido aún no se cierra" }, { status: 403 });
  }

  const usuarios = await prisma.user.findMany({
    where: { rol: "jugador" },
    include: {
      predicciones: {
        where: {
          OR: [{ partido: { estado: "finalizado" } }, { partidoId }],
        },
        select: {
          puntos: true,
          partidoId: true,
          golesLocal: true,
          golesVisitante: true,
          partido: { select: { fase: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Tabla real (baseline) solo con partidos finalizados
  const real = computarTabla(
    usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      pagado: u.pagado,
      createdAt: u.createdAt,
      predicciones: u.predicciones.filter((p) => p.partidoId !== partidoId),
    }))
  );
  const posicionReal = new Map(real.map((r) => [r.userId, r.posicion]));

  // Tabla simulada: sumar a cada jugador los puntos de su pronóstico contra el marcador hipotético
  const puntosSimulados: Record<string, number> = {};
  const tabla = real.map((row) => ({ ...row }));
  const porUser = new Map(tabla.map((r) => [r.userId, r]));

  for (const u of usuarios) {
    const pred = u.predicciones.find((p) => p.partidoId === partidoId);
    if (!pred) continue;
    const detalle = calcularPuntos(pred.golesLocal, pred.golesVisitante, gl, gv, partido.fase as FasePartido);
    const row = porUser.get(u.id);
    if (!row) continue;
    row.puntosTotales += detalle.puntos;
    if (detalle.puntos === maxPorFase(partido.fase)) row.plenos++;
    if (detalle.aciertoResultado) row.aciertosResultado++;
    row.partidosConPronostico++;
    puntosSimulados[u.id] = detalle.puntos;
  }

  ordenarTabla(tabla);
  tabla.forEach((t, i) => {
    t.posicion = i + 1;
    t.cambio = (posicionReal.get(t.userId) ?? t.posicion) - t.posicion;
  });

  return NextResponse.json({ tabla, puntosSimulados });
}
