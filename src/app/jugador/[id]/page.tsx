import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatFechaHora, estaBlockeado, FASE_LABELS } from "@/lib/utils";
import { formatTeamDisplay } from "@/lib/teams";
import { calcularPuntos } from "@/lib/scoring";
import type { FasePartido } from "@prisma/client";
import { Star, Trophy, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JugadorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  const partidos = await prisma.partido.findMany({
    orderBy: { fechaHoraUtc: "desc" },
    include: {
      predicciones: {
        where: { userId: params.id },
        select: { id: true, golesLocal: true, golesVisitante: true, puntos: true },
      },
    },
  });

  // Solo el dueño del perfil ve el historial de partidos aún abiertos; para el
  // resto se muestran únicamente los partidos ya bloqueados (incluyendo los
  // que el jugador dejó sin pronóstico, para que quede visible que faltó).
  const esPropio = session.user.id === user.id;
  const partidosVisibles = esPropio
    ? partidos.filter((p) => p.predicciones.length > 0)
    : partidos.filter((p) => estaBlockeado(p.fechaHoraUtc, p.estado));

  const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);
  const predsFinalizadas = partidos.filter(
    (p) => p.estado === "finalizado" && p.predicciones.length > 0
  );
  const puntosTotales = predsFinalizadas.reduce((s, p) => s + (p.predicciones[0].puntos ?? 0), 0);
  const plenos = predsFinalizadas.filter(
    (p) => p.predicciones[0].puntos !== null && p.predicciones[0].puntos === maxPorFase(p.fase)
  ).length;

  return (
    <AppShell title={`Perfil de ${user.nombre}`} showBack backHref="/tabla">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-3 text-center">
          <Trophy className="w-5 h-5 text-primary-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-primary-900 dark:text-primary-300">{puntosTotales}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Puntos</p>
        </div>
        <div className="card p-3 text-center">
          <Star className="w-5 h-5 text-gold-500 fill-gold-400 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{plenos}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Achuntes</p>
        </div>
        <div className="card p-3 text-center">
          <Target className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{predsFinalizadas.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Jugados</p>
        </div>
      </div>

      {/* Historial */}
      <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Historial de pronósticos</h3>

      {partidosVisibles.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 dark:text-gray-600">
          <p className="text-sm">
            {esPropio
              ? "Sin pronósticos aún."
              : "Los pronósticos se muestran cuando cada partido se cierra."}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {partidosVisibles.map((partido) => {
            const pred = partido.predicciones[0] ?? null;
            const finalizado = partido.estado === "finalizado";
            const tieneResultado = partido.golesLocal !== null && partido.golesVisitante !== null;
            const detalle =
              pred && finalizado && tieneResultado
                ? calcularPuntos(
                    pred.golesLocal,
                    pred.golesVisitante,
                    partido.golesLocal!,
                    partido.golesVisitante!,
                    partido.fase as FasePartido
                  )
                : null;

            return (
              <div
                key={partido.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)} vs {formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {FASE_LABELS[partido.fase] ?? partido.fase} · {formatFechaHora(partido.fechaHoraUtc)}
                  </p>
                  {!pred && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Sin pronóstico</p>
                  )}
                  {detalle && (
                    <div className="flex flex-wrap gap-x-2 text-xs mt-0.5">
                      {detalle.aciertoResultado && <span className="text-green-600 dark:text-green-400">✓ Resultado</span>}
                      {detalle.aciertoLocal && <span className="text-green-600 dark:text-green-400">✓ Goles local</span>}
                      {detalle.aciertoVisitante && <span className="text-green-600 dark:text-green-400">✓ Goles visit.</span>}
                      {detalle.aciertoDiferencia && <span className="text-green-600 dark:text-green-400">✓ Diferencia</span>}
                      {!detalle.aciertoResultado && !detalle.aciertoLocal && !detalle.aciertoVisitante && !detalle.aciertoDiferencia && (
                        <span className="text-gray-400 dark:text-gray-600">Sin aciertos</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-sm tabular-nums text-gray-700 dark:text-gray-300">
                    {pred ? `${pred.golesLocal} – ${pred.golesVisitante}` : "—"}
                  </p>
                  {finalizado && tieneResultado && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      Real: {partido.golesLocal}–{partido.golesVisitante}
                    </p>
                  )}
                </div>

                {finalizado && (
                  <div className="shrink-0 flex items-center gap-1 w-12 justify-end">
                    <Star
                      className={`w-4 h-4 ${detalle?.pleno ? "fill-gold-400 stroke-gold-500" : "stroke-gray-300 dark:stroke-gray-600"}`}
                    />
                    <span className="font-bold text-sm tabular-nums dark:text-gray-200">{pred?.puntos ?? 0}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
