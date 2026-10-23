/*
 * File:      ruota-immagine.ts
 * Percorso:  src/components/cattura-ocr/ruota-immagine.ts
 * Rotazione di un'immagine (dataURL o URL) di un angolo multiplo di 90°.
 */

/** Ruota una sorgente dataURL PNG di un angolo multiplo di 90° */
export async function ruotaDataUrl(dataUrl: string, gradi: number): Promise<string> {
  const angolo = ((gradi % 360) + 360) % 360;
  if (angolo === 0) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const rad = (angolo * Math.PI) / 180;
      const swap = angolo === 90 || angolo === 270;
      canvas.width = swap ? img.naturalHeight || img.height : img.naturalWidth || img.width;
      canvas.height = swap ? img.naturalWidth || img.width : img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.imageSmoothingQuality = "high";
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(
        img,
        -(img.naturalWidth || img.width) / 2,
        -(img.naturalHeight || img.height) / 2,
      );
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
