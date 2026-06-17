import { toPng } from "html-to-image";
import JSZip from "jszip";

async function nodeToPng(node: HTMLElement): Promise<string> {
  return toPng(node, { pixelRatio: 1, cacheBust: true, skipFonts: false });
}

export async function exportSlidePng(node: HTMLElement, nome: string) {
  const dataUrl = await nodeToPng(node);
  const a = document.createElement("a");
  a.download = `${nome}.png`;
  a.href = dataUrl;
  a.click();
}

export async function exportAllZip(nodes: HTMLElement[], nomeBase: string) {
  const zip = new JSZip();
  for (let i = 0; i < nodes.length; i++) {
    const dataUrl = await nodeToPng(nodes[i]);
    const base64 = dataUrl.split(",")[1];
    zip.file(`slide-${String(i + 1).padStart(2, "0")}.png`, base64, { base64: true });
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.download = `${nomeBase}.zip`;
  a.href = URL.createObjectURL(blob);
  a.click();
  URL.revokeObjectURL(a.href);
}
