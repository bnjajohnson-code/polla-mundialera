import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatFechaHora, FASE_LABELS } from "@/lib/utils";
import { Star, Trophy, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JugadorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      predicciones: {
        include: { partido: true },
        orderBy: { partido: { fechaHoraUtc: "desc" } },
      },
    },
  });

  if (!user) notFound();

  const predsFinalizadas = user.predicciones.filter((p) => p.partido.estado === "finalizado");
  const puntosTotales = predsFinalizadas.reduce((s, p) => s + (p.puntos ?? 0), 0);
  const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);
  const plenos = predsFinalizadas.filter(
    (p) => p.puntos !== null && p.puntos === maxPorFase(p.partido.fase)
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

      {user.predicciones.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 dark:text-gray-600">
          <p className="text-sm">Sin pronósticos aún.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {user.predicciones.map((pred) => {
            const partido = pred.partido;
            const finalizado = partido.estado === "finalizado";

            return (
              <div
                key={pred.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {partido.equipoLocal} vs {partido.equipoVisitante}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {FASE_LABELS[partido.fase] ?? partido.fase} · {formatFechaHora(partido.fechaHoraUtc)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-bold text-sm tabular-nums text-gray-700 dark:text-gray-300">
                    {pred.golesLocal} – {pred.golesVisitante}
                  </p>
                  {finalizado && partido.golesLocal !== null && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      Real: {partido.golesLocal}–{partido.golesVisitante}
                    </p>
                  )}
                </div>

                {finalizado && (
                  <div className="shrink-0 flex items-center gap-1 w-12 justify-end">
                    <Star
                      className={`w-4 h-4 ${pred.puntos === maxPorFase(partido.fase) ? "fill-gold-400 stroke-gold-500" : "stroke-gray-300 dark:stroke-gray-600"}`}
                    />
                    <span className="font-bold text-sm tabular-nums dark:text-gray-200">{pred.puntos ?? 0}</span>
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
