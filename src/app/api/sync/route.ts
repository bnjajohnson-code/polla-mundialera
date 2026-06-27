import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  fetchMatches,
  mapStage,
  mapStatus,
  getScoreRegular,
  formatTeamName,
  formatTeamCode,
} from "@/lib/football-api";
import { recalcularYGuardar } from "@/lib/scoring";
import { notificarResultadoFinal, notificarCambioLider, procesarNotificaciones } from "@/lib/notifications";
import { fetchWc26Games, wc26NameToTla, wc26Estado, wc26Score, wc26MapFase, wc26ParseDate } from "@/lib/worldcup26";
import { tocaSyncAhora } from "@/lib/sync-window";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cronSecret = req.headers.get("x-cron-secret");
  const isAdmin = session?.user?.role === "admin";
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Fuera del horario de partidos (o en el "hueco" de cada 10 min) no tocamos
  // la base, para que Neon pueda dormir. El admin siempre puede forzar el sync.
  if (isCron && !isAdmin && !tocaSyncAhora()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    let apiMatches: Awaited<ReturnType<typeof fetchMatches>> = [];
    try {
      apiMatches = await fetchMatches();
    } catch (fdErr) {
      console.warn("[sync] football-data.org no disponible, continuando con worldcup26.ir:", fdErr instanceof Error ? fdErr.message : fdErr);
    }

    let creados = 0;
    let actualizados = 0;
    let algoFinalizo = false;

    for (const match of apiMatches) {
      const fase = mapStage(match.stage);
      const estado = mapStatus(match.status);
      const score = getScoreRegular(match.score);
      const golesLocal = score.home ?? null;
      const golesVisitante = score.away ?? null;

      const golesLocalReg =
        match.score.regularTime?.home ?? match.score.fullTime.home ?? null;
      const golesVisitanteReg =
        match.score.regularTime?.away ?? match.score.fullTime.away ?? null;

      const existente = await prisma.partido.findUnique({
        where: { externalId: match.id },
      });

      if (!existente) {
        await prisma.partido.create({
          data: {
            externalId: match.id,
            fase,
            grupo: match.group,
            jornada: match.matchday,
            equipoLocal: formatTeamName(match.homeTeam),
            equipoVisitante: formatTeamName(match.awayTeam),
            codigoLocal: formatTeamCode(match.homeTeam),
            codigoVisitante: formatTeamCode(match.awayTeam),
            fechaHoraUtc: new Date(match.utcDate),
            estado,
            golesLocal,
            golesVisitante,
            golesLocalReg,
            golesVisitanteReg,
          },
        });
        creados++;
      } else {
        // La API gratuita a veces "parpadea": devuelve datos viejos (TIMED/null)
        // para un partido que ya reportó en juego o con goles. Nunca retroceder.
        const regresionEstado =
          (existente.estado === "en_juego" && estado === "programado") ||
          (existente.estado === "finalizado" && estado !== "finalizado");
        const regresionGoles =
          existente.golesLocal !== null && golesLocal === null;

        const nuevoEstado = regresionEstado ? existente.estado : estado;
        const aplicarGoles = !existente.resultadoManual && !regresionGoles;

        const updateData: Record<string, unknown> = {
          fase,
          grupo: match.group,
          jornada: match.matchday,
          equipoLocal: formatTeamName(match.homeTeam),
          equipoVisitante: formatTeamName(match.awayTeam),
          codigoLocal: formatTeamCode(match.homeTeam),
          codigoVisitante: formatTeamCode(match.awayTeam),
          fechaHoraUtc: new Date(match.utcDate),
          estado: nuevoEstado,
        };

        if (aplicarGoles) {
          updateData.golesLocal = golesLocal;
          updateData.golesVisitante = golesVisitante;
          updateData.golesLocalReg = golesLocalReg;
          updateData.golesVisitanteReg = golesVisitanteReg;
        }

        // Solo escribir si algo cambió de verdad (evita reescribir los 104
        // partidos en cada corrida y mantener la base ocupada sin necesidad).
        const cambio =
          existente.fase !== updateData.fase ||
          existente.grupo !== updateData.grupo ||
          existente.jornada !== updateData.jornada ||
          existente.equipoLocal !== updateData.equipoLocal ||
          existente.equipoVisitante !== updateData.equipoVisitante ||
          existente.codigoLocal !== updateData.codigoLocal ||
          existente.codigoVisitante !== updateData.codigoVisitante ||
          existente.fechaHoraUtc.getTime() !== (updateData.fechaHoraUtc as Date).getTime() ||
          existente.estado !== nuevoEstado ||
          (aplicarGoles &&
            (existente.golesLocal !== golesLocal ||
              existente.golesVisitante !== golesVisitante ||
              existente.golesLocalReg !== golesLocalReg ||
              existente.golesVisitanteReg !== golesVisitanteReg));

        if (cambio) {
          await prisma.partido.update({
            where: { id: existente.id },
            data: updateData,
          });
          actualizados++;
        }

        const yaFinalizado = existente.estado === "finalizado";
        const ahoraFinalizado = estado === "finalizado";
        const golesDisponibles = golesLocal !== null && golesVisitante !== null;
        // Recalcular también si la API corrige el marcador de un partido ya finalizado
        const marcadorCambio =
          existente.golesLocal !== golesLocal || existente.golesVisitante !== golesVisitante;

        if (
          ahoraFinalizado &&
          golesDisponibles &&
          !existente.resultadoManual &&
          (!yaFinalizado || marcadorCambio)
        ) {
          await recalcularYGuardar(existente.id, golesLocal!, golesVisitante!, fase);
          await notificarResultadoFinal(existente.id, golesLocal!, golesVisitante!);
          algoFinalizo = true;
        }
      }
    }

    // ── Fuente secundaria: worldcup26.ir (live scores) ──────────────────────
    // football-data.org gratuito entrega resultados con horas de retraso.
    // Para partidos que football-data aún no finaliza, usamos worldcup26.ir.
    // Cuando football-data finalmente reporte, su dato prevalece (arriba).
    let liveActualizados = 0;
    const wc26Games = await fetchWc26Games();

    if (wc26Games) {
      for (const game of wc26Games) {
        // ── Crear partidos de eliminatoria aún no existentes ─────────────────
        if (game.type !== "group") {
          const tlaLocal = wc26NameToTla(game.home_team_name_en);
          const tlaVisitante = wc26NameToTla(game.away_team_name_en);

          if (tlaLocal && tlaVisitante && game.home_team_name_en && game.away_team_name_en) {
            const wc26ExtId = 2026000 + parseInt(game.id, 10);
            const fase = wc26MapFase(game.type);
            const fechaHoraUtc = wc26ParseDate(game.local_date);

            // Buscar partido existente: por externalId wc26, por ambos TLA,
            // o por TLA local con visitante aún nulo (football-data.org parcial)
            const existente =
              await prisma.partido.findUnique({ where: { externalId: wc26ExtId } }) ??
              await prisma.partido.findFirst({ where: { codigoLocal: tlaLocal, codigoVisitante: tlaVisitante } }) ??
              await prisma.partido.findFirst({ where: { fase, codigoLocal: tlaLocal, codigoVisitante: null } });

            if (existente) {
              // Completar datos parciales si faltan equipo visitante o fecha
              const necesitaUpdate =
                !existente.codigoVisitante ||
                (fechaHoraUtc && existente.fechaHoraUtc.getTime() !== fechaHoraUtc.getTime());
              if (necesitaUpdate) {
                await prisma.partido.update({
                  where: { id: existente.id },
                  data: {
                    equipoVisitante: game.away_team_name_en,
                    codigoVisitante: tlaVisitante,
                    ...(fechaHoraUtc ? { fechaHoraUtc } : {}),
                  },
                });
                actualizados++;
              }
            } else if (fechaHoraUtc) {
              await prisma.partido.create({
                data: {
                  externalId: wc26ExtId,
                  fase,
                  grupo: game.group,
                  jornada: game.matchday ? parseInt(game.matchday, 10) : null,
                  equipoLocal: game.home_team_name_en,
                  equipoVisitante: game.away_team_name_en,
                  codigoLocal: tlaLocal,
                  codigoVisitante: tlaVisitante,
                  fechaHoraUtc,
                  estado: "programado",
                },
              });
              creados++;
            }
          }
        }

        // ── Live score update para partidos ya existentes ────────────────────
        const estadoWc = wc26Estado(game);
        if (estadoWc === "notstarted") continue;

        const score = wc26Score(game);
        if (!score) continue;

        const tlaLocal = wc26NameToTla(game.home_team_name_en);
        const tlaVisitante = wc26NameToTla(game.away_team_name_en);
        if (!tlaLocal || !tlaVisitante) continue;

        const partido = await prisma.partido.findFirst({
          where: { codigoLocal: tlaLocal, codigoVisitante: tlaVisitante },
        });

        // football-data manda: si ya está finalizado (o es manual), no tocar
        if (!partido || partido.resultadoManual || partido.estado === "finalizado") continue;

        // No aplicar live score antes de que cierre el plazo de pronósticos
        // (10 min antes del pitazo). Si lo hacemos antes, se exponen los
        // pronósticos de otros jugadores y se bloquean predicciones aún abiertas.
        const MINUTOS_ANTES_CIERRE = 10;
        const cierreMs = new Date(partido.fechaHoraUtc).getTime() - MINUTOS_ANTES_CIERRE * 60 * 1000;
        if (Date.now() < cierreMs) continue;

        const sinCambios =
          partido.estado === estadoWc &&
          partido.golesLocal === score.home &&
          partido.golesVisitante === score.away;
        if (sinCambios) continue;

        await prisma.partido.update({
          where: { id: partido.id },
          data: {
            estado: estadoWc,
            golesLocal: score.home,
            golesVisitante: score.away,
            golesLocalReg: score.home,
            golesVisitanteReg: score.away,
          },
        });

        if (estadoWc === "finalizado") {
          await recalcularYGuardar(partido.id, score.home, score.away, partido.fase);
          await notificarResultadoFinal(partido.id, score.home, score.away);
          algoFinalizo = true;
        }

        liveActualizados++;
      }
    }

    // Solo comprobar el cambio de líder si algún partido finalizó en esta
    // corrida (la tabla solo puede cambiar entonces). Evita consultar a todos
    // los usuarios y sus predicciones en cada sync.
    if (algoFinalizo) {
      await notificarCambioLider();
    }

    // Cron unificado: las notificaciones pre-partido se procesan aquí mismo en
    // vez de un cron aparte, para no duplicar invocaciones en Vercel. Solo corre
    // dentro de la ventana de partidos (el guard de arriba ya lo garantiza).
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
      liveActualizados,
      liveDisponible: wc26Games !== null,
      total: apiMatches.length,
      notificaciones,
    });
  } catch (err) {
    console.error("Error en sincronización:", err);
    return NextResponse.json({ error: "Error en sincronización" }, { status: 500 });
  }
}
