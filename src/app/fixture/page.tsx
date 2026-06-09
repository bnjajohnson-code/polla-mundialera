import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MatchCard } from "@/components/fixture/MatchCard";
import { MissingPredictionsBanner } from "@/components/notifications/MissingPredictionsBanner";
import { FASE_LABELS, FASE_ORDER, formatFechaPartido } from "@/lib/utils";
import type { FasePartido } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FixturePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const partidos = await prisma.partido.findMany({
    orderBy: [{ fechaHoraUtc: "asc" }],
    include: {
      predicciones: {
        where: { userId: session.user.id },
        select: {
          id: true, golesLocal: true, golesVisitante: true, puntos: true, updatedAt: true,
        },
      },
    },
  });

  // Agrupar por fase y luego por fecha
  const byFase = new Map<FasePartido, typeof partidos>();
  for (const p of partidos) {
    const list = byFase.get(p.fase) ?? [];
    list.push(p);
    byFase.set(p.fase, list);
  }

  const fasesOrdenadas = Array.from(byFase.keys()).sort(
    (a, b) => (FASE_ORDER[a] ?? 0) - (FASE_ORDER[b] ?? 0)
  );

  return (
    <AppShell title="Polla Mundialera 2026">
      <MissingPredictionsBanner />

      {fasesOrdenadas.map((fase) => {
        const partidosFase = byFase.get(fase)!;

        // Agrupar por fecha dentro de cada fase
        const byFecha = new Map<string, typeof partidosFase>();
        for (const p of partidosFase) {
          const key = formatFechaPartido(p.fechaHoraUtc);
          const list = byFecha.get(key) ?? [];
          list.push(p);
          byFecha.set(key, list);
        }

        return (
          <section key={fase} className="mb-6">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              {FASE_LABELS[fase] ?? fase}
            </h2>

            {Array.from(byFecha.entries()).map(([fecha, ps]) => (
              <div key={fecha} className="mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize mb-2 ml-1">
                  {fecha}
                </p>
                <div className="space-y-3">
                  {ps.map((p: (typeof partidos)[number]) => (
                    <MatchCard
                      key={p.id}
                      partido={{
                        ...p,
                        miPrediccion: p.predicciones[0] ?? null,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {partidos.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-gray-500">No hay partidos cargados aún.</p>
          <p className="text-sm mt-1">El administrador debe sincronizar el fixture.</p>
        </div>
      )}
    </AppShell>
  );
}
