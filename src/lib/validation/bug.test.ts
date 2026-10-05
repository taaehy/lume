import { describe, expect, it } from "vitest";

import { bugReportSchema } from "./bug";

describe("bug report validation", () => {
  it("accepts a report with the minimum required context", () => {
    const result = bugReportSchema.safeParse({
      title: "Erro ao confirmar o pedido",
      description: "O checkout falha depois da confirmação do pagamento.",
      module: "Checkout",
      priority: "HIGH",
      severity: "MAJOR",
      environment: "",
      version: "",
      reproductionSteps: ["Confirmar o pedido"],
      expectedResult: "",
      actualResult: "",
      technicalContext: "",
      evidenceCount: 0,
    });

    expect(result.success).toBe(true);
  });

  it("rejects reports without reproduction steps", () => {
    const result = bugReportSchema.safeParse({
      title: "Erro no checkout",
      description: "O checkout falha depois da confirmação do pagamento.",
      module: "Checkout",
      priority: "HIGH",
      severity: "MAJOR",
      environment: "",
      version: "",
      reproductionSteps: [],
      expectedResult: "",
      actualResult: "",
      technicalContext: "",
      evidenceCount: 0,
    });

    expect(result.success).toBe(false);
  });
});
