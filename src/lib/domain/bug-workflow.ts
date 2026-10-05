export const bugStatuses = [
  "BACKLOG",
  "OPEN",
  "INVESTIGATING",
  "IN_PROGRESS",
  "READY_FOR_QA",
  "TESTING",
  "RESOLVED",
  "REOPENED",
  "CLOSED",
] as const;

export type BugStatus = (typeof bugStatuses)[number];

const transitions: Record<BugStatus, readonly BugStatus[]> = {
  BACKLOG: ["OPEN"],
  OPEN: ["INVESTIGATING", "IN_PROGRESS"],
  INVESTIGATING: ["IN_PROGRESS", "BACKLOG"],
  IN_PROGRESS: ["READY_FOR_QA"],
  READY_FOR_QA: ["TESTING", "IN_PROGRESS"],
  TESTING: ["RESOLVED", "REOPENED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["INVESTIGATING", "IN_PROGRESS"],
  CLOSED: ["REOPENED"],
};

export function allowedTransitions(status: BugStatus) {
  return transitions[status];
}

export function validateTransition(input: {
  from: BugStatus;
  to: BugStatus;
  reason?: string;
}) {
  if (!transitions[input.from].includes(input.to)) {
    return {
      valid: false,
      error: `Transição ${input.from} → ${input.to} não permitida.`,
    };
  }

  if (input.to === "REOPENED" && (input.reason?.trim().length ?? 0) < 10) {
    return { valid: false, error: "Informe o motivo da reabertura." };
  }

  return { valid: true, error: null };
}
