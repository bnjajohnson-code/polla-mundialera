import type { FasePartido } from "@prisma/client";
import type { ResultadoPuntuacion } from "@/types";
import { prisma } from "@/lib/prisma";

const FASES_ELIMINATORIAS: FasePartido[] = [
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_puesto",
  "final",
];

export function esEliminatoria(fase: FasePartido): boolean {
  return FASES_ELIMINATORIAS.includes(fase);
}

type ResultadoPartido = "local" | "empate" | "visitante";

function getResultado(golesLocal: number, golesVisitante: number): ResultadoPartido {
  if (golesLocal > golesVisitante) return "local";
  if (golesLocal < golesVisitante) return "visitante";
  return "empate";
}

/**
 * Calcula los puntos de una predicción.
 *
 * Para fases eliminatorias con alargue/penales, los goles a comparar
 * son los del tiempo reglamentario (90 min + descuento), no el resultado final.
 *
 * Criterios acumulativos:
 * - Resultado correcto (ganador o empate): 5 pts grupos / 10 pts elim
 * - Goles equipo local exactos:             2 pts grupos /  4 pts elim
 * - Goles equipo visitante exactos:         2 pts grupos /  4 pts elim
 * - Diferencia de goles exacta:             1 pt  grupos /  2 pts elim
 * Máximo: 10 pts grupos / 20 pts eliminatorias
 */
export function calcularPuntos(
  pronosticoLocal: number,
  pronosticoVisitante: number,
  resultadoLocal: number,
  resultadoVisitante: number,
  fase: FasePartido
): ResultadoPuntuacion {
  const mult = esEliminatoria(fase) ? 2 : 1;

  const aciertoResultado =
    getResultado(pronosticoLocal, pronosticoVisitante) ===
    getResultado(resultadoLocal, resultadoVisitante);

  const aciertoLocal = pronosticoLocal === resultadoLocal;
  const aciertoVisitante = pronosticoVisitante === resultadoVisitante;
  const aciertoDiferencia =
    Math.abs(pronosticoLocal - pronosticoVisitante) === Math.abs(resultadoLocal - resultadoVisitante);

  const puntos =
    (aciertoResultado ? 5 * mult : 0) +
    (aciertoLocal ? 2 * mult : 0) +
    (aciertoVisitante ? 2 * mult : 0) +
    (aciertoDiferencia ? 1 * mult : 0);

  const maxPuntos = 10 * mult;
  const pleno = puntos === maxPuntos;

  return {
    puntos,
    aciertoResultado,
    aciertoLocal,
    aciertoVisitante,
    aciertoDiferencia,
    pleno,
  };
}

/** Wrapper simple que devuelve solo los puntos. */
export function getPuntos(
  pronosticoLocal: number,
  pronosticoVisitante: number,
  resultadoLocal: number,
  resultadoVisitante: number,
  fase: FasePartido
): number {
  return calcularPuntos(
    pronosticoLocal,
    pronosticoVisitante,
    resultadoLocal,
    resultadoVisitante,
    fase
  ).puntos;
}

/**
 * Recalcula los puntos de una lista de predicciones con el resultado final conocido.
 * Retorna un mapa { prediccionId -> puntos }.
 */
export function recalcularPredicciones(
  predicciones: Array<{
    id: string;
    golesLocal: number;
    golesVisitante: number;
  }>,
  resultadoLocal: number,
  resultadoVisitante: number,
  fase: FasePartido
): Map<string, number> {
  const resultado = new Map<string, number>();
  for (const pred of predicciones) {
    const puntos = getPuntos(
      pred.golesLocal,
      pred.golesVisitante,
      resultadoLocal,
      resultadoVisitante,
      fase
    );
    resultado.set(pred.id, puntos);
  }
  return resultado;
}

export async function recalcularYGuardar(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number,
  fase: string
) {
  const predicciones = await prisma.prediccion.findMany({
    where: { partidoId },
    select: { id: true, golesLocal: true, golesVisitante: true },
  });

  const puntosMap = recalcularPredicciones(
    predicciones,
    golesLocal,
    golesVisitante,
    fase as FasePartido
  );

  for (const [predId, puntos] of Array.from(puntosMap)) {
    await prisma.prediccion.update({
      where: { id: predId },
      data: { puntos },
    });
  }
}
