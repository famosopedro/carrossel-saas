import { decryptKey } from "./crypto";

// Geração de imagem com a chave BYOK do usuário. O custo é do usuário (pago
// direto ao provedor). NUNCA loga a chave descriptografada.

type ImageResult = { url: string } | { error: string };

export async function generateImage(
  prompt: string,
  provider: "gemini" | "openai",
  encryptedKey: string,
): Promise<ImageResult> {
  let key: string;
  try {
    key = await decryptKey(encryptedKey);
  } catch {
    return { error: "Falha ao ler a chave de API." };
  }

  try {
    if (provider === "openai") {
      const resp = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "standard" }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) return { error: data?.error?.message || `OpenAI: erro ${resp.status}` };
      const url = data?.data?.[0]?.url;
      if (!url) return { error: "OpenAI não retornou imagem." };
      return { url };
    }

    // Gemini — Imagen 3 (predict). Retorna imagem em base64.
    // Suporta chaves no formato AIzaSy... (?key=) e AQ.... (Bearer OAuth).
    const model = "imagen-3.0-generate-002";
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1 } }),
      },
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) return { error: data?.error?.message || `Gemini: erro ${resp.status}` };
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return { error: "Gemini não retornou imagem." };
    return { url: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao gerar imagem." };
  }
}
