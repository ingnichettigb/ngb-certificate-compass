/*
 * File:          CampiValidazione.tsx
 * Percorso:      src/features/hr/components/CampiValidazione.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Creazione campi correggibili da HR (tipo corso, data, ore, note).
 *   - Rev 2 (2026-10-28 11:20): Aggiunti filtri multiselezione per argomento corso per facilitare la ricerca nel menu.
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GRUPPI_ARGOMENTO,
  assegnaGruppoArgomento,
} from "@/features/tipi-corso/tipi-raggruppamento";

export function CampiValidazione({
  corsi,
  tipoCorsoId,
  setTipoCorsoId,
  dataCorso,
  setDataCorso,
  ore,
  setOre,
  mostraNote,
  note,
  setNote,
}: {
  corsi: {
    id: string;
    nome_corso: string;
    macro_categoria: string;
    codice?: string | null;
  }[];
  tipoCorsoId: string;
  setTipoCorsoId: (v: string) => void;
  dataCorso: string;
  setDataCorso: (v: string) => void;
  ore: string;
  setOre: (v: string) => void;
  mostraNote: boolean;
  note: string;
  setNote: (v: string) => void;
}) {
  const [gruppiSelezionati, setGruppiSelezionati] = useState<string[]>([]);

  function toggleGruppo(chiave: string) {
    setGruppiSelezionati((prev) =>
      prev.includes(chiave) ? prev.filter((k) => k !== chiave) : [...prev, chiave]
    );
  }

  // Filtra i corsi in base ai bottoni attivi; include sempre il corso attualmente selezionato
  const corsiFiltrati = useMemo(() => {
    if (gruppiSelezionati.length === 0) return corsi;
    return corsi.filter((c) => {
      const g = assegnaGruppoArgomento(c);
      return gruppiSelezionati.includes(g.chiave) || c.id === tipoCorsoId;
    });
  }, [corsi, gruppiSelezionati, tipoCorsoId]);

  return (
    <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <Label>Tipo corso</Label>
          {gruppiSelezionati.length > 0 && (
            <button
              type="button"
              onClick={() => setGruppiSelezionati([])}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Mostra tutti ({corsi.length})
            </button>
          )}
        </div>

        {/* Bottoni filtri per argomento (multiselezione) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {GRUPPI_ARGOMENTO.map((g) => {
            const attivo = gruppiSelezionati.includes(g.chiave);
            return (
              <button
                key={g.chiave}
                type="button"
                onClick={() => toggleGruppo(g.chiave)}
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer",
                  attivo
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted"
                )}
                title={`Filtra per ${g.titolo}`}
              >
                {g.titolo}
              </button>
            );
          })}
        </div>

        <Select value={tipoCorsoId} onValueChange={setTipoCorsoId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un corso..." />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {corsiFiltrati.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.codice ? `[${c.codice}] ` : ""}{c.macro_categoria} — {c.nome_corso}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Data corso</Label>
          <Input type="date" value={dataCorso} onChange={(e) => setDataCorso(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Ore dichiarate</Label>
          <Input type="number" step="0.5" value={ore} onChange={(e) => setOre(e.target.value)} />
        </div>
      </div>

      {mostraNote && (
        <div className="space-y-2">
          <Label>Note di rifiuto *</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Indica il motivo del respingimento"
          />
        </div>
      )}
    </>
  );
}
