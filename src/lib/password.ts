import { createHash } from "crypto";

export function hashSenha(senha: string): string {
  return createHash("sha256").update(senha + "zap2026").digest("hex");
}
