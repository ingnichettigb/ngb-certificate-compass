/*
 * File:      ruota-immagine.ts
 * Percorso:  src/components/image-viewer/ruota-immagine.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da ImageViewer.tsx: rotazione reale dell'immagine tramite canvas. Nessun cambio di comportamento.
 */
export function ruotaDataUrl(sorgenteUrl: string, gradi: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Contesto canvas non disponibile"));

      const rad = (gradi * Math.PI) / 180;
      const is90o270 = gradi === 90 || gradi === 270;
      canvas.width = is90o270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = is90o270 ? img.naturalWidth : img.naturalHeight;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Impossibile caricare immagine per la rotazione"));
    img.src = sorgenteUrl;
  });
}
