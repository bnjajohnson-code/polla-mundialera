import { formatHoraPartido, formatFechaPartido } from "@/lib/utils";

// Envío vía Brevo (plan gratuito: 300 emails/día).
// Requiere BREVO_API_KEY y BREVO_FROM_EMAIL (remitente verificado en Brevo).
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "";
const FROM_NAME = "Polla Mundialera";

async function sendBrevoEmail(to: string, subject: string, html: string): Promise<void> {
  if (!BREVO_API_KEY || !FROM_EMAIL) {
    console.log("[email] BREVO_API_KEY/BREVO_FROM_EMAIL no configurados, email omitido");
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo respondió ${res.status}: ${body}`);
  }
}

interface MatchInfo {
  equipoLocal: string;
  equipoVisitante: string;
  fechaHoraUtc: Date;
}

export async function sendEmailFaltantePronostico(
  to: string,
  nombre: string,
  partidos: MatchInfo[],
  horasAntes: 24 | 2
): Promise<void> {
  const listaPartidos = partidos
    .map(
      (p) =>
        `<li><strong>${p.equipoLocal} vs ${p.equipoVisitante}</strong> — ${formatFechaPartido(p.fechaHoraUtc)} a las ${formatHoraPartido(p.fechaHoraUtc)} (Santiago)</li>`
    )
    .join("\n");

  const asunto =
    horasAntes === 24
      ? `⚽ Te faltan ${partidos.length} pronóstico(s) para mañana`
      : `⏰ ¡Últimas ${horasAntes} horas! Pronósticos pendientes`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚽ Polla Mundialera 2026</h1>
    </div>
    <div style="padding: 28px 24px;">
      <p style="color: #374151; font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
      <p style="color: #374151; font-size: 16px;">
        Te faltan pronósticos para los siguientes partidos que inician en menos de <strong>${horasAntes} hora(s)</strong>:
      </p>
      <ul style="color: #374151; font-size: 15px; line-height: 2;">
        ${listaPartidos}
      </ul>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${process.env.NEXTAUTH_URL}/fixture"
           style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Ingresar pronósticos ahora →
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">
        Los pronósticos se bloquean al inicio de cada partido.
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendBrevoEmail(to, asunto, html);
}

export async function sendEmailInicioPartido(
  to: string,
  nombre: string,
  partido: MatchInfo
): Promise<void> {
  const asunto = `🔔 En 1 hora: ${partido.equipoLocal} vs ${partido.equipoVisitante}`;
  const hora = formatHoraPartido(partido.fechaHoraUtc);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚽ Polla Mundialera 2026</h1>
    </div>
    <div style="padding: 28px 24px; text-align: center;">
      <p style="color: #374151; font-size: 16px;">Hola <strong>${nombre}</strong>,</p>
      <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">En 1 hora comienza</p>
      <h2 style="color: #1e3a8a; font-size: 26px; margin: 8px 0;">
        ${partido.equipoLocal} vs ${partido.equipoVisitante}
      </h2>
      <p style="color: #374151; font-size: 18px; font-weight: bold; margin: 4px 0;">🕐 ${hora} (Santiago)</p>
      <div style="margin: 24px 0;">
        <a href="${process.env.NEXTAUTH_URL}/fixture"
           style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
          Ver mis pronósticos →
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px;">
        Recuerdas que los pronósticos se bloquean al inicio del partido.
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendBrevoEmail(to, asunto, html);
}
