import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Obtener todos los jugadores
  const usuarios = await prisma.user.findMany({
    where: { rol: "jugador" },
    select: { id: true, nombre: true },
  });

  console.log("Usuarios encontrados:", usuarios.map((u) => u.nombre).join(", "));

  if (usuarios.length === 0) {
    console.log("No hay jugadores registrados.");
    return;
  }

  // Crear partido de prueba finalizado
  const partido = await prisma.partido.create({
    data: {
      externalId: 99999,
      fase: "grupos",
      equipoLocal: "Argentina",
      equipoVisitante: "Mexico",
      codigoLocal: "ARG",
      codigoVisitante: "MEX",
      fechaHoraUtc: new Date("2026-06-11T18:00:00Z"),
      estado: "finalizado",
      golesLocal: 2,
      golesVisitante: 0,
    },
  });

  console.log("Partido creado:", partido.id);

  // Predicciones variadas para cada usuario
  const prediccionesBase = [
    { golesLocal: 2, golesVisitante: 0 }, // achunta (pleno)
    { golesLocal: 1, golesVisitante: 0 }, // resultado correcto
    { golesLocal: 2, golesVisitante: 1 }, // goles local correcto
    { golesLocal: 0, golesVisitante: 1 }, // nada
    { golesLocal: 3, golesVisitante: 1 }, // resultado correcto
    { golesLocal: 1, golesVisitante: 1 }, // nada
  ];

  for (let i = 0; i < usuarios.length; i++) {
    const pred = prediccionesBase[i % prediccionesBase.length];
    const gl = pred.golesLocal;
    const gv = pred.golesVisitante;
    const rl = 2, rv = 0; // resultado real

    // Calcular puntos manualmente (grupos: resultado=5, c/gol=2, diferencia=1)
    let puntos = 0;
    const resultadoCorrecto = (gl > gv) === (rl > rv) && (gl === gv) === (rl === rv);
    if (resultadoCorrecto) puntos += 5;
    if (gl === rl) puntos += 2;
    if (gv === rv) puntos += 2;
    if ((gl - gv) === (rl - rv)) puntos += 1;

    await prisma.prediccion.create({
      data: {
        userId: usuarios[i].id,
        partidoId: partido.id,
        golesLocal: gl,
        golesVisitante: gv,
        puntos,
      },
    });

    console.log(`  ${usuarios[i].nombre}: ${gl}-${gv} → ${puntos} pts`);
  }

  console.log("Listo.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
