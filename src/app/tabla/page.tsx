import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationPanel } from "@/components/standings/SimulationPanel";
import { obtenerTabla } from "@/lib/standings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// La tabla es idéntica para todos los jugadores y solo cambia cuando finaliza un
// partido. La cacheamos 60s para que múltiples refrescos durante un partido no
// despierten/consulten la base de Neon en cada visita (ahorro de compute).
const getTabla = unstable_cache(obtenerTabla, ["tabla-posiciones"], {
  revalidate: 60,
  tags: ["tabla"],
});

// Partidos cerrados (en juego o ya bloqueados) sin resultado final: los únicos
// simulables. Depende del reloj, así que se consulta fuera del cache de la tabla.
async function getPartidosSimulables() {
  const cierre = new Date(Date.now() + 10 * 60 * 1000);
  return prisma.partido.findMany({
    where: {
      OR: [
        { estado: "en_juego" },
        { estado: "programado", fechaHoraUtc: { lte: cierre } },
      ],
    },
    orderBy: { fechaHoraUtc: "asc" },
    select: {
      id: true,
      equipoLocal: true,
      equipoVisitante: true,
      codigoLocal: true,
      codigoVisitante: true,
    },
  });
}

export default async function TablaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [tabla, simulables] = await Promise.all([getTabla(), getPartidosSimulables()]);
  const leader = tabla[0];

  return (
    <AppShell title="Tabla de Posiciones">
      {leader && (
        <div className="card p-4 mb-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-900">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥇</span>
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100">{leader.nombre}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {leader.puntosTotales} puntos · {leader.plenos} achuntes
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center gap-4 flex-wrap text-xs text-gray-400 dark:text-gray-500 px-4">
          <span>Pts = Puntos totales</span>
          <span>⭐ = Achuntes</span>
          <span>✓ = Resultados</span>
          <span>⏳ = Pago pendiente</span>
        </div>
      </div>

      <SimulationPanel tabla={tabla} partidos={simulables} />

      {tabla.length > 0 && (
        <div className="mt-4 card p-4 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-1">Pozo acumulado</p>
          <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
            ${(tabla.length * 10000).toLocaleString("es-CL")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {tabla.length} participante{tabla.length !== 1 ? "s" : ""} × $10.000
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            🥇 1° lugar: 60% &nbsp;·&nbsp; 🥈 2° lugar: 30% &nbsp;·&nbsp; 🥉 3° lugar: 10%
          </p>
        </div>
      )}
    </AppShell>
  );
}
