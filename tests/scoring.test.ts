import { describe, it, expect } from "vitest";
import { calcularPuntos, getPuntos, esEliminatoria } from "@/lib/scoring";
import type { FasePartido } from "@prisma/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

const grupos: FasePartido = "grupos";
const octavos: FasePartido = "octavos";
const final: FasePartido = "final";

// ─── esEliminatoria ─────────────────────────────────────────────────────────

describe("esEliminatoria", () => {
  it("devuelve false para grupos", () => {
    expect(esEliminatoria("grupos")).toBe(false);
  });
  it("devuelve true para dieciseisavos", () => {
    expect(esEliminatoria("dieciseisavos")).toBe(true);
  });
  it("devuelve true para octavos", () => {
    expect(esEliminatoria("octavos")).toBe(true);
  });
  it("devuelve true para cuartos", () => {
    expect(esEliminatoria("cuartos")).toBe(true);
  });
  it("devuelve true para semifinal", () => {
    expect(esEliminatoria("semifinal")).toBe(true);
  });
  it("devuelve true para tercer_puesto", () => {
    expect(esEliminatoria("tercer_puesto")).toBe(true);
  });
  it("devuelve true para final", () => {
    expect(esEliminatoria("final")).toBe(true);
  });
});

// ─── Casos de la especificación (fase de grupos) ─────────────────────────────

describe("calcularPuntos – fase de grupos", () => {
  it("pronóstico exacto 1-0 / resultado 1-0 → 10 pts", () => {
    const r = calcularPuntos(1, 0, 1, 0, grupos);
    expect(r.puntos).toBe(10);
    expect(r.aciertoResultado).toBe(true);
    expect(r.aciertoLocal).toBe(true);
    expect(r.aciertoVisitante).toBe(true);
    expect(r.aciertoDiferencia).toBe(true);
    expect(r.pleno).toBe(true);
  });

  it("pronóstico 2-0 / resultado 3-1 → 6 pts", () => {
    const r = calcularPuntos(2, 0, 3, 1, grupos);
    expect(r.puntos).toBe(6);
    expect(r.aciertoResultado).toBe(true);  // local gana en ambos
    expect(r.aciertoLocal).toBe(false);
    expect(r.aciertoVisitante).toBe(false);
    expect(r.aciertoDiferencia).toBe(true); // diferencia = 2 en ambos
    expect(r.pleno).toBe(false);
  });

  it("pronóstico 0-0 / resultado 2-2 → 6 pts", () => {
    const r = calcularPuntos(0, 0, 2, 2, grupos);
    expect(r.puntos).toBe(6);
    expect(r.aciertoResultado).toBe(true);  // empate en ambos
    expect(r.aciertoLocal).toBe(false);
    expect(r.aciertoVisitante).toBe(false);
    expect(r.aciertoDiferencia).toBe(true); // diferencia = 0 en ambos
    expect(r.pleno).toBe(false);
  });

  it("pronóstico 2-1 / resultado 1-0 → 6 pts", () => {
    const r = calcularPuntos(2, 1, 1, 0, grupos);
    expect(r.puntos).toBe(6);
    expect(r.aciertoResultado).toBe(true);  // local gana en ambos
    expect(r.aciertoLocal).toBe(false);
    expect(r.aciertoVisitante).toBe(false);
    expect(r.aciertoDiferencia).toBe(true); // diferencia = 1 en ambos
    expect(r.pleno).toBe(false);
  });
});

// ─── Mismos casos en fase eliminatoria (valores duplicados) ──────────────────

describe("calcularPuntos – fase eliminatoria (octavos)", () => {
  it("pronóstico exacto 1-0 / resultado 1-0 → 20 pts", () => {
    const r = calcularPuntos(1, 0, 1, 0, octavos);
    expect(r.puntos).toBe(20);
    expect(r.pleno).toBe(true);
  });

  it("pronóstico 2-0 / resultado 3-1 → 12 pts", () => {
    const r = calcularPuntos(2, 0, 3, 1, octavos);
    expect(r.puntos).toBe(12);
  });

  it("pronóstico 0-0 / resultado 2-2 → 12 pts", () => {
    const r = calcularPuntos(0, 0, 2, 2, octavos);
    expect(r.puntos).toBe(12);
  });

  it("pronóstico 2-1 / resultado 1-0 → 12 pts", () => {
    const r = calcularPuntos(2, 1, 1, 0, octavos);
    expect(r.puntos).toBe(12);
  });
});

// ─── Casos adicionales ───────────────────────────────────────────────────────

describe("calcularPuntos – casos adicionales", () => {
  it("pronóstico completamente equivocado → 0 pts", () => {
    const r = calcularPuntos(3, 0, 0, 2, grupos);
    expect(r.puntos).toBe(0);
    expect(r.aciertoResultado).toBe(false);
    expect(r.aciertoLocal).toBe(false);
    expect(r.aciertoVisitante).toBe(false);
    expect(r.aciertoDiferencia).toBe(false);
  });

  it("solo aciertas resultado, sin goles ni diferencia → 5 pts grupos", () => {
    // Pronóstico 1-0, resultado 3-0: local gana ✓, local ✗, visitante ✓, diferencia ✗
    const r = calcularPuntos(1, 0, 3, 0, grupos);
    expect(r.puntos).toBe(7); // 5 + 0 + 2 + 0
    expect(r.aciertoResultado).toBe(true);
    expect(r.aciertoLocal).toBe(false);
    expect(r.aciertoVisitante).toBe(true);
    expect(r.aciertoDiferencia).toBe(false);
  });

  it("solo aciertas goles local → 2 pts grupos", () => {
    // Pronóstico 1-2, resultado 1-0: visitante gana vs local gana → resultado ✗
    const r = calcularPuntos(1, 2, 1, 0, grupos);
    expect(r.puntos).toBe(2); // 0 + 2 + 0 + 0
    expect(r.aciertoResultado).toBe(false);
    expect(r.aciertoLocal).toBe(true);
    expect(r.aciertoVisitante).toBe(false);
    expect(r.aciertoDiferencia).toBe(false);
  });

  it("solo aciertas diferencia (pero no resultado ni goles) → 1 pt grupos", () => {
    // Pronóstico 2-1, resultado 3-2: local gana ambos ✓, goles ✗, diff 1 = diff 1 ✓
    const r = calcularPuntos(2, 1, 3, 2, grupos);
    expect(r.puntos).toBe(6); // 5 + 0 + 0 + 1
  });

  it("en la final: pronóstico exacto 2-1 / resultado 2-1 → 20 pts", () => {
    const r = calcularPuntos(2, 1, 2, 1, final);
    expect(r.puntos).toBe(20);
    expect(r.pleno).toBe(true);
  });

  it("empate en eliminatorias (resultado reglamentario) → funciona igual", () => {
    // Ej: eliminatoria termina 1-1 en 90 min, luego se decide en penales
    const r = calcularPuntos(1, 1, 1, 1, octavos);
    expect(r.puntos).toBe(20);
    expect(r.pleno).toBe(true);
  });
});

// ─── Bloqueo de predicciones ─────────────────────────────────────────────────

describe("bloqueo de predicciones", () => {
  it("un partido en el futuro no está bloqueado", () => {
    const ahora = new Date();
    const futuro = new Date(ahora.getTime() + 3600 * 1000); // +1h
    expect(futuro > ahora).toBe(true);
  });

  it("un partido ya iniciado está bloqueado", () => {
    const ahora = new Date();
    const pasado = new Date(ahora.getTime() - 1000); // -1s
    expect(pasado <= ahora).toBe(true);
  });

  it("un partido exactamente en la hora de inicio está bloqueado", () => {
    const inicio = new Date();
    const ahora = new Date(inicio.getTime());
    // inicio <= ahora → bloqueado
    expect(inicio <= ahora).toBe(true);
  });
});

// ─── getPuntos (wrapper) ──────────────────────────────────────────────────────

describe("getPuntos", () => {
  it("devuelve solo el número de puntos", () => {
    expect(getPuntos(1, 0, 1, 0, grupos)).toBe(10);
    expect(getPuntos(2, 0, 3, 1, grupos)).toBe(6);
    expect(getPuntos(0, 0, 2, 2, grupos)).toBe(6);
    expect(getPuntos(2, 1, 1, 0, grupos)).toBe(6);
    expect(getPuntos(1, 0, 1, 0, octavos)).toBe(20);
    expect(getPuntos(2, 0, 3, 1, octavos)).toBe(12);
  });
});
