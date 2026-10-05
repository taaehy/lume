import { describe, expect, it } from "vitest";

import { assertCan, can } from "./permissions";

describe("RBAC policy", () => {
  it("keeps organization management exclusive to the owner", () => {
    expect(can("OWNER", "organization:manage")).toBe(true);
    expect(can("ADMIN", "organization:manage")).toBe(false);
  });

  it("does not let viewers mutate bugs", () => {
    expect(can("VIEWER", "project:read")).toBe(true);
    expect(can("VIEWER", "bug:write")).toBe(false);
    expect(() => assertCan("VIEWER", "bug:write")).toThrow();
  });
});
