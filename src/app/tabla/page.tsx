import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StandingsTable } from "@/components/standings/StandingsTable";
import type { PosicionTabla } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TablaPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const usuarios = await prisma.user.findMany({
    include: {
      predicciones: {
        where: { partido: { estado: "finalizado" } },
        select: {
          puntos: true,
          partido: { select: { fase: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const tabla: PosicionTabla[] = usuarios.map((user) => {
    const preds = user.predicciones;
    const puntosTotales = preds.reduce((s, p) => s + (p.puntos ?? 0), 0);
    const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);
    const plenos = preds.filter(
      (p) => p.puntos !== null && p.puntos === maxPorFase(p.partido.fase)
    ).length;
    const aciertosResultado = preds.filter(
      (p) => p.puntos !== null && p.puntos >= (p.partido.fase === "grupos" ? 5 : 10)
    ).length;

    return {
      userId: user.id,
      nombre: user.nombre,
      puntosTotales,
      plenos,
      aciertosResultado,
      partidosConPronostico: preds.length,
      createdAt: user.createdAt,
      posicion: 0,
      cambio: 0,
    };
  });

  tabla.sort((a, b) => {
    if (b.puntosTotales !== a.puntosTotales) return b.puntosTotales - a.puntosTotales;
    if (b.plenos !== a.plenos) return b.plenos - a.plenos;
    if (b.aciertosResultado !== a.aciertosResultado)
      return b.aciertosResultado - a.aciertosResultado;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  tabla.forEach((t, i) => { t.posicion = i + 1; });

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
                {leader.puntosTotales} puntos · {leader.plenos} plenos
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 px-4">
          <span>Pts = Puntos totales</span>
          <span>⭐ = Plenos</span>
          <span>✓ = Resultados</span>
        </div>
      </div>

      <StandingsTable tabla={tabla} />
    </AppShell>
  );
}
