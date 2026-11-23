/*
 * File:          RigaDaValutare.tsx
 * Percorso:      src/features/formazione-valutazione/RigaDaValutare.tsx
 * Data creazione: 2026-11-21
 * Una riga della finestra «Formazione da valutare»: il lavoratore, il corso specifico che ha e quello atteso, le tre decisioni possibili
 * e la nota obbligatoria (da valutare); oppure la decisione già presa con «Annulla decisione» (decise).
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 5).
 *   - Rev 2 (2026-11-23): Anteprima del documento dell'attestato (fronte e retro) per decidere guardando il corso.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { salvaEquivalenzaAttestato } from "@/lib/api/attestati";
import { formatData } from "@/lib/api/formattazione";
import type { RischioDitta } from "@/features/dipendenti/matrice/condizioni-regole";
import { annullaDecisione, costruisciDecisione, erroreDecisione, ETICHETTA_ESITO, type EsitoEquivalenza } from "./decisioni";
import type { VoceDaValutare } from "./elenco";
import { AnteprimaAttestato } from "./AnteprimaAttestato";

const SCELTE: { esito: EsitoEquivalenza; aiuto: string }[] = [
  { esito: "accettata", aiuto: "Vale come la formazione attesa: il prerequisito Lavoratore è soddisfatto." },
  { esito: "integrazione", aiuto: "Non basta da sola: serve un'integrazione." },
  { esito: "non_valida", aiuto: "Non vale per il rischio di questa ditta (es. settore diverso)." },
];

const nomeCorso = (codice: string, nomi: Map<string, string>) => (nomi.has(codice) ? `${codice} – ${nomi.get(codice)}` : codice);

export function RigaDaValutare({
  voce,
  rischioDitta,
  nomiCorsi,
}: {
  voce: VoceDaValutare;
  rischioDitta: RischioDitta;
  nomiCorsi: Map<string, string>;
}) {
  const qc = useQueryClient();
  const [esito, setEsito] = useState<EsitoEquivalenza | null>(null);
  const [nota, setNota] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);
  const { dipendente: d, attestato: a, decisione } = voce;
  const id = a.id;

  async function esegui(patch: Parameters<typeof salvaEquivalenzaAttestato>[1], messaggio: string) {
    setSalvataggio(true);
    try {
      await salvaEquivalenzaAttestato(a.id, patch);
      await qc.invalidateQueries({ queryKey: ["attestati"] });
      toast.success(messaggio);
    } catch (e) {
      toast.error("Salvataggio non riuscito", { description: (e as { message?: string })?.message ?? String(e) });
    } finally {
      setSalvataggio(false);
    }
  }

  function salva() {
    const errore = erroreDecisione(esito, nota);
    if (errore || !esito) {
      toast.error(errore ?? "Scegli una decisione");
      return;
    }
    void esegui(
      costruisciDecisione({ esito, corsoSvolto: voce.corsoSvolto, corsoAtteso: voce.corsoAtteso, rischio: rischioDitta, nota, adesso: new Date() }),
      "Decisione salvata",
    );
  }

  return (
    <li className="rounded-xl border border-border bg-card p-3 shadow-xs">
      <p className="font-medium">
        {d.cognome} {d.nome}
      </p>
      <p className="text-sm text-muted-foreground">
        Ha <strong>{nomeCorso(voce.corsoSvolto, nomiCorsi)}</strong>
        {a.data_corso ? ` (del ${formatData(a.data_corso)})` : ""}. La ditta è a rischio <strong>{rischioDitta}</strong>: la formazione specifica
        attesa è <strong>{nomeCorso(voce.corsoAtteso, nomiCorsi)}</strong>.
      </p>

      <AnteprimaAttestato fronte={a.url_foto_fronte} retro={a.url_foto_retro} />

      {decisione ? (
        <div className="mt-2 space-y-1 text-sm">
          <p>
            <span className="rounded-md bg-muted px-2 py-0.5 font-medium">{ETICHETTA_ESITO[decisione.esito]}</span>{" "}
            <span className="text-muted-foreground">il {formatData(decisione.data)}</span>
          </p>
          <p className="text-muted-foreground">Nota: {decisione.nota}</p>
          <Button
            variant="outline"
            size="sm"
            disabled={salvataggio}
            onClick={() => void esegui(annullaDecisione(), "Decisione annullata: torna da valutare")}
          >
            Annulla decisione
          </Button>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <RadioGroup value={esito ?? ""} onValueChange={(v) => setEsito(v as EsitoEquivalenza)} aria-label={`Decisione per ${d.cognome} ${d.nome}`}>
            {SCELTE.map((s) => (
              <div key={s.esito} className="flex items-start gap-2">
                <RadioGroupItem value={s.esito} id={`${id}-${s.esito}`} className="mt-0.5" />
                <Label htmlFor={`${id}-${s.esito}`} className="grid gap-0.5 font-normal">
                  <span className="font-medium">{ETICHETTA_ESITO[s.esito]}</span>
                  <span className="text-xs text-muted-foreground">{s.aiuto}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <div className="space-y-1">
            <Label htmlFor={`${id}-nota`}>Nota (obbligatoria)</Label>
            <Textarea id={`${id}-nota`} value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
          </div>
          <Button size="sm" disabled={salvataggio || !esito || !nota.trim()} onClick={salva}>
            Salva decisione
          </Button>
        </div>
      )}
    </li>
  );
}
