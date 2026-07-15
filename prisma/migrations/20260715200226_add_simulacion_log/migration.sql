-- CreateTable
CREATE TABLE "simulacion_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "golesLocal" INTEGER NOT NULL,
    "golesVisitante" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulacion_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulacion_logs_userId_idx" ON "simulacion_logs"("userId");

-- AddForeignKey
ALTER TABLE "simulacion_logs" ADD CONSTRAINT "simulacion_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
