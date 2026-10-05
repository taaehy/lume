import { describe, expect, it } from "vitest";

import { calculateQualityScore } from "./quality-score";

describe("Quality Score", () => {
  it("is deterministic and reaches 100 for a complete report", () => {
    const report = {
      title: "Pagamento PIX falha ao confirmar o pedido",
      description:
        "Ao confirmar um pedido pago via PIX, o checkout retorna erro e mantém o carrinho aberto.",
      reproductionSteps: [
        "Abra um carrinho com produto",
        "Selecione PIX no checkout",
        "Confirme o pagamento",
      ],
      environment: "Produção / Chrome 128",
      version: "2.4.0",
      evidenceCount: 1,
      expectedResult: "O pedido deve ser confirmado e o recibo exibido.",
      actualResult: "A API retorna 500 e o carrinho permanece pendente.",
      technicalContext: "POST /api/orders retorna PAYMENT_PROVIDER_TIMEOUT.",
    };

    expect(calculateQualityScore(report).score).toBe(100);
    expect(calculateQualityScore(report)).toEqual(
      calculateQualityScore(report),
    );
  });

  it("explains missing evidence without inventing points", () => {
    const result = calculateQualityScore({ title: "Erro no checkout" });
    const evidence = result.criteria.find((item) => item.key === "evidence");

    expect(evidence?.earned).toBe(0);
    expect(evidence?.feedback).toContain("Adicione");
  });
});
