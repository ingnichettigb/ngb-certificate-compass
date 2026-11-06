/*
 * File:      CampiContratto.tsx
 * Percorso:  src/features/contratti/CampiContratto.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 09:45 — Campi contratto: tipo, assunzione, scadenza libera, note.
 *   rev 2 — 06/11/2026 08:20 — Opzione «evidenzia»: assunzione e scadenza mancanti con bordo giallo (coda «Da completare»).
 */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { type DatiContratto } from "@/lib/api";

const GIALLO = "border-amber-500 bg-amber-500/10";

export function CampiContratto({
  valori,
  onChange,
  evidenzia = [],
}: {
  valori: DatiContratto;
  onChange: (v: DatiContratto) => void;
  /** Campi mancanti da evidenziare. */
  evidenzia?: ("data_assunzione" | "data_fine_contratto")[];
}) {
  const determinato = valori.tipo_contratto === "determinato";
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Tipo di contratto</Label>
        <div className="flex gap-4 text-sm">
          {(["indeterminato", "determinato"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="radio"
                checked={(valori.tipo_contratto ?? "indeterminato") === t}
                onChange={() =>
                  onChange({ ...valori, tipo_contratto: t, data_fine_contratto: t === "determinato" ? (valori.data_fine_contratto ?? null) : null })
                }
              />
              Tempo {t}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Data assunzione</Label>
        <Input type="date" className={evidenzia.includes("data_assunzione") ? GIALLO : undefined} value={valori.data_assunzione ?? ""} onChange={(e) => onChange({ ...valori, data_assunzione: e.target.value })} />
      </div>
      {determinato && (
        <div className="space-y-1.5">
          <Label>Scadenza contratto</Label>
          <Input type="date" className={evidenzia.includes("data_fine_contratto") ? GIALLO : undefined} value={valori.data_fine_contratto ?? ""} onChange={(e) => onChange({ ...valori, data_fine_contratto: e.target.value })} />
        </div>
      )}
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Note contratto</Label>
        <Input value={valori.note_contratto ?? ""} onChange={(e) => onChange({ ...valori, note_contratto: e.target.value })} />
      </div>
    </div>
  );
}
