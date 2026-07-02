import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchEspnMatches, espnMapFase, espnMapStatus, espnHomeTeam, espnAwayTeam, espnScore } from "@/lib/espn-api";
import { recalcularYGuardar } from "@/lib/scoring";
import { notificarResultadoFinal, notificarCambioLider, procesarNotificaciones } from "@/lib/notifications";
import { fetchWc26Games, wc26NameToTla, wc26Estado, wc26Score } from "@/lib/worldcup26";
import { tocaSyncAhora } from "@/lib/sync-window";
import type { Partido } from "@prisma/client";

/**
 * Sync: trae todos los partidos de ESPN de una sola vez, y resuelve el
 * matching contra la base en memoria (una sola lectura de todos los partidos
 * al inicio) en vez de 1-2 consultas por partido. Con 104 eventos por corrida,
 * el patrón anterior (findUnique/findFirst por evento dentro del for) hacía
 * ~200-300 round-trips secuenciales a Neon y podía superar el timeout antes
 * de llegar a procesar los eventos de fases finales (que ESPN devuelve al
 * final del array), dejando octavos/dieciseisavos sin actualizar.
 */
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

    // Una sola lectura de todos los partidos existentes; todo el matching se
    // resuelve en memoria contra estos mapas.
    const todosPartidos = await prisma.partido.findMany();
    const byExternalId = new Map<number, Partido>();
    const byCodigoPair = new Map<string, Partido>();
    // Un solo código asignado (el otro null): filas de fases eliminatorias que
    // una corrida anterior alcanzó a rellenar parcialmente. Sin esto, un
    // segundo equipo real terminaría creando una fila duplicada en vez de
    // completar la existente.
    const byCodigoParcial = new Map<string, Partido>();
    const sinCodigo: Partido[] = []; // codigoLocal/codigoVisitante ambos null (placeholders sin equipos aún)

    const claveCodigo = (a: string, b: string) => `${a}|${b}`;
    const claveParcial = (fase: string, tla: string) => `${fase}|${tla}`;
    for (const p of todosPartidos) {
      if (p.externalId !== null) byExternalId.set(p.externalId, p);
      if (p.codigoLocal && p.codigoVisitante) {
        byCodigoPair.set(claveCodigo(p.codigoLocal, p.codigoVisitante), p);
        byCodigoPair.set(claveCodigo(p.codigoVisitante, p.codigoLocal), p);
      } else if (!p.codigoLocal && !p.codigoVisitante) {
        sinCodigo.push(p);
      } else {
        const codigoConocido = p.codigoLocal ?? p.codigoVisitante!;
        byCodigoParcial.set(claveParcial(p.fase, codigoConocido), p);
      }
    }

    let creados = 0;
    let actualizados = 0;
    let algoFinalizo = false;
    const partidosFinalizados: Array<{ id: string; golesLocal: number; golesVisitante: number; fase: string }> = [];
    const creates: Array<Parameters<typeof prisma.partido.create>[0]["data"]> = [];
    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

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
      const esPlaceholder = homeTla === awayTla || homeTla.startsWith("RD") || awayTla.startsWith("RD");

      let existente: Partido | undefined =
        byExternalId.get(espnId) ??
        (esPlaceholder ? undefined : byCodigoPair.get(claveCodigo(homeTla, awayTla)));

      // Fallback: fila con un solo equipo ya asignado (el otro null), misma
      // fase — una corrida previa la completó a medias.
      if (!existente && !esPlaceholder) {
        existente =
          byCodigoParcial.get(claveParcial(fase, homeTla)) ??
          byCodigoParcial.get(claveParcial(fase, awayTla));
      }

      // Fallback: partido sin equipos aún asignados, misma fase, fecha cercana
      // (±2h). Cubre tanto placeholders "RDxx vs RDxx" como el caso en que
      // ESPN ya resolvió ambos equipos pero la fila local sigue en blanco.
      if (!existente) {
        existente = sinCodigo.find(
          (p) =>
            p.fase === fase &&
            Math.abs(p.fechaHoraUtc.getTime() - fechaHoraUtc.getTime()) <= 2 * 3600_000
        );
      }

      if (!existente) {
        creates.push({
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
        });
        creados++;
        if (estado === "finalizado" && score.home !== null && score.away !== null) {
          // No tenemos id todavía (se crea después); se recalcula en una
          // segunda pasada tras el create si hace falta. Caso raro (partido
          // nuevo que ya nace finalizado), no se optimiza más por ahora.
        }
        continue;
      }

      // Sacar la fila de "sinCodigo"/"byCodigoParcial" si fue tomada por este
      // evento, para que el siguiente evento de esta misma corrida no la
      // vuelva a reclamar.
      const idx = sinCodigo.indexOf(existente);
      if (idx !== -1) sinCodigo.splice(idx, 1);
      if (existente.codigoLocal) byCodigoParcial.delete(claveParcial(existente.fase, existente.codigoLocal));
      if (existente.codigoVisitante) byCodigoParcial.delete(claveParcial(existente.fase, existente.codigoVisitante));

      // Anti-regresión: nunca retroceder estado ni goles ya confirmados
      const regresionEstado =
        (existente.estado === "en_juego" && estado === "programado") ||
        (existente.estado === "finalizado" && estado !== "finalizado");
      const regresionGoles = existente.golesLocal !== null && score.home === null;

      const nuevoEstado = regresionEstado ? existente.estado : estado;
      const aplicarGoles = !existente.resultadoManual && !regresionGoles;

      const mismoOrden = existente.codigoLocal === homeTla || existente.codigoLocal === null;
      const nuevoLocal = mismoOrden ? homeNombre : existente.equipoLocal;
      const nuevoVisitante = mismoOrden ? awayNombre : existente.equipoVisitante;
      const nuevoTlaLocal = mismoOrden ? homeTla : existente.codigoLocal;
      const nuevoTlaVisit = mismoOrden ? awayTla : existente.codigoVisitante;

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

      // OJO: comparar TODOS los campos que updateData puede tocar. ESPN
      // reutiliza el mismo externalId para un cupo de eliminatoria desde el
      // arranque del cuadro, solo actualizando equipo/código a medida que se
      // define (ej. "Round of 32 1 Winner" -> "Canada"); si esta comparación
      // se queda corta, el sync encuentra la fila correcta pero decide que no
      // hay nada que escribir, dejando el nombre/código de equipo viejo para
      // siempre aunque ESPN ya lo haya resuelto.
      const cambio =
        existente.externalId !== espnId ||
        existente.fase !== fase ||
        existente.equipoLocal !== nuevoLocal ||
        existente.equipoVisitante !== nuevoVisitante ||
        existente.codigoLocal !== nuevoTlaLocal ||
        existente.codigoVisitante !== nuevoTlaVisit ||
        existente.fechaHoraUtc.getTime() !== fechaHoraUtc.getTime() ||
        existente.estado !== nuevoEstado ||
        (aplicarGoles && (existente.golesLocal !== score.home || existente.golesVisitante !== score.away));

      if (cambio) {
        updates.push({ id: existente.id, data: updateData });
        actualizados++;
      }

      const yaFinalizado = existente.estado === "finalizado";
      const ahoraFinalizado = nuevoEstado === "finalizado";
      const golesDisponibles = score.home !== null && score.away !== null;
      const marcadorCambio = existente.golesLocal !== score.home || existente.golesVisitante !== score.away;

      if (ahoraFinalizado && golesDisponibles && !existente.resultadoManual && (!yaFinalizado || marcadorCambio)) {
        partidosFinalizados.push({ id: existente.id, golesLocal: score.home!, golesVisitante: score.away!, fase });
      }

      // Reflejar el update en el mapa en memoria por si otro evento de esta
      // misma corrida vuelve a referenciar este partido (poco común, pero
      // evita que dos eventos ESPN distintos lo reclamen de nuevo).
      byExternalId.set(espnId, { ...existente, ...updateData } as Partido);
    }

    // Escrituras en batch: todos los creates y updates en una sola transacción.
    if (creates.length > 0 || updates.length > 0) {
      await prisma.$transaction([
        ...creates.map((data) => prisma.partido.create({ data })),
        ...updates.map(({ id, data }) => prisma.partido.update({ where: { id }, data })),
      ]);
    }

    // Recalcular puntos y notificar resultados finales (secuencial: son pocos
    // por corrida y cada uno dispara sus propias notificaciones).
    for (const f of partidosFinalizados) {
      await recalcularYGuardar(f.id, f.golesLocal, f.golesVisitante, f.fase);
      await notificarResultadoFinal(f.id, f.golesLocal, f.golesVisitante);
      algoFinalizo = true;
    }

    // Limpiar duplicados wc26 (2026xxx) que ya tienen su equivalente ESPN.
    // Batch: una sola lectura de los duplicados y de los partidos ESPN reales,
    // en vez de un findFirst por duplicado.
    const wc26Duplicados = await prisma.partido.findMany({
      where: { externalId: { gte: 2026000, lt: 2027000 } },
      include: { _count: { select: { predicciones: true } } },
    });
    let eliminados = 0;
    if (wc26Duplicados.length > 0) {
      const espnPares = new Set(
        (await prisma.partido.findMany({
          where: { externalId: { lt: 2026000 } },
          select: { codigoLocal: true, codigoVisitante: true },
        }))
          .filter((p) => p.codigoLocal && p.codigoVisitante)
          .map((p) => claveCodigo(p.codigoLocal!, p.codigoVisitante!))
      );
      const idsAEliminar = wc26Duplicados
        .filter(
          (dup) =>
            dup._count.predicciones === 0 &&
            dup.codigoLocal &&
            dup.codigoVisitante &&
            espnPares.has(claveCodigo(dup.codigoLocal, dup.codigoVisitante))
        )
        .map((d) => d.id);
      if (idsAEliminar.length > 0) {
        const res = await prisma.partido.deleteMany({ where: { id: { in: idsAEliminar } } });
        eliminados = res.count;
      }
    }

    // ── worldcup26.ir: sólo live scores para partidos en_juego ──────────────
    let liveActualizados = 0;
    const wc26Games = await fetchWc26Games();

    if (wc26Games) {
      const partidosVigentes = await prisma.partido.findMany({
        where: { estado: { not: "finalizado" }, resultadoManual: false },
      });
      const byPar = new Map<string, Partido>();
      for (const p of partidosVigentes) {
        if (p.codigoLocal && p.codigoVisitante) {
          byPar.set(claveCodigo(p.codigoLocal, p.codigoVisitante), p);
          byPar.set(claveCodigo(p.codigoVisitante, p.codigoLocal), p);
        }
      }

      const wc26Updates: Array<{ id: string; data: Record<string, unknown> }> = [];
      const wc26Finalizados: Array<{ id: string; golesLocal: number; golesVisitante: number; fase: string }> = [];

      for (const game of wc26Games) {
        const estadoWc = wc26Estado(game);
        if (estadoWc === "notstarted") continue;

        const wc26Sc = wc26Score(game);
        if (!wc26Sc) continue;

        const tlaLocal = wc26NameToTla(game.home_team_name_en);
        const tlaVisitante = wc26NameToTla(game.away_team_name_en);
        if (!tlaLocal || !tlaVisitante) continue;

        const partido = byPar.get(claveCodigo(tlaLocal, tlaVisitante));
        if (!partido) continue;

        const MINUTOS_ANTES_CIERRE = 10;
        const cierreMs = partido.fechaHoraUtc.getTime() - MINUTOS_ANTES_CIERRE * 60 * 1000;
        if (Date.now() < cierreMs) continue;

        const localEsHome = partido.codigoLocal === tlaLocal;
        const golesLocal = localEsHome ? wc26Sc.home : wc26Sc.away;
        const golesVisitante = localEsHome ? wc26Sc.away : wc26Sc.home;

        const sinCambios =
          partido.estado === estadoWc &&
          partido.golesLocal === golesLocal &&
          partido.golesVisitante === golesVisitante;
        if (sinCambios) continue;

        wc26Updates.push({
          id: partido.id,
          data: {
            estado: estadoWc,
            golesLocal,
            golesVisitante,
            golesLocalReg: golesLocal,
            golesVisitanteReg: golesVisitante,
          },
        });

        if (estadoWc === "finalizado") {
          wc26Finalizados.push({ id: partido.id, golesLocal, golesVisitante, fase: partido.fase });
        }
        liveActualizados++;
      }

      if (wc26Updates.length > 0) {
        await prisma.$transaction(wc26Updates.map(({ id, data }) => prisma.partido.update({ where: { id }, data } )));
      }
      for (const f of wc26Finalizados) {
        await recalcularYGuardar(f.id, f.golesLocal, f.golesVisitante, f.fase);
        await notificarResultadoFinal(f.id, f.golesLocal, f.golesVisitante);
        algoFinalizo = true;
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
