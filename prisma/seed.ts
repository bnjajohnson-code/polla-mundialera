import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// Partidos de prueba (fixture simulado del Mundial 2026)
const PARTIDOS_SEED = [
  // Fase de grupos – Jornada 1 (ya finalizados)
  {
    externalId: 1001,
    fase: "grupos" as const,
    grupo: "Grupo A",
    jornada: 1,
    equipoLocal: "México",
    equipoVisitante: "Polonia",
    codigoLocal: "MEX",
    codigoVisitante: "POL",
    fechaHoraUtc: new Date("2026-06-11T18:00:00Z"),
    estado: "finalizado" as const,
    golesLocal: 2,
    golesVisitante: 0,
    golesLocalReg: 2,
    golesVisitanteReg: 0,
  },
  {
    externalId: 1002,
    fase: "grupos" as const,
    grupo: "Grupo A",
    jornada: 1,
    equipoLocal: "Argentina",
    equipoVisitante: "Arabia Saudita",
    codigoLocal: "ARG",
    codigoVisitante: "KSA",
    fechaHoraUtc: new Date("2026-06-11T21:00:00Z"),
    estado: "finalizado" as const,
    golesLocal: 3,
    golesVisitante: 1,
    golesLocalReg: 3,
    golesVisitanteReg: 1,
  },
  {
    externalId: 1003,
    fase: "grupos" as const,
    grupo: "Grupo B",
    jornada: 1,
    equipoLocal: "España",
    equipoVisitante: "Marruecos",
    codigoLocal: "ESP",
    codigoVisitante: "MAR",
    fechaHoraUtc: new Date("2026-06-12T16:00:00Z"),
    estado: "finalizado" as const,
    golesLocal: 1,
    golesVisitante: 0,
    golesLocalReg: 1,
    golesVisitanteReg: 0,
  },
  // Próximos (sin finalizar)
  {
    externalId: 1004,
    fase: "grupos" as const,
    grupo: "Grupo B",
    jornada: 1,
    equipoLocal: "Francia",
    equipoVisitante: "Australia",
    codigoLocal: "FRA",
    codigoVisitante: "AUS",
    fechaHoraUtc: new Date(Date.now() + 2 * 60 * 60 * 1000), // en 2 horas
    estado: "programado" as const,
    golesLocal: null,
    golesVisitante: null,
    golesLocalReg: null,
    golesVisitanteReg: null,
  },
  {
    externalId: 1005,
    fase: "grupos" as const,
    grupo: "Grupo C",
    jornada: 1,
    equipoLocal: "Brasil",
    equipoVisitante: "Croacia",
    codigoLocal: "BRA",
    codigoVisitante: "CRO",
    fechaHoraUtc: new Date(Date.now() + 26 * 60 * 60 * 1000), // mañana
    estado: "programado" as const,
    golesLocal: null,
    golesVisitante: null,
    golesLocalReg: null,
    golesVisitanteReg: null,
  },
  {
    externalId: 1006,
    fase: "grupos" as const,
    grupo: "Grupo C",
    jornada: 1,
    equipoLocal: "Alemania",
    equipoVisitante: "Japón",
    codigoLocal: "GER",
    codigoVisitante: "JPN",
    fechaHoraUtc: new Date(Date.now() + 50 * 60 * 60 * 1000), // en 2 días
    estado: "programado" as const,
    golesLocal: null,
    golesVisitante: null,
    golesLocalReg: null,
    golesVisitanteReg: null,
  },
  // Fase eliminatoria – ejemplo
  {
    externalId: 2001,
    fase: "octavos" as const,
    grupo: null,
    jornada: null,
    equipoLocal: "Ganador Grupo A",
    equipoVisitante: "2do Grupo B",
    codigoLocal: "TBD",
    codigoVisitante: "TBD",
    fechaHoraUtc: new Date("2026-07-02T20:00:00Z"),
    estado: "programado" as const,
    golesLocal: null,
    golesVisitante: null,
    golesLocalReg: null,
    golesVisitanteReg: null,
  },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Configuración de la polla
  const codigo = crypto.randomBytes(4).toString("hex").toUpperCase();
  const config = await prisma.configuracion.upsert({
    where: { codigoInvitacion: "SEED0000" },
    update: {},
    create: {
      nombrePolla: "Polla Mundialera 2026",
      codigoInvitacion: "SEED0000",
    },
  });
  console.log(`📋 Código de invitación: ${config.codigoInvitacion}`);

  // Usuarios de prueba
  const pass = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@polla.com" },
    update: {},
    create: {
      nombre: "Admin",
      email: "admin@polla.com",
      password: pass,
      rol: "admin",
      notifPrefs: { create: {} },
    },
  });

  const jugadores = await Promise.all(
    [
      { nombre: "Carlos González", email: "carlos@example.com" },
      { nombre: "María Rodríguez", email: "maria@example.com" },
      { nombre: "Felipe Torres", email: "felipe@example.com" },
      { nombre: "Ana Martínez", email: "ana@example.com" },
      { nombre: "Pedro Sánchez", email: "pedro@example.com" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, password: pass, notifPrefs: { create: {} } },
      })
    )
  );

  console.log(`👥 ${1 + jugadores.length} usuarios creados`);

  // Partidos
  for (const p of PARTIDOS_SEED) {
    await prisma.partido.upsert({
      where: { externalId: p.externalId },
      update: {
        estado: p.estado,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
      },
      create: p,
    });
  }
  console.log(`⚽ ${PARTIDOS_SEED.length} partidos creados`);

  // Predicciones para partidos finalizados
  const finalizados = await prisma.partido.findMany({
    where: { estado: "finalizado" },
  });

  const todosUsuarios = [admin, ...jugadores];
  for (const partido of finalizados) {
    for (let i = 0; i < todosUsuarios.length; i++) {
      const user = todosUsuarios[i];
      // Generar pronósticos aleatorios realistas
      const gl = Math.floor(Math.random() * 4);
      const gv = Math.floor(Math.random() * 3);

      await prisma.prediccion.upsert({
        where: { userId_partidoId: { userId: user.id, partidoId: partido.id } },
        update: {},
        create: {
          userId: user.id,
          partidoId: partido.id,
          golesLocal: gl,
          golesVisitante: gv,
        },
      });
    }
  }

  // Recalcular puntos para partidos finalizados
  const { recalcularPredicciones } = await import("../src/lib/scoring");

  for (const partido of finalizados) {
    if (partido.golesLocal === null || partido.golesVisitante === null) continue;

    const preds = await prisma.prediccion.findMany({
      where: { partidoId: partido.id },
      select: { id: true, golesLocal: true, golesVisitante: true },
    });

    const puntosMap = recalcularPredicciones(
      preds,
      partido.golesLocal,
      partido.golesVisitante,
      partido.fase
    );

    for (const [predId, puntos] of Array.from(puntosMap)) {
      await prisma.prediccion.update({ where: { id: predId }, data: { puntos } });
    }
  }

  console.log("✅ Predicciones y puntos calculados");
  console.log("\n📌 Credenciales de prueba:");
  console.log("   Admin:    admin@polla.com / password123");
  console.log("   Jugador:  carlos@example.com / password123");
  console.log(`   Código:   ${config.codigoInvitacion}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
