/**
 * Motor de notificaciones.
 * Corre dentro del sync (cron unificado), solo dentro de la ventana de partidos.
 * Lógica: un único recordatorio de pronóstico faltante ~1h antes de cada partido,
 * dirigido solo a los usuarios que aún no han pronosticado ese partido.
 */

import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { sendEmailFaltantePronostico } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";
import { formatTeamEs } from "@/lib/teams";

const WINDOW_MINS = 15; // Buscar partidos en ventana de ±15 min del trigger

/**
 * Calcula el líder actual de la tabla (mismo criterio que la página de Tabla).
 * Solo cuenta jugadores (rol "jugador"). Devuelve null si nadie tiene puntos.
 */
async function obtenerLider(): Promise<{ userId: string; nombre: string; puntos: number } | null> {
  const usuarios = await prisma.user.findMany({
    where: { rol: "jugador" },
    include: {
      predicciones: {
        where: { partido: { estado: "finalizado" } },
        select: { puntos: true, partido: { select: { fase: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const maxPorFase = (fase: string) => (fase === "grupos" ? 10 : 20);

  const tabla = usuarios.map((u) => {
    const preds = u.predicciones;
    const puntos = preds.reduce((s, p) => s + (p.puntos ?? 0), 0);
    const plenos = preds.filter((p) => p.puntos !== null && p.puntos === maxPorFase(p.partido.fase)).length;
    const aciertos = preds.filter((p) => p.puntos !== null && p.puntos >= (p.partido.fase === "grupos" ? 5 : 10)).length;
    return { userId: u.id, nombre: u.nombre, puntos, plenos, aciertos, createdAt: u.createdAt };
  });

  tabla.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.plenos !== a.plenos) return b.plenos - a.plenos;
    if (b.aciertos !== a.aciertos) return b.aciertos - a.aciertos;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const top = tabla[0];
  if (!top || top.puntos <= 0) return null;
  return { userId: top.userId, nombre: top.nombre, puntos: top.puntos };
}

/**
 * Detecta si el líder de la tabla cambió respecto al guardado en Configuración
 * y, de ser así, notifica a todos. Se llama después de recalcular puntos.
 */
export async function notificarCambioLider(): Promise<void> {
  const lider = await obtenerLider();
  if (!lider) return;

  const config = await prisma.configuracion.findFirst();
  if (!config) return;

  // Sin cambio respecto al líder ya registrado
  if (config.liderActualId === lider.userId) return;

  // Primera vez (líder aún no registrado): inicializar en silencio para no
  // emitir un aviso falso al desplegar la feature con un líder ya establecido.
  const esInicializacion = config.liderActualId === null;

  await prisma.configuracion.update({
    where: { id: config.id },
    data: { liderActualId: lider.userId },
  });

  if (esInicializacion) return;

  // A pedido: no avisar cuando Catalina pasa a liderar (sí se registra el
  // cambio arriba, para que cuando alguien la destrone sí se notifique).
  const CATALINA_USER_ID = "cmq9uis4a000g3v80cilqwwse";
  if (lider.userId === CATALINA_USER_ID) return;

  const titulo = `👑 Nuevo líder: ${lider.nombre}`;
  const mensaje = `${lider.nombre} toma la punta de la polla con ${lider.puntos} puntos.`;

  const usuarios = await prisma.user.findMany({
    include: { notifPrefs: true, pushSubs: true },
  });

  await prisma.notificacion.createMany({
    data: usuarios.map((user) => ({
      userId: user.id, tipo: "cambio_lider", canal: "in_app", enviado: true, titulo, mensaje,
    })),
  });

  await Promise.allSettled(
    usuarios
      .filter((u) => u.notifPrefs?.pushEnabled && u.pushSubs.length > 0)
      .flatMap((u) => u.pushSubs)
      .map((sub) =>
        sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
          title: titulo,
          body: mensaje,
          url: "/tabla",
        })
      )
  );
}

/**
 * Notifica a todos los suscritos que un partido finalizó y la tabla se actualizó.
 * Idempotente: si ya se notificó este partido, no hace nada (el sync corre cada 5 min).
 */
export async function notificarResultadoFinal(
  partidoId: string,
  golesLocal: number,
  golesVisitante: number
): Promise<void> {
  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) return;

  // Dedup global por partido
  const yaNotificado = await prisma.notificacion.findFirst({
    where: { tipo: "resultado_final", partidoId },
  });
  if (yaNotificado) return;

  const local = formatTeamEs(partido.equipoLocal, partido.codigoLocal);
  const visitante = formatTeamEs(partido.equipoVisitante, partido.codigoVisitante);
  const titulo = `🏁 Final: ${local} ${golesLocal} – ${golesVisitante} ${visitante}`;
  const mensaje = "Se actualizó la tabla de posiciones. ¡Revisa tus puntos!";

  const usuarios = await prisma.user.findMany({
    include: { notifPrefs: true, pushSubs: true },
  });

  await prisma.notificacion.createMany({
    data: usuarios.map((user) => ({
      userId: user.id, tipo: "resultado_final", partidoId, canal: "in_app", enviado: true, titulo, mensaje,
    })),
  });

  // allSettled: una suscripción expirada no bloquea al resto
  await Promise.allSettled(
    usuarios
      .filter((u) => u.notifPrefs?.pushEnabled && u.pushSubs.length > 0)
      .flatMap((u) => u.pushSubs)
      .map((sub) =>
        sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
          title: titulo,
          body: mensaje,
          url: "/tabla",
        })
      )
  );
}

/**
 * Notifica a todos los suscritos que el horario de un partido cambió (ej.
 * corrección manual del admin por clima). Se llama justo después de guardar
 * el nuevo horario; sin dedup porque cada cambio es un evento puntual
 * disparado a mano, no algo que el cron repita.
 */
export async function notificarCambioHorario(
  partidoId: string,
  nuevaFechaUtc: Date
): Promise<void> {
  const partido = await prisma.partido.findUnique({ where: { id: partidoId } });
  if (!partido) return;

  const local = formatTeamEs(partido.equipoLocal, partido.codigoLocal);
  const visitante = formatTeamEs(partido.equipoVisitante, partido.codigoVisitante);
  const horaSantiago = formatInTimeZone(nuevaFechaUtc, "America/Santiago", "HH:mm", { locale: es });
  const titulo = `⏰ Cambio de horario: ${local} vs ${visitante}`;
  const mensaje = `El partido ahora juega a las ${horaSantiago} (hora Chile). Revisa que tu pronóstico siga a tiempo.`;

  const usuarios = await prisma.user.findMany({
    include: { notifPrefs: true, pushSubs: true },
  });

  await prisma.notificacion.createMany({
    data: usuarios.map((user) => ({
      userId: user.id, tipo: "cambio_horario", partidoId, canal: "in_app", enviado: true, titulo, mensaje,
    })),
  });

  await Promise.allSettled(
    usuarios
      .filter((u) => u.notifPrefs?.pushEnabled && u.pushSubs.length > 0)
      .flatMap((u) => u.pushSubs)
      .map((sub) =>
        sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
          title: titulo,
          body: mensaje,
          url: "/fixture",
        })
      )
  );
}

export async function procesarNotificaciones(): Promise<{ enviadas: number; errores: number }> {
  const ahora = new Date();
  // Único recordatorio: pronóstico faltante ~1h antes del partido, solo a
  // quienes aún no han pronosticado. (Se eliminaron los avisos de 24h y el de
  // "inicio de partido" para reducir carga de consultas/notificaciones.)
  const enviadas = await notificarFaltantes(ahora, 1);
  return { enviadas, errores: 0 };
}

async function notificarFaltantes(
  ahora: Date,
  horasAntes: number
): Promise<number> {
  let enviadas = 0;
  const target = new Date(ahora.getTime() + horasAntes * 60 * 60 * 1000);
  const ventanaMin = new Date(target.getTime() - WINDOW_MINS * 60 * 1000);
  const ventanaMax = new Date(target.getTime() + WINDOW_MINS * 60 * 1000);

  const partidos = await prisma.partido.findMany({
    where: {
      estado: { in: ["programado", "en_juego"] },
      fechaHoraUtc: { gte: ventanaMin, lte: ventanaMax },
    },
  });

  if (partidos.length === 0) return 0;

  const tipo = `faltante_${horasAntes}h`;

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

  // Dedup en una sola query: el cron corre cada 15 min con ventana de ±15 min,
  // sin esto se duplicarían los envíos.
  const yaEnviadas = await prisma.notificacion.findMany({
    where: {
      tipo,
      partidoId: { in: partidos.map((p) => p.id) },
      userId: { in: usuarios.map((u) => u.id) },
    },
    select: { userId: true, partidoId: true },
  });
  const enviadasSet = new Set(yaEnviadas.map((n) => `${n.userId}|${n.partidoId}`));

  for (const user of usuarios) {
    const prefs = user.notifPrefs;
    // El recordatorio cercano se controla con la preferencia avisoFaltante2h.
    if (prefs && !prefs.avisoFaltante2h) continue;

    const partidosPredecidos = new Set(user.predicciones.map((p) => p.partidoId));
    const faltantes = partidos.filter((p) => !partidosPredecidos.has(p.id));

    if (faltantes.length === 0) continue;

    const nuevos = faltantes.filter((p) => !enviadasSet.has(`${user.id}|${p.id}`));
    if (nuevos.length === 0) continue;

    await prisma.notificacion.createMany({
      data: nuevos.map((partido) => ({
        userId: user.id,
        tipo,
        partidoId: partido.id,
        canal: "in_app",
        enviado: true,
        titulo: `⚠️ Pronóstico pendiente: ${formatTeamEs(partido.equipoLocal, partido.codigoLocal)} vs ${formatTeamEs(partido.equipoVisitante, partido.codigoVisitante)}`,
        mensaje: `Tienes ${horasAntes}h para ingresar tu pronóstico.`,
      })),
    });

    // Email (agrupa todos los faltantes en un correo)
    if (!prefs || prefs.emailEnabled) {
      try {
        await sendEmailFaltantePronostico(
          user.email,
          user.nombre,
          nuevos.map((p) => ({
            equipoLocal: formatTeamEs(p.equipoLocal, p.codigoLocal),
            equipoVisitante: formatTeamEs(p.equipoVisitante, p.codigoVisitante),
            fechaHoraUtc: p.fechaHoraUtc,
          })),
          horasAntes
        );
        enviadas++;
      } catch {
        // silencioso
      }
    }

    // Push (en paralelo; una suscripción expirada no bloquea al resto)
    if (prefs?.pushEnabled && user.pushSubs.length > 0) {
      const resultados = await Promise.allSettled(
        user.pushSubs.map((sub) =>
          sendPushNotification(sub.endpoint, sub.p256dh, sub.auth, {
            title: `⚠️ Te faltan ${nuevos.length} pronóstico(s)`,
            body: `Tienes ${horasAntes}h para ingresar tus predicciones.`,
            url: "/fixture",
          })
        )
      );
      enviadas += resultados.filter((r) => r.status === "fulfilled").length;
    }
  }

  return enviadas;
}
