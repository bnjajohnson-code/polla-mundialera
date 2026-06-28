import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchEspnMatches, espnMapFase, espnMapStatus, espnHomeTeam, espnAwayTeam, espnScore } from "@/lib/espn-api";
import { recalcularYGuardar } from "@/lib/scoring";
import { notificarResultadoFinal, notificarCambioLider, procesarNotificaciones } from "@/lib/notifications";
import { fetchWc26Games, wc26NameToTla, wc26Estado, wc26Score } from "@/lib/worldcup26";
import { tocaSyncAhora } from "@/lib/sync-window";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cronSecret = req.headers.get("x-cron-secret");
  const isAdmin = session?.user?.role === "admin";
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (isCron && !isAdmin && !tocaSyncAhora()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    let espnEvents: Awaited<ReturnType<typeof fetchEspnMatches>> = [];
    try {
      espnEvents = await fetchEspnMatches();
    } catch (espnErr) {
      console.warn("[sync] ESPN no disponible:", espnErr instanceof Error ? espnErr.message : espnErr);
    }

    let creados = 0;
    let actualizados = 0;
    let algoFinalizo = false;
    const espnIdsProcesados = new Set<number>();

    for (const event of espnEvents) {
      const espnId = parseInt(event.id, 10);
      const fase = espnMapFase(event.season.slug);
      const estado = espnMapStatus(event.status.type.name);
      const fechaHoraUtc = new Date(event.date);
      const score = espnScore(event);

      const homeC = espnHomeTeam(event);
      const awayC = espnAwayTeam(event);
      if (!homeC?.team?.abbreviation || !awayC?.team?.abbreviation) continue;

      const homeTla = homeC.team.abbreviation;
      const awayTla = awayC.team.abbreviation;
      const homeNombre = homeC.team.displayName;
      const awayNombre = awayC.team.displayName;

      // Buscar partido existente: por ESPN ID, por par de TLAs (orden directo o
      // invertido), por local-con-visitante-null, o por doble-null con fecha próxima.
      const existente = await prisma.partido.findFirst({
        where: {
          OR: [
            { externalId: espnId },
            { codigoLocal: homeTla, codigoVisitante: awayTla },
            { codigoLocal: awayTla, codigoVisitante: homeTla },
            { codigoLocal: homeTla, codigoVisitante: null, fase },
            { codigoLocal: null, codigoVisitante: awayTla, fase },
            {
              codigoLocal: null,
              codigoVisitante: null,
              fase,
              fechaHoraUtc: {
                gte: new Date(fechaHoraUtc.getTime() - 4 * 3600_000),
                lte: new Date(fechaHoraUtc.getTime() + 4 * 3600_000),
              },
            },
          ],
        },
      });

      if (!existente) {
        await prisma.partido.create({
          data: {
            externalId: espnId,
            fase,
            equipoLocal: homeNombre,
            equipoVisitante: awayNombre,
            codigoLocal: homeTla,
            codigoVisitante: awayTla,
            fechaHoraUtc,
            estado,
            golesLocal: score.home,
            golesVisitante: score.away,
            golesLocalReg: estado === "finalizado" ? score.home : null,
            golesVisitanteReg: estado === "finalizado" ? score.away : null,
          },
        });
        creados++;
        espnIdsProcesados.add(espnId);
        continue;
      }

      espnIdsProcesados.add(espnId);

      // Anti-regresión: nunca retroceder estado ni goles ya confirmados
      const regresionEstado =
        (existente.estado === "en_juego" && estado === "programado") ||
        (existente.estado === "finalizado" && estado !== "finalizado");
      const regresionGoles =
        existente.golesLocal !== null && score.home === null;

      const nuevoEstado = regresionEstado ? existente.estado : estado;
      const aplicarGoles = !existente.resultadoManual && !regresionGoles;

      // Equipos: rellenar sólo si estaban vacíos (no invertir si ya existen)
      const mismoOrden =
        existente.codigoLocal === homeTla || existente.codigoLocal === null;
      const nuevoLocal    = mismoOrden ? homeNombre : existente.equipoLocal;
      const nuevoVisitante = mismoOrden ? awayNombre : existente.equipoVisitante;
      const nuevoTlaLocal  = mismoOrden ? homeTla    : existente.codigoLocal;
      const nuevoTlaVisit  = mismoOrden ? awayTla    : existente.codigoVisitante;

      const updateData: Record<string, unknown> = {
        externalId: espnId,
        fase,
        equipoLocal: nuevoLocal,
        equipoVisitante: nuevoVisitante,
        codigoLocal: nuevoTlaLocal,
        codigoVisitante: nuevoTlaVisit,
        fechaHoraUtc,
        estado: nuevoEstado,
      };

      if (aplicarGoles) {
        updateData.golesLocal = score.home;
        updateData.golesVisitante = score.away;
        if (estado === "finalizado") {
          updateData.golesLocalReg = existente.golesLocalReg ?? score.home;
          updateData.golesVisitanteReg = existente.golesVisitanteReg ?? score.away;
        }
      }

      const cambio =
        existente.externalId !== espnId ||
        existente.codigoVisitante !== nuevoTlaVisit ||
        existente.fechaHoraUtc.getTime() !== fechaHoraUtc.getTime() ||
        existente.estado !== nuevoEstado ||
        (aplicarGoles && (existente.golesLocal !== score.home || existente.golesVisitante !== score.away));

      if (cambio) {
        await prisma.partido.update({ where: { id: existente.id }, data: updateData });
        actualizados++;
      }

      const yaFinalizado = existente.estado === "finalizado";
      const ahoraFinalizado = nuevoEstado === "finalizado";
      const golesDisponibles = score.home !== null && score.away !== null;
      const marcadorCambio = existente.golesLocal !== score.home || existente.golesVisitante !== score.away;

      if (ahoraFinalizado && golesDisponibles && !existente.resultadoManual && (!yaFinalizado || marcadorCambio)) {
        await recalcularYGuardar(existente.id, score.home!, score.away!, fase);
        await notificarResultadoFinal(existente.id, score.home!, score.away!);
        algoFinalizo = true;
      }
    }

    // Limpiar duplicados wc26 (2026xxx) que ya tienen su equivalente ESPN
    const wc26Duplicados = await prisma.partido.findMany({
      where: {
        externalId: { gte: 2026000, lt: 2027000 },
      },
      include: { _count: { select: { predicciones: true } } },
    });
    let eliminados = 0;
    for (const dup of wc26Duplicados) {
      if (dup._count.predicciones > 0) continue;
      const tieneEspn =
        dup.codigoLocal &&
        dup.codigoVisitante &&
        (await prisma.partido.findFirst({
          where: {
            externalId: { lt: 2026000 },
            codigoLocal: dup.codigoLocal,
            codigoVisitante: dup.codigoVisitante,
          },
        }));
      if (tieneEspn) {
        await prisma.partido.delete({ where: { id: dup.id } });
        eliminados++;
      }
    }

    // ── worldcup26.ir: sólo live scores para partidos en_juego ──────────────
    let liveActualizados = 0;
    const wc26Games = await fetchWc26Games();

    if (wc26Games) {
      for (const game of wc26Games) {
        const estadoWc = wc26Estado(game);
        if (estadoWc === "notstarted") continue;

        const wc26Sc = wc26Score(game);
        if (!wc26Sc) continue;

        const tlaLocal = wc26NameToTla(game.home_team_name_en);
        const tlaVisitante = wc26NameToTla(game.away_team_name_en);
        if (!tlaLocal || !tlaVisitante) continue;

        const partido = await prisma.partido.findFirst({
          where: {
            OR: [
              { codigoLocal: tlaLocal, codigoVisitante: tlaVisitante },
              { codigoLocal: tlaVisitante, codigoVisitante: tlaLocal },
            ],
          },
        });

        if (!partido || partido.resultadoManual || partido.estado === "finalizado") continue;

        const MINUTOS_ANTES_CIERRE = 10;
        const cierreMs = partido.fechaHoraUtc.getTime() - MINUTOS_ANTES_CIERRE * 60 * 1000;
        if (Date.now() < cierreMs) continue;

        // Respetar el orden real del partido en DB (home puede ser away en wc26)
        const localEsHome = partido.codigoLocal === tlaLocal;
        const golesLocal    = localEsHome ? wc26Sc.home : wc26Sc.away;
        const golesVisitante = localEsHome ? wc26Sc.away : wc26Sc.home;

        const sinCambios =
          partido.estado === estadoWc &&
          partido.golesLocal === golesLocal &&
          partido.golesVisitante === golesVisitante;
        if (sinCambios) continue;

        await prisma.partido.update({
          where: { id: partido.id },
          data: {
            estado: estadoWc,
            golesLocal,
            golesVisitante,
            golesLocalReg: golesLocal,
            golesVisitanteReg: golesVisitante,
          },
        });

        if (estadoWc === "finalizado") {
          await recalcularYGuardar(partido.id, golesLocal, golesVisitante, partido.fase);
          await notificarResultadoFinal(partido.id, golesLocal, golesVisitante);
          algoFinalizo = true;
        }

        liveActualizados++;
      }
    }

    if (algoFinalizo) {
      await notificarCambioLider();
    }

    let notificaciones: Awaited<ReturnType<typeof procesarNotificaciones>> | null = null;
    try {
      notificaciones = await procesarNotificaciones();
    } catch (e) {
      console.error("Error procesando notificaciones en sync:", e);
    }

    return NextResponse.json({
      ok: true,
      creados,
      actualizados,
      eliminados,
      liveActualizados,
      liveDisponible: wc26Games !== null,
      total: espnEvents.length,
      notificaciones,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error en sincronización:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
