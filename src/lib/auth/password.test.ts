import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword } from "./password";

describe("senhas persistidas", () => {
  it("confere a senha sem armazená-la em texto e rejeita outra senha", async () => {
    const hash = await hashPassword("minha-senha-segura");
    expect(hash).not.toContain("minha-senha-segura");
    expect(await checkPassword("minha-senha-segura", hash)).toBe(true);
    expect(await checkPassword("outra-senha", hash)).toBe(false);
  });
  it("usa sal diferente e rejeita hashes inválidos", async () => {
    expect(await hashPassword("mesma-senha")).not.toBe(
      await hashPassword("mesma-senha"),
    );
    expect(await checkPassword("senha", null)).toBe(false);
    expect(await checkPassword("senha", "scrypt:invalido:curto")).toBe(false);
  });
});
