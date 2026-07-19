import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MatchCard } from "@/components/fixture/MatchCard";
import { MissingPredictionsBanner } from "@/components/notifications/MissingPredictionsBanner";
import { PushPromptBanner } from "@/components/notifications/PushPromptBanner";
import { JumpToTodayButton } from "@/components/fixture/JumpToTodayButton";
import { FASE_LABELS, FASE_ORDER, formatFechaPartido } from "@/lib/utils";
import type { FasePartido } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// La lista de partidos es idéntica para todos los jugadores; la cacheamos 60s
// (mismo patrón que getTabla) para que las visitas concurrentes durante un
// partido no repitan la query pesada. Las predicciones propias sí van por
// usuario, con una query liviana aparte.
const getPartidos = unstable_cache(
  async () =>
    prisma.partido.findMany({
      orderBy: [{ fechaHoraUtc: "asc" }],
    }),
  ["fixture-partidos"],
  { revalidate: 60 }
);

export default async function FixturePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [partidosBase, misPredicciones] = await Promise.all([
    getPartidos(),
    prisma.prediccion.findMany({
      where: { userId: session.user.id },
      select: {
        id: true, partidoId: true, golesLocal: true, golesVisitante: true, puntos: true, updatedAt: true,
      },
    }),
  ]);

  const predPorPartido = new Map(misPredicciones.map((p) => [p.partidoId, p]));
  const partidos = partidosBase.map((p) => ({
    ...p,
    // unstable_cache serializa las fechas; las rehidratamos a Date
    fechaHoraUtc: new Date(p.fechaHoraUtc),
    predicciones: predPorPartido.has(p.id) ? [predPorPartido.get(p.id)!] : [],
  }));

  // Determinar el primer partido de hoy (zona horaria de Santiago) para el
  // botón de salto. Si no hay partidos hoy, el próximo programado; si no, el último.
  const fmtDia = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  const hoyStr = fmtDia(new Date());
  const ahora = Date.now();
  const targetPartido =
    partidos.find((p) => fmtDia(p.fechaHoraUtc) === hoyStr) ??
    partidos.find((p) => p.fechaHoraUtc.getTime() >= ahora) ??
    partidos[partidos.length - 1];
  const targetId = targetPartido?.id;

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
      <PushPromptBanner />
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
                <div className="space-y-3 stagger">
                  {ps.map((p: (typeof partidos)[number]) => (
                    <div key={p.id} id={p.id === targetId ? "fixture-hoy" : undefined} className="scroll-mt-20">
                      <MatchCard
                        partido={{
                          ...p,
                          miPrediccion: p.predicciones[0] ?? null,
                        }}
                      />
                    </div>
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

      {targetId && <JumpToTodayButton />}
    </AppShell>
  );
}
