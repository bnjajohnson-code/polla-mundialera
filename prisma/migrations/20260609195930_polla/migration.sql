-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'jugador');

-- CreateEnum
CREATE TYPE "FasePartido" AS ENUM ('grupos', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('programado', 'en_juego', 'finalizado', 'aplazado');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Role" NOT NULL DEFAULT 'jugador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partidos" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER,
    "fase" "FasePartido" NOT NULL,
    "grupo" TEXT,
    "jornada" INTEGER,
    "equipoLocal" TEXT NOT NULL,
    "equipoVisitante" TEXT NOT NULL,
    "codigoLocal" TEXT,
    "codigoVisitante" TEXT,
    "fechaHoraUtc" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'programado',
    "golesLocal" INTEGER,
    "golesVisitante" INTEGER,
    "golesLocalReg" INTEGER,
    "golesVisitanteReg" INTEGER,
    "resultadoManual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicciones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "golesLocal" INTEGER NOT NULL,
    "golesVisitante" INTEGER NOT NULL,
    "puntos" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "nombrePolla" TEXT NOT NULL DEFAULT 'Polla Mundialera 2026',
    "codigoInvitacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "partidoId" TEXT,
    "canal" TEXT NOT NULL,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notif_preferencias" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "avisoInicio" BOOLEAN NOT NULL DEFAULT true,
    "avisoFaltante24h" BOOLEAN NOT NULL DEFAULT true,
    "avisoFaltante2h" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notif_preferencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partidos_externalId_key" ON "partidos"("externalId");

-- CreateIndex
CREATE INDEX "partidos_fechaHoraUtc_idx" ON "partidos"("fechaHoraUtc");

-- CreateIndex
CREATE INDEX "partidos_estado_idx" ON "partidos"("estado");

-- CreateIndex
CREATE INDEX "predicciones_userId_idx" ON "predicciones"("userId");

-- CreateIndex
CREATE INDEX "predicciones_partidoId_idx" ON "predicciones"("partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "predicciones_userId_partidoId_key" ON "predicciones"("userId", "partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_codigoInvitacion_key" ON "configuracion"("codigoInvitacion");

-- CreateIndex
CREATE INDEX "notificaciones_userId_leido_idx" ON "notificaciones"("userId", "leido");

-- CreateIndex
CREATE INDEX "notificaciones_tipo_partidoId_idx" ON "notificaciones"("tipo", "partidoId");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "notif_preferencias_userId_key" ON "notif_preferencias"("userId");

-- AddForeignKey
ALTER TABLE "predicciones" ADD CONSTRAINT "predicciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicciones" ADD CONSTRAINT "predicciones_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notif_preferencias" ADD CONSTRAINT "notif_preferencias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
