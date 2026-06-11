import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatFechaHora, estaBlockeado, FASE_LABELS } from "@/lib/utils";
import { formatTeamDisplay } from "@/lib/teams";
import { calcularPuntos } from "@/lib/scoring";
import { Star, Lock } from "lucide-react";
import type { FasePartido } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PartidoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const partido = await prisma.partido.findUnique({
    where: { id: params.id },
    include: {
      predicciones: {
        where: { user: { rol: "jugador" } },
        include: { user: { select: { id: true, nombre: true } } },
        orderBy: [{ puntos: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!partido) notFound();

  const bloqueado = estaBlockeado(partido.fechaHoraUtc, partido.estado);
  const finalizado = partido.estado === "finalizado";
  const tieneResultado = partido.golesLocal !== null && partido.golesVisitante !== null;

  const predicciones = bloqueado
    ? partido.predicciones
    : partido.predicciones.filter((p) => p.userId === session.user.id);

  return (
    <AppShell
      title={`${formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)} vs ${formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}`}
      showBack
      backHref="/fixture"
    >
      {/* Cabecera del partido */}
      <div className="card p-5 mb-4">
        <div className="text-center mb-4">
          <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
            {FASE_LABELS[partido.fase] ?? partido.fase}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatFechaHora(partido.fechaHoraUtc)}</p>
        </div>

        {finalizado && tieneResultado ? (
          <div className="flex items-center justify-center gap-6">
            <div className="text-center flex-1">
              <p className="font-bold text-gray-900 dark:text-gray-100">{formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)}</p>
            </div>
            <div className="text-center">
              <span className="text-4xl font-black tabular-nums text-primary-900 dark:text-primary-300">
                {partido.golesLocal}
              </span>
              <span className="text-2xl text-gray-400 dark:text-gray-600 mx-2">–</span>
              <span className="text-4xl font-black tabular-nums text-primary-900 dark:text-primary-300">
                {partido.golesVisitante}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Resultado final (90 min)</p>
            </div>
            <div className="text-center flex-1">
              <p className="font-bold text-gray-900 dark:text-gray-100">{formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <p className="font-bold text-gray-900 dark:text-gray-100">{formatTeamDisplay(partido.equipoLocal, partido.codigoLocal)}</p>
            <span className="text-gray-400 dark:text-gray-600 font-bold">vs</span>
            <p className="font-bold text-gray-900 dark:text-gray-100">{formatTeamDisplay(partido.equipoVisitante, partido.codigoVisitante)}</p>
          </div>
        )}

        {!bloqueado && (
          <div className="flex items-center justify-center gap-2 mt-4 text-amber-600 dark:text-amber-400 text-sm">
            <Lock className="w-4 h-4" />
            <span>Las predicciones se revelarán al inicio del partido</span>
          </div>
        )}
      </div>

      {/* Tabla de predicciones */}
      {bloqueado ? (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
              Pronósticos del grupo ({predicciones.length})
            </h3>
          </div>

          {predicciones.length === 0 ? (
            <div className="py-10 text-center text-gray-400 dark:text-gray-600">
              <p className="text-sm">Ningún jugador hizo pronóstico.</p>
            </div>
          ) : (
            <div>
              {predicciones.map((pred) => {
                const esYo = pred.userId === session.user.id;
                let detalle: ReturnType<typeof calcularPuntos> | null = null;

                if (finalizado && tieneResultado) {
                  detalle = calcularPuntos(
                    pred.golesLocal,
                    pred.golesVisitante,
                    partido.golesLocal!,
                    partido.golesVisitante!,
                    partido.fase as FasePartido
                  );
                }

                return (
                  <div
                    key={pred.id}
                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${esYo ? "bg-primary-50 dark:bg-primary-950" : ""}`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {pred.user.nombre}{" "}
                        {esYo && <span className="text-xs font-normal text-primary-600 dark:text-primary-400">(tú)</span>}
                      </p>
                      {detalle && (
                        <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {detalle.aciertoResultado && <span className="text-green-600 dark:text-green-400">✓ Resultado</span>}
                          {detalle.aciertoLocal && <span className="text-green-600 dark:text-green-400">✓ Local</span>}
                          {detalle.aciertoVisitante && <span className="text-green-600 dark:text-green-400">✓ Visit.</span>}
                          {detalle.aciertoDiferencia && <span className="text-green-600 dark:text-green-400">✓ Diff</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                        {pred.golesLocal} – {pred.golesVisitante}
                      </span>
                      {finalizado && (
                        <div className="flex items-center gap-1">
                          <Star
                            className={`w-4 h-4 ${detalle?.pleno ? "fill-gold-400 stroke-gold-500" : "stroke-gray-300 dark:stroke-gray-600"}`}
                          />
                          <span className="font-bold text-sm w-6 text-right tabular-nums dark:text-gray-200">
                            {pred.puntos ?? 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-6 text-center text-gray-400 dark:text-gray-600">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Los pronósticos se mostrarán cuando inicie el partido.
          </p>
        </div>
      )}
    </AppShell>
  );
}
