import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "./validation";

describe("auth validation", () => {
  it("accepts the demonstration credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "marina@norte.dev",
        password: "lume-demo",
      }).success,
    ).toBe(true);
  });

  it("rejects an incomplete registration", () => {
    expect(
      registerSchema.safeParse({
        name: "A",
        email: "invalido",
        password: "curta",
      }).success,
    ).toBe(false);
  });
});
