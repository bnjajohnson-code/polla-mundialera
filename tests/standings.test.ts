import { describe, it, expect } from "vitest";
import { esPollaFinalizada } from "@/lib/standings";
import type { EstadoPartido } from "@prisma/client";

const p = (estado: EstadoPartido) => ({ estado });

describe("esPollaFinalizada", () => {
  it("devuelve false sin partidos", () => {
    expect(esPollaFinalizada([])).toBe(false);
  });

  it("devuelve true cuando todos están finalizados", () => {
    expect(esPollaFinalizada([p("finalizado"), p("finalizado")])).toBe(true);
  });

  it("devuelve false si queda un partido programado", () => {
    expect(esPollaFinalizada([p("finalizado"), p("programado")])).toBe(false);
  });

  it("devuelve false si hay un partido en juego", () => {
    expect(esPollaFinalizada([p("finalizado"), p("en_juego")])).toBe(false);
  });

  it("un aplazado no bloquea la celebración", () => {
    expect(esPollaFinalizada([p("finalizado"), p("aplazado")])).toBe(true);
  });

  it("devuelve false si solo hay aplazados (ninguno finalizado)", () => {
    expect(esPollaFinalizada([p("aplazado")])).toBe(false);
  });
});
