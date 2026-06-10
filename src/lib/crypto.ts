import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "zap-emprestimos-chave-secreta-32"; // 32 bytes de chave
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna o resultado no formato hexadecimal "iv:authTag:encryptedText".
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  // Se o texto já estiver no formato de criptografia, não re-criptografa
  if (text.includes(":") && text.split(":").length === 3) {
    return text;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, " ").substring(0, 32), "utf8");
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (e) {
    console.error("Erro na criptografia:", e);
    return text;
  }
}

/**
 * Descriptografa uma string hexadecimal criptografada por AES-256-GCM.
 * Retorna o texto original.
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return "";

  const parts = cipherText.split(":");
  if (parts.length !== 3) {
    // Retorna o próprio texto se não estiver no formato criptografado
    return cipherText;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, " ").substring(0, 32), "utf8");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (e) {
    // Retorna o próprio texto criptografado em caso de falha (para não perder informação)
    console.error("Erro na descriptografia:", e);
    return cipherText;
  }
}

/**
 * Criptografa os campos sensíveis de um objeto Cliente.
 */
export function encryptCliente<T extends { cpf?: string | null; phone: string; endereco?: string | null; descGarantia?: string | null }>(cliente: T): T {
  return {
    ...cliente,
    cpf: cliente.cpf ? encrypt(cliente.cpf) : null,
    phone: encrypt(cliente.phone),
    endereco: cliente.endereco ? encrypt(cliente.endereco) : null,
    descGarantia: cliente.descGarantia ? encrypt(cliente.descGarantia) : null,
  };
}

/**
 * Descriptografa os campos sensíveis de um objeto Cliente.
 */
export function decryptCliente<T extends { cpf?: string | null; phone: string; endereco?: string | null; descGarantia?: string | null }>(cliente: T): T {
  return {
    ...cliente,
    cpf: cliente.cpf ? decrypt(cliente.cpf) : null,
    phone: decrypt(cliente.phone),
    endereco: cliente.endereco ? decrypt(cliente.endereco) : null,
    descGarantia: cliente.descGarantia ? decrypt(cliente.descGarantia) : null,
  };
}
