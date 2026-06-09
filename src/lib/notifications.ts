/**
 * Motor de notificaciones.
 * Corre desde Vercel Cron cada hora.
 * Lógica:
 * 1. Busca partidos que inician en ~1h → notifica a todos (inicio_partido)
 * 2. Busca partidos en 24h y 2h → notifica a usuarios sin pronóstico (faltante_*)
 */

import { prisma } from "@/lib/prisma";
import { sendEmailFaltantePronostico, sendEmailInicioPartido } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
import { formatHoraPartido } from "@/lib/utils";

const WINDOW_MINS = 15; // Buscar partidos en ventana de ±15 min del trigger

export async function procesarNotificaciones(): Promise<{ enviadas: number; errores: number }> {
  const ahora = new Date();
  let enviadas = 0;
  let errores = 0;

  // ── 1. Notificaciones de inicio de partido (1h antes) ─────────────────────
  const en1h = new Date(ahora.getTime() + 60 * 60 * 1000);
  const ventana1hMin = new Date(en1h.getTime() - WINDOW_MINS * 60 * 1000);
  const ventana1hMax = new Date(en1h.getTime() + WINDOW_MINS * 60 * 1000);

  const partidosEn1h = await prisma.partido.findMany({
    where: {
      estado: "programado",
      fechaHoraUtc: { gte: ventana1hMin, lte: ventana1hMax },
    },
  });

  for (const partido of partidosEn1h) {
    const usuarios = await prisma.user.findMany({
      include: { notifPrefs: true, pushSubs: true },
    });

    for (const user of usuarios) {
      const prefs = user.notifPrefs;
      if (prefs && !prefs.avisoInicio) continue;

      // Verificar que no se haya enviado ya
      const yaEnviado = await prisma.notificacion.findFirst({
        where: {
          userId: user.id,
          tipo: "inicio_partido",
          partidoId: partido.id,
        },
      });
      if (yaEnviado) continue;

      const titulo = `⚽ En 1 hora: ${partido.equipoLocal} vs ${partido.equipoVisitante}`;
      const mensaje = `El partido comienza a las ${formatHoraPartido(partido.fechaHoraUtc)} (Santiago).`;

      // Guardar notificación in-app
      await prisma.notificacion.create({
        data: {
          userId: user.id,
          tipo: "inicio_partido",
          partidoId: partido.id,
          canal: "in_app",
          enviado: true,
          titulo,
          mensaje,
        },
      });

      // Email
      if (!prefs || prefs.emailEnabled) {
        try {
          await sendEmailInicioPartido(user.email, user.nombre, {
            equipoLocal: partido.equipoLocal,
            equipoVisitante: partido.equipoVisitante,
            fechaHoraUtc: partido.fechaHoraUtc,
          });
          await prisma.notificacion.create({
            data: { userId: user.id, tipo: "inicio_partido", partidoId: partido.id, canal: "email", enviado: true, titulo, mensaje },
          });
          enviadas++;
        } catch {
          errores++;
        }
      }

      // Push
      if (prefs?.pushEnabled && user.pushSubs.length > 0) {
        for (const sub of user.pushSubs) {
          try {
            await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
              title: titulo,
              body: mensaje,
              url: "/fixture",
            });
            enviadas++;
          } catch {
            errores++;
          }
        }
      }
    }
  }

  // ── 2. Recordatorio pronóstico faltante (24h antes) ───────────────────────
  enviadas += await notificarFaltantes(ahora, 24, errores);

  // ── 3. Recordatorio pronóstico faltante (2h antes) ────────────────────────
  enviadas += await notificarFaltantes(ahora, 2, errores);

  return { enviadas, errores };
}

async function notificarFaltantes(
  ahora: Date,
  horasAntes: 24 | 2,
  _errores: number
): Promise<number> {
  let enviadas = 0;
  const target = new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000);
  const ventanaMin = new Date(target.getTime() - WINDOW_MINS * 60 * 1000);
  const ventanaMax = new Date(target.getTime() + WINDOW_MINS * 60 * 1000);

  const partidos = await prisma.partido.findMany({
    where: {
      estado: "programado",
      fechaHoraUtc: { gte: ventanaMin, lte: ventanaMax },
    },
  });

  if (partidos.length === 0) return 0;

  const tipo = horasAntes === 24 ? "faltante_24h" : "faltante_2h";

  const usuarios = await prisma.user.findMany({
    include: {
      notifPrefs: true,
      pushSubs: true,
      predicciones: {
        where: {
          partidoId: { in: partidos.map((p) => p.id) },
        },
        select: { partidoId: true },
      },
    },
  });

  for (const user of usuarios) {
    const prefs = user.notifPrefs;
    const prefKey = horasAntes === 24 ? "avisoFaltante24h" : "avisoFaltante2h";
    if (prefs && !prefs[prefKey]) continue;

    const partidosPredecidos = new Set(user.predicciones.map((p) => p.partidoId));
    const faltantes = partidos.filter((p) => !partidosPredecidos.has(p.id));

    if (faltantes.length === 0) continue;

    // Verificar que no se haya enviado ya (tomamos el primer partido como clave)
    for (const partido of faltantes) {
      const yaEnviado = await prisma.notificacion.findFirst({
        where: { userId: user.id, tipo, partidoId: partido.id },
      });
      if (yaEnviado) continue;

      const titulo = `⚠️ Pronóstico pendiente: ${partido.equipoLocal} vs ${partido.equipoVisitante}`;
      const mensaje = `Tienes ${horasAntes}h para ingresar tu pronóstico.`;

      await prisma.notificacion.create({
        data: { userId: user.id, tipo, partidoId: partido.id, canal: "in_app", enviado: true, titulo, mensaje },
      });
    }

    // Email (agrupa todos los faltantes en un correo)
    if (!prefs || prefs.emailEnabled) {
      try {
        await sendEmailFaltantePronostico(
          user.email,
          user.nombre,
          faltantes.map((p) => ({
            equipoLocal: p.equipoLocal,
            equipoVisitante: p.equipoVisitante,
            fechaHoraUtc: p.fechaHoraUtc,
          })),
          horasAntes
        );
        enviadas++;
      } catch {
        // silencioso
      }
    }

    // Push
    if (prefs?.pushEnabled && user.pushSubs.length > 0) {
      for (const sub of user.pushSubs) {
        try {
          await sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
            title: `⚠️ Te faltan ${faltantes.length} pronóstico(s)`,
            body: `Tienes ${horasAntes}h para ingresar tus predicciones.`,
            url: "/fixture",
          });
          enviadas++;
        } catch {
          // silencioso
        }
      }
    }
  }

  return enviadas;
}
