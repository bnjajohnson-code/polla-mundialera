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

// Top 3 jugadores que más veces han usado el simulador. Se cachea igual que la
// tabla: solo cambia con nuevas simulaciones, no necesita ser en tiempo real.
const getNerviosos = unstable_cache(
  async () => {
    const grouped = await prisma.simulacionLog.groupBy({
      by: ["userId"],
      _count: { userId: true },
      orderBy: { _count: { userId: "desc" } },
      take: 3,
    });
    if (grouped.length === 0) return [];

    const usuarios = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, nombre: true },
    });
    const nombrePorId = new Map(usuarios.map((u) => [u.id, u.nombre]));

    return grouped.map((g) => ({
      userId: g.userId,
      nombre: nombrePorId.get(g.userId) ?? "Jugador",
      cantidad: g._count.userId,
    }));
  },
  ["tabla-nerviosos"],
  { revalidate: 60, tags: ["tabla"] }
);

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

  const [tabla, simulables, nerviosos] = await Promise.all([
    getTabla(),
    getPartidosSimulables(),
    getNerviosos(),
  ]);
  const leader = tabla[0];
  const medallas = ["🥇", "🥈", "🥉"];

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

      {nerviosos.length > 0 && (
        <div className="mt-4 card p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-semibold mb-3 text-center">
            Tabla de los nerviosos
          </p>
          <div className="space-y-2">
            {nerviosos.map((n, i) => (
              <div key={n.userId} className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medallas[i]}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{n.nombre}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {n.cantidad} simulación{n.cantidad !== 1 ? "es" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
