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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const cronSecret = req.headers.get("x-cron-secret");
  const isAdmin = session?.user?.role === "admin";
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const apiMatches = await fetchMatches();
    let creados = 0;
    let actualizados = 0;

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
        const updateData: Record<string, unknown> = {
          fase,
          grupo: match.group,
          jornada: match.matchday,
          equipoLocal: formatTeamName(match.homeTeam),
          equipoVisitante: formatTeamName(match.awayTeam),
          codigoLocal: formatTeamCode(match.homeTeam),
          codigoVisitante: formatTeamCode(match.awayTeam),
          fechaHoraUtc: new Date(match.utcDate),
          estado,
        };

        if (!existente.resultadoManual) {
          updateData.golesLocal = golesLocal;
          updateData.golesVisitante = golesVisitante;
          updateData.golesLocalReg = golesLocalReg;
          updateData.golesVisitanteReg = golesVisitanteReg;
        }

        await prisma.partido.update({
          where: { id: existente.id },
          data: updateData,
        });

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
        }

        actualizados++;
      }
    }

    return NextResponse.json({
      ok: true,
      creados,
      actualizados,
      total: apiMatches.length,
    });
  } catch (err) {
    console.error("Error en sincronización:", err);
    return NextResponse.json({ error: "Error en sincronización" }, { status: 500 });
  }
}
