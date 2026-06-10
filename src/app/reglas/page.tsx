import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { Star, Lock, Clock, Trophy, BookOpen, Zap } from "lucide-react";

export default async function ReglasPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <AppShell title="Reglas del juego">
      {/* Intro */}
      <div className="card p-5 mb-4 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-950/40 dark:to-blue-950/40 border-primary-100 dark:border-primary-900">
        <div className="flex items-start gap-3">
          <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-1">¿Cómo funciona la polla?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Predice el marcador exacto de cada partido del Mundial 2026. Cuanto más preciso seas, más puntos acumulas. El que termine con más puntos gana el pozo.
            </p>
          </div>
        </div>
      </div>

      {/* Cuándo predecir */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">¿Cuándo puedo predecir?</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-green-500 font-bold mt-0.5">✓</span>
            <p>Puedes ingresar o modificar tu pronóstico <strong className="text-gray-800 dark:text-gray-200">hasta 10 minutos antes del inicio</strong> del partido.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-500 font-bold mt-0.5">✗</span>
            <p>Una vez bloqueado el partido, ya <strong className="text-gray-800 dark:text-gray-200">no se puede cambiar</strong> el pronóstico. Si no ingresaste uno, quedas con 0 puntos en ese partido.</p>
          </div>
        </div>
      </div>

      {/* Sistema de puntos */}
      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Sistema de puntuación</h3>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Los criterios se suman entre sí</p>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {/* Header tabla */}
          <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 px-4 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            <span>Acierto</span>
            <span className="text-center">Grupos</span>
            <span className="text-center">Eliminatoria</span>
          </div>

          {[
            { label: "Resultado correcto", desc: "Aciertas si gana local, empatan o gana visitante", grupos: 5, elim: 10 },
            { label: "Goles equipo local exactos", desc: "El marcador del equipo de casa es correcto", grupos: 2, elim: 4 },
            { label: "Goles equipo visitante exactos", desc: "El marcador del equipo de visita es correcto", grupos: 2, elim: 4 },
            { label: "Diferencia de goles exacta", desc: "Diferencia entre local y visitante es correcta", grupos: 1, elim: 2 },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_5rem_5rem] gap-2 px-4 py-3 items-center">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{row.label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{row.desc}</p>
              </div>
              <div className="text-center">
                <span className="inline-block bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-bold text-sm px-2.5 py-0.5 rounded-full">
                  +{row.grupos} pts
                </span>
              </div>
              <div className="text-center">
                <span className="inline-block bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 font-bold text-sm px-2.5 py-0.5 rounded-full">
                  +{row.elim} pts
                </span>
              </div>
            </div>
          ))}

          {/* Máximo */}
          <div className="grid grid-cols-[1fr_5rem_5rem] gap-2 px-4 py-3 items-center bg-yellow-50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Achunte (marcador exacto)</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Aciertas todos los criterios a la vez</p>
              </div>
            </div>
            <div className="text-center">
              <span className="inline-block bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 font-black text-sm px-2.5 py-0.5 rounded-full">
                10 pts
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 font-black text-sm px-2.5 py-0.5 rounded-full">
                20 pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ejemplos */}
      <div className="card overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Ejemplos prácticos</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Resultado real: 🇦🇷 Argentina <strong>2 – 1</strong> 🇲🇽 México · Fase de grupos
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Puntajes posibles: <strong>0, 2, 5, 6, 7 o 10</strong>. No existen puntajes de 1, 3, 4, 8 ni 9: acertar la diferencia siempre implica acertar el resultado, y acertar ambos goles implica acertar todo.
          </p>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {[
            {
              pred: "2 – 1",
              pts: 10,
              star: true,
              checks: ["Resultado ✓", "Goles local ✓", "Goles visit. ✓", "Diferencia ✓"],
              label: "Achunte perfecto",
              color: "text-yellow-600 dark:text-yellow-400",
            },
            {
              pred: "2 – 0",
              pts: 7,
              star: false,
              checks: ["Resultado ✓", "Goles local ✓", "Diferencia ✗"],
              label: "Resultado + goles local",
              color: "text-green-600 dark:text-green-400",
            },
            {
              pred: "3 – 1",
              pts: 7,
              star: false,
              checks: ["Resultado ✓", "Goles visit. ✓", "Diferencia ✗"],
              label: "Resultado + goles visitante",
              color: "text-green-600 dark:text-green-400",
            },
            {
              pred: "3 – 2",
              pts: 6,
              star: false,
              checks: ["Resultado ✓", "Diferencia ✓"],
              label: "Resultado + diferencia",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              pred: "3 – 0",
              pts: 5,
              star: false,
              checks: ["Resultado ✓"],
              label: "Solo resultado",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              pred: "2 – 3",
              pts: 2,
              star: false,
              checks: ["Goles local ✓"],
              label: "Solo goles local",
              color: "text-gray-600 dark:text-gray-400",
            },
            {
              pred: "0 – 1",
              pts: 2,
              star: false,
              checks: ["Goles visit. ✓"],
              label: "Solo goles visitante",
              color: "text-gray-600 dark:text-gray-400",
            },
            {
              pred: "0 – 0",
              pts: 0,
              star: false,
              checks: ["Sin aciertos"],
              label: "Sin puntos",
              color: "text-red-500 dark:text-red-400",
            },
          ].map((ej) => (
            <div key={ej.pred} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200 tabular-nums">{ej.pred}</span>
                  <span className={`text-xs font-medium ${ej.color}`}>{ej.label}</span>
                </div>
                <div className="flex flex-wrap gap-x-2 text-xs text-gray-400 dark:text-gray-500">
                  {ej.checks.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Star className={`w-4 h-4 ${ej.star ? "fill-yellow-400 stroke-yellow-500" : "stroke-gray-300 dark:stroke-gray-600"}`} />
                <span className={`font-black text-base tabular-nums w-6 text-right ${ej.pts > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-300 dark:text-gray-700"}`}>
                  {ej.pts}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pozo */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">El pozo</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Cada participante aporta <strong className="text-gray-800 dark:text-gray-200">$10.000 CLP</strong> al pozo. El monto total se reparte entre los tres primeros lugares al finalizar el torneo:
        </p>
        <div className="space-y-2">
          {[
            { pos: "🥇 1° lugar", pct: "60%", desc: "Mayor porcentaje del pozo" },
            { pos: "🥈 2° lugar", pct: "30%", desc: "Segundo porcentaje" },
            { pos: "🥉 3° lugar", pct: "10%", desc: "Tercer porcentaje" },
          ].map((r) => (
            <div key={r.pos} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{r.pos}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{r.desc}</span>
              </div>
              <span className="font-black text-lg text-primary-700 dark:text-primary-400">{r.pct}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Desempate */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-800 dark:text-gray-200">Desempate</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Si dos o más jugadores terminan con los mismos puntos, se desempata en este orden:</p>
        <ol className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center flex-shrink-0">1</span>
            Mayor cantidad de achuntes
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center flex-shrink-0">2</span>
            Mayor cantidad de resultados correctos
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-bold text-xs flex items-center justify-center flex-shrink-0">3</span>
            Fecha de registro más antigua
          </li>
        </ol>
      </div>
    </AppShell>
  );
}
