import { describe, expect, it } from "vitest";

import { allowedTransitions, validateTransition } from "./bug-workflow";

describe("bug workflow", () => {
  it("allows the expected QA handoff", () => {
    expect(allowedTransitions("IN_PROGRESS")).toContain("READY_FOR_QA");
    expect(
      validateTransition({ from: "IN_PROGRESS", to: "READY_FOR_QA" }).valid,
    ).toBe(true);
  });

  it("rejects invalid jumps and requires a reopen reason", () => {
    expect(validateTransition({ from: "OPEN", to: "CLOSED" }).valid).toBe(
      false,
    );
    expect(
      validateTransition({ from: "TESTING", to: "REOPENED", reason: "curto" })
        .valid,
    ).toBe(false);
  });
});
