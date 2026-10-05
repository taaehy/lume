export const roles = ["OWNER", "ADMIN", "QA", "DEVELOPER", "VIEWER"] as const;
export type Role = (typeof roles)[number];

export const capabilities = [
  "organization:manage",
  "member:manage",
  "project:manage",
  "bug:write",
  "bug:close",
  "test:manage",
  "release:manage",
  "project:read",
] as const;
export type Capability = (typeof capabilities)[number];

const grants: Record<Role, ReadonlySet<Capability>> = {
  OWNER: new Set(capabilities),
  ADMIN: new Set(capabilities.filter((item) => item !== "organization:manage")),
  QA: new Set([
    "bug:write",
    "bug:close",
    "test:manage",
    "release:manage",
    "project:read",
  ]),
  DEVELOPER: new Set(["bug:write", "test:manage", "project:read"]),
  VIEWER: new Set(["project:read"]),
};

export function can(role: Role, capability: Capability) {
  return grants[role].has(capability);
}

export function assertCan(role: Role, capability: Capability) {
  if (!can(role, capability)) {
    throw new Error(`Role ${role} cannot perform ${capability}`);
  }
}
