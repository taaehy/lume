export type BugReportInput = {
  title?: string;
  description?: string;
  reproductionSteps?: string[];
  environment?: string;
  version?: string;
  evidenceCount?: number;
  expectedResult?: string;
  actualResult?: string;
  technicalContext?: string;
};

export type ScoreCriterion = {
  key: string;
  label: string;
  earned: number;
  possible: number;
  feedback: string;
};

function meaningful(value: string | undefined, minimum: number) {
  return Boolean(value && value.trim().length >= minimum);
}

export function calculateQualityScore(input: BugReportInput) {
  const criteria: ScoreCriterion[] = [
    {
      key: "clarity",
      label: "Clareza",
      earned:
        meaningful(input.title, 12) && meaningful(input.description, 40)
          ? 20
          : meaningful(input.title, 8)
            ? 10
            : 0,
      possible: 20,
      feedback:
        meaningful(input.title, 12) && meaningful(input.description, 40)
          ? "Título e contexto estão claros."
          : "Detalhe o impacto e o contexto do problema.",
    },
    {
      key: "steps",
      label: "Passos para reprodução",
      earned:
        (input.reproductionSteps?.filter((step) => meaningful(step, 6))
          .length ?? 0) >= 3
          ? 20
          : (input.reproductionSteps?.length ?? 0) > 0
            ? 10
            : 0,
      possible: 20,
      feedback:
        (input.reproductionSteps?.length ?? 0) >= 3
          ? "Sequência reproduzível informada."
          : "Inclua ao menos três passos objetivos.",
    },
    {
      key: "environment",
      label: "Ambiente e versão",
      earned:
        meaningful(input.environment, 3) && meaningful(input.version, 1)
          ? 15
          : meaningful(input.environment, 3)
            ? 8
            : 0,
      possible: 15,
      feedback:
        meaningful(input.environment, 3) && meaningful(input.version, 1)
          ? "Ambiente e versão identificados."
          : "Informe ambiente e versão afetada.",
    },
    {
      key: "evidence",
      label: "Evidências",
      earned: (input.evidenceCount ?? 0) > 0 ? 15 : 0,
      possible: 15,
      feedback:
        (input.evidenceCount ?? 0) > 0
          ? "Há evidência anexada."
          : "Adicione imagem, vídeo, arquivo ou link.",
    },
    {
      key: "expected",
      label: "Resultado esperado",
      earned: meaningful(input.expectedResult, 20) ? 10 : 0,
      possible: 10,
      feedback: meaningful(input.expectedResult, 20)
        ? "Resultado esperado está explícito."
        : "Explique o comportamento correto.",
    },
    {
      key: "actual",
      label: "Resultado encontrado",
      earned: meaningful(input.actualResult, 20) ? 10 : 0,
      possible: 10,
      feedback: meaningful(input.actualResult, 20)
        ? "Falha observada está descrita."
        : "Descreva exatamente o que ocorreu.",
    },
    {
      key: "technical",
      label: "Detalhes técnicos",
      earned: meaningful(input.technicalContext, 20) ? 10 : 0,
      possible: 10,
      feedback: meaningful(input.technicalContext, 20)
        ? "Contexto técnico incluído."
        : "Inclua logs, código de erro ou requisição relevante.",
    },
  ];

  return {
    score: criteria.reduce((total, criterion) => total + criterion.earned, 0),
    criteria,
  };
}
