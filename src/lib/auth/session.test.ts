import { describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "./session";

const user = {
  id: "demo-marina",
  name: "Marina Costa",
  email: "marina@norte.dev",
  role: "QA" as const,
};

describe("signed session", () => {
  it("restores a valid session payload", () => {
    const now = new Date("2026-08-30T12:00:00.000Z").getTime();
    const token = createSessionToken(user, now);

    expect(verifySessionToken(token, now + 1_000)).toMatchObject(user);
  });

  it("rejects tampered and expired sessions", () => {
    const now = new Date("2026-08-30T12:00:00.000Z").getTime();
    const token = createSessionToken(user, now);

    expect(verifySessionToken(`${token}alterado`, now)).toBeNull();
    expect(
      verifySessionToken(token, now + 8 * 24 * 60 * 60 * 1_000),
    ).toBeNull();
  });
});
