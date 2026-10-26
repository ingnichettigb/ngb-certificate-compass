/*
 * File:          ZonaLavoratore.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/ZonaLavoratore.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Dati lavoratore precompilati e dati dell'allegato.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIPI_ATTESTATO_PDF, type Dipendente } from "@/lib/api";

export type DatiAllegato = { tipo: string; altro: string; dataCorso: string; scadenza: string };

export function ZonaLavoratore({
  dipendente,
  dati,
  onCambia,
}: {
  dipendente: Dipendente;
  dati: DatiAllegato;
  onCambia: (d: DatiAllegato) => void;
}) {
  const set = (k: keyof DatiAllegato, v: string) => onCambia({ ...dati, [k]: v });
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-xs text-muted-foreground">Cognome</span><div className="font-semibold">{dipendente.cognome}</div></div>
        <div><span className="text-xs text-muted-foreground">Nome</span><div className="font-semibold">{dipendente.nome}</div></div>
        <div><span className="text-xs text-muted-foreground">Codice fiscale</span><div className="font-mono">{dipendente.codice_fiscale}</div></div>
        <div><span className="text-xs text-muted-foreground">Reparto</span><div>{dipendente.reparto || "—"}</div></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Tipo attestato</Label>
          <Select value={dati.tipo} onValueChange={(v) => set("tipo", v)}>
            <SelectTrigger><SelectValue placeholder="Scegli il tipo" /></SelectTrigger>
            <SelectContent>
              {TIPI_ATTESTATO_PDF.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dati.tipo === "Altro" && (
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrizione</Label>
            <Input value={dati.altro} onChange={(e) => set("altro", e.target.value)} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Data corso</Label>
          <Input type="date" value={dati.dataCorso} onChange={(e) => set("dataCorso", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Scadenza</Label>
          <Input type="date" value={dati.scadenza} onChange={(e) => set("scadenza", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
