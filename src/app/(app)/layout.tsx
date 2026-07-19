import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esPollaFinalizada, getTabla } from "@/lib/standings";
import { CampeonModal } from "@/components/campeon/CampeonModal";

// Estados de todos los partidos: se comparte con /fixture y /tabla (mismo tag
// "tabla", así se invalida junto con la tabla de posiciones cuando cambia un
// resultado). Layout de todas las páginas autenticadas: se evalúa una sola
// vez por carga completa, no en cada navegación interna.
const getEstadosPartidos = unstable_cache(
  () => prisma.partido.findMany({ select: { estado: true } }),
  ["partidos-estados"],
  { revalidate: 60, tags: ["tabla"] }
);

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const partidos = await getEstadosPartidos();
  const podio = esPollaFinalizada(partidos) ? (await getTabla()).slice(0, 3) : null;

  return (
    <>
      {podio && podio.length > 0 && (
        <CampeonModal
          podio={podio.map(({ userId, nombre, puntosTotales, plenos }) => ({
            userId,
            nombre,
            puntosTotales,
            plenos,
          }))}
        />
      )}
      {children}
    </>
  );
}
