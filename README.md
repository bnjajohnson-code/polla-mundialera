# ⚽ Polla Mundialera 2026

Aplicación web de pronósticos para el Mundial de Fútbol 2026. Privada, para grupos de 10-30 personas.
Mobile-first, PWA instalable, notificaciones por email y push.

## Stack técnico

- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** vía Prisma ORM (compatible con Neon, Supabase — plan gratuito)
- **NextAuth v4** con credentials provider
- **Tailwind CSS** — diseño mobile-first
- **Resend** para email transaccional
- **Web Push** con VAPID para notificaciones push (PWA)
- **football-data.org** para resultados en tiempo real
- **Vercel Cron** para sincronización y notificaciones automáticas
- **Vitest** para tests unitarios

---

## Setup local

### 1. Clonar y dependencias

```bash
git clone <repo>
cd polla-mundialera
npm install
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Rellena cada variable (ver sección detallada abajo).

### 3. Base de datos

```bash
# Crear las tablas
npm run db:migrate

# Poblar con datos de prueba
npm run db:seed
```

### 4. Arrancar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Credenciales de prueba:
- **Admin:** `admin@polla.com` / `password123`
- **Jugador:** `carlos@example.com` / `password123`
- **Código de invitación:** `SEED0000`

### 5. Tests

```bash
npm test            # Ejecutar todos los tests
npm run test:watch  # Modo watch
```

---

## Variables de entorno

### `DATABASE_URL`
URL de conexión PostgreSQL. Ejemplos:

```
# Neon (recomendado para Vercel)
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/pollafutbol?sslmode=require"

# Supabase
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"

# Local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/polla_mundialera"
```

### `NEXTAUTH_URL`
URL completa de la app (sin trailing slash):
```
NEXTAUTH_URL="https://tu-app.vercel.app"
# En desarrollo:
NEXTAUTH_URL="http://localhost:3000"
```

### `NEXTAUTH_SECRET`
Genera con:
```bash
openssl rand -base64 32
```

### `FOOTBALL_DATA_API_KEY`
Regístrate gratis en [football-data.org](https://www.football-data.org/client/register).
El plan gratuito incluye acceso al Mundial (competition code `WC`).

### `RESEND_API_KEY`
Regístrate en [resend.com](https://resend.com) (plan gratuito: 100 emails/día, 3000/mes).

### `RESEND_FROM_EMAIL`
Dirección de envío. Requiere dominio verificado en Resend:
```
RESEND_FROM_EMAIL="Polla Mundialera <noreply@tu-dominio.com>"
```
Para desarrollo puedes usar `onboarding@resend.dev` (solo envía al email de tu cuenta Resend).

### VAPID Keys (Web Push)

Genera las claves VAPID con:
```bash
npx web-push generate-vapid-keys
```

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
VAPID_PRIVATE_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx..."
VAPID_SUBJECT="mailto:admin@tu-dominio.com"
```

### `CRON_SECRET`
Secreto para proteger los endpoints de cron:
```bash
openssl rand -base64 32
```

---

## Despliegue en Vercel + Neon

### 1. Crear base de datos en Neon
- Ve a [neon.tech](https://neon.tech) → New Project
- Copia el connection string (formato `postgresql://...`)

### 2. Desplegar en Vercel
```bash
npm i -g vercel
vercel --prod
```
O conecta el repositorio desde el dashboard de Vercel.

### 3. Variables de entorno en Vercel
En Vercel Dashboard → Settings → Environment Variables, añade todas las variables del `.env.example`.

### 4. Migración en producción
```bash
DATABASE_URL="tu-url-neon" npx prisma migrate deploy
```
O añade en el script de build de Vercel:
```
prisma migrate deploy && next build
```

### 5. Configurar Cron Jobs

Vercel Cron ya está configurado en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/notifications", "schedule": "0 * * * *" }
  ]
}
```

Los crons de Vercel envían `Authorization: Bearer <CRON_SECRET>` automáticamente.
Asegúrate de que `CRON_SECRET` esté configurado en las env vars de Vercel.

---

## Reglas del juego

### Puntuación por partido

| Criterio | Grupos | Eliminatorias |
|---|---|---|
| Acertar resultado (ganador o empate) | 5 pts | 10 pts |
| Acertar goles local | 2 pts | 4 pts |
| Acertar goles visitante | 2 pts | 4 pts |
| Acertar diferencia de goles | 1 pt | 2 pts |
| **Máximo** | **10 pts** | **20 pts** |

Los criterios son **acumulativos e independientes**.

### Bloqueo de predicciones
- Se pueden ingresar/editar pronósticos hasta el **momento exacto de inicio** del partido.
- El backend valida el bloqueo; no es posible saltárselo desde el frontend.

### Resultado en eliminatorias
- Solo cuentan los goles de los **90 minutos reglamentarios + tiempo de reposición**.
- Si el partido se va a alargue o penales, el marcador que puntúa es el del minuto 90.
- La API de football-data.org provee `score.regularTime` cuando hubo alargue; si no existe, se usa `score.fullTime`.

### Desempates en tabla
1. Puntos totales
2. Más plenos (10 pts en grupos / 20 pts en eliminatorias)
3. Más resultados acertados
4. Fecha de registro más antigua

---

## Sobre el marcador de 90 min (API)

`football-data.org` retorna:
- `score.fullTime`: marcador final del partido (incluye goles de alargue si los hubo)
- `score.regularTime`: marcador a los 90 min (solo existe si hubo alargue o penales)
- `score.duration`: `"REGULAR"` | `"EXTRA_TIME"` | `"PENALTY_SHOOTOUT"`

**Lógica en `src/lib/football-api.ts` (`getScoreRegular`)**:
- Si `duration` es `EXTRA_TIME` o `PENALTY_SHOOTOUT` **y** existe `regularTime` → usar `regularTime`
- Si no → usar `fullTime`

Si la API no trae `regularTime` correctamente (puede pasar en partidos más antiguos), el admin puede usar el **editor manual** en el panel de administración para corregir el resultado.

---

## PWA e íconos

La app es instalable como PWA. Para los íconos en producción, necesitas generar los archivos PNG en `public/icons/`. Puedes usar:
- [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator): `npx pwa-asset-generator ./public/icon-source.png ./public/icons --manifest ./public/manifest.json`
- [Favicon Generator](https://realfavicongenerator.net/)

---

## Estructura del proyecto

```
src/
├── app/
│   ├── fixture/        # Página principal con todos los partidos
│   ├── tabla/          # Tabla de posiciones
│   ├── partido/[id]/   # Detalle de partido con pronósticos del grupo
│   ├── jugador/[id]/   # Perfil de cualquier jugador
│   ├── perfil/         # Mi perfil + configuración de notificaciones
│   ├── admin/          # Panel de administración
│   ├── login/          # Inicio de sesión
│   ├── registro/       # Registro con código de invitación
│   └── api/            # Rutas API (REST)
├── components/
│   ├── layout/         # AppShell, Header, TabBar, PwaRegister
│   ├── fixture/        # MatchCard, PredictionStepper
│   ├── standings/      # StandingsTable
│   ├── notifications/  # MissingPredictionsBanner, PushNotifications
│   └── admin/          # AdminMatchEditor
├── lib/
│   ├── scoring.ts      # Lógica de puntuación (testeada)
│   ├── football-api.ts # Integración con football-data.org
│   ├── notifications.ts# Motor de notificaciones (email + push)
│   ├── email.ts        # Plantillas y envío con Resend
│   ├── push.ts         # Web Push con VAPID
│   ├── auth.ts         # NextAuth config
│   ├── prisma.ts       # Cliente Prisma singleton
│   └── utils.ts        # Helpers (fechas, zona horaria Santiago, etc.)
└── types/              # Tipos TypeScript compartidos
prisma/
├── schema.prisma       # Modelo de datos
└── seed.ts             # Datos de prueba
tests/
└── scoring.test.ts     # Tests de puntuación y bloqueo
public/
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
└── icons/              # Íconos PWA (generar con pwa-asset-generator)
```
