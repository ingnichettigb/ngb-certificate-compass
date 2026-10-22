/*
 * File:      SezioneFoto.tsx
 * Percorso:  src/features/carica/components/SezioneFoto.tsx
 * Sezione «3. Foto attestato»: fronte e retro.
 */
import { UploadPreview } from "@/components/UploadPreview";

export function SezioneFoto({
  fronte,
  setFronte,
  retro,
  setRetro,
}: {
  fronte: File | null;
  setFronte: (f: File | null) => void;
  retro: File | null;
  setRetro: (f: File | null) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-lg font-semibold">3. Foto attestato</h2>
      <UploadPreview label="Fronte" file={fronte} onChange={setFronte} />
      <UploadPreview label="Retro" file={retro} onChange={setRetro} />
    </section>
  );
}
