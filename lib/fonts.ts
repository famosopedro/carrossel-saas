import type { BrandConfig } from "./storage";

const registradas = new Set<string>();

// Registra no document.fonts as fontes custom salvas na marca (data URLs).
// Idempotente — chamar no boot e ao subir fonte nova.
export async function registrarFontesCustom(marca: BrandConfig): Promise<void> {
  if (typeof window === "undefined" || !("FontFace" in window)) return;
  for (const f of marca.customFonts || []) {
    const chave = `${f.name}__${f.style}`;
    if (registradas.has(chave)) continue;
    try {
      const face = new FontFace(f.name, `url(${f.dataUrl})`, { style: f.style, weight: "100 900" });
      await face.load();
      document.fonts.add(face);
      registradas.add(chave);
    } catch {
      // fonte inválida — ignora silenciosamente
    }
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
