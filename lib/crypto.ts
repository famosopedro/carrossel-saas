import { webcrypto } from "node:crypto";

// Criptografia simétrica AES-256-GCM com a Web Crypto nativa do Node.
// Chave derivada de ENCRYPTION_SECRET via SHA-256 (32 bytes). Formato de saída:
// "iv:ciphertext", ambos em base64. NUNCA loga plaintext nem a chave.

const subtle = webcrypto.subtle;

function getSecret(): string {
  const s = process.env.ENCRYPTION_SECRET;
  if (!s) throw new Error("ENCRYPTION_SECRET não definido. Configure a variável de ambiente do servidor.");
  return s;
}

async function getKey(): Promise<CryptoKey> {
  const material = new TextEncoder().encode(getSecret());
  const hash = await subtle.digest("SHA-256", material); // 256 bits
  return subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptKey(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `${Buffer.from(iv).toString("base64")}:${Buffer.from(new Uint8Array(ct)).toString("base64")}`;
}

export async function decryptKey(ciphertext: string): Promise<string> {
  const [ivB64, ctB64] = ciphertext.split(":");
  if (!ivB64 || !ctB64) throw new Error("Formato de chave criptografada inválido.");
  const key = await getKey();
  const iv = new Uint8Array(Buffer.from(ivB64, "base64"));
  const ct = Buffer.from(ctB64, "base64");
  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}
