export type ReleaseQualityInput = {
  testsTotal: number;
  testsPassed: number;
  testsFailed: number;
  testsBlocked: number;
  openCriticalBugs: number;
  openHighBugs: number;
  reopenedBugs: number;
  unresolvedRegressions: number;
};

export type ReleaseStatus = "READY" | "AT_RISK" | "BLOCKED";

export function calculateReleaseQuality(input: ReleaseQualityInput) {
  const executed = input.testsPassed + input.testsFailed + input.testsBlocked;
  const passRate =
    input.testsTotal === 0 ? 0 : input.testsPassed / input.testsTotal;
  const executionRate =
    input.testsTotal === 0 ? 0 : executed / input.testsTotal;
  const testPoints = Math.round(Math.min(1, passRate) * 60);
  const executionPoints = Math.round(Math.min(1, executionRate) * 10);
  const bugPenalty =
    input.openCriticalBugs * 8 +
    input.openHighBugs * 2 +
    input.reopenedBugs * 2 +
    input.unresolvedRegressions * 4;
  const bugHealthPoints = Math.max(0, 30 - bugPenalty);
  const rawScore = Math.min(
    100,
    testPoints + executionPoints + bugHealthPoints,
  );
  const hasHardBlocker =
    input.openCriticalBugs >= 3 || input.unresolvedRegressions >= 2;
  const score = hasHardBlocker ? Math.min(rawScore, 59) : rawScore;

  let status: ReleaseStatus = "AT_RISK";
  if (hasHardBlocker) status = "BLOCKED";
  else if (
    score >= 90 &&
    input.testsFailed === 0 &&
    input.testsBlocked === 0 &&
    input.openCriticalBugs === 0
  ) {
    status = "READY";
  }

  return {
    score,
    status,
    passRate: Math.round(passRate * 1000) / 10,
    breakdown: [
      { label: "Aprovação dos testes", value: testPoints, possible: 60 },
      { label: "Execução planejada", value: executionPoints, possible: 10 },
      { label: "Saúde dos bugs", value: bugHealthPoints, possible: 30 },
    ],
    blockers: [
      ...(input.openCriticalBugs > 0
        ? [`${input.openCriticalBugs} bugs críticos abertos`]
        : []),
      ...(input.testsFailed > 0
        ? [`${input.testsFailed} testes falhando`]
        : []),
      ...(input.testsBlocked > 0
        ? [`${input.testsBlocked} testes bloqueados`]
        : []),
      ...(input.unresolvedRegressions > 0
        ? [`${input.unresolvedRegressions} regressões pendentes`]
        : []),
    ],
  };
}
