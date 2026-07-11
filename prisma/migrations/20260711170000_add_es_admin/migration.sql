-- AlterTable
ALTER TABLE "users" ADD COLUMN "esAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Data migration: los administradores que SON personas reales (todos menos la
-- cuenta de sistema admin@polla.com) pasan a ser jugadores con privilegios de
-- admin, para que vuelvan a participar y aparecer en la tabla de posiciones.
UPDATE "users"
SET "esAdmin" = true, "rol" = 'jugador'
WHERE "rol" = 'admin' AND "email" <> 'admin@polla.com';
