import { describe, expect, it } from "vitest";

import { extractTerms, findRelatedBugs } from "./related-bugs";

const candidates = [
  {
    id: "LUM-118",
    title: "Pagamento PIX retorna erro 500",
    module: "Checkout",
    description: "Falha ocorre ao confirmar o pedido pago via PIX.",
  },
  {
    id: "LUM-102",
    title: "Avatar não carrega no perfil",
    module: "Perfil",
  },
];

describe("related bug analysis", () => {
  it("normalizes Portuguese text and removes generic terms", () => {
    expect(extractTerms("Erro ao finalizar Pagamento PIX")).toEqual([
      "finalizar",
      "pagamento",
      "pix",
    ]);
  });

  it("ranks a same-module report with shared terms first", () => {
    const matches = findRelatedBugs(
      {
        title: "Erro ao finalizar pagamento PIX",
        description: "O pedido falha durante a confirmação.",
        module: "Checkout",
      },
      candidates,
    );

    expect(matches[0]?.id).toBe("LUM-118");
    expect(matches[0]?.sharedTerms).toContain("pagamento");
    expect(matches[0]?.similarity).toBeGreaterThan(30);
  });
});
