import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function checkPassword(password: string, encoded: string | null) {
  const [algorithm, salt, hash] = (encoded ?? "").split(":");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash))
    return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
