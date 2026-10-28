/*
 * File:      BloccoContratto.tsx
 * Percorso:  src/features/contratti/BloccoContratto.tsx
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 09:50 — Scheda contratto: avviso scadenza, Riconferma, Termina (limbo), Riattiva.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Archive, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aggiornaContrattoDipendente, formatData, type DatiContratto, type Dipendente } from "@/lib/api";
import { CampiContratto } from "./CampiContratto";
import { giorniAllaFine, isCessato, richiedeDecisione } from "./contratto";

const oggiIso = () => new Date().toISOString().slice(0, 10);

function datiDa(d: Dipendente): DatiContratto {
  return {
    tipo_contratto: d.tipo_contratto ?? "indeterminato",
    data_assunzione: d.data_assunzione ?? "",
    data_fine_contratto: d.data_fine_contratto ?? "",
    note_contratto: d.note_contratto ?? "",
  };
}

export function BloccoContratto({ corrente }: { corrente: Dipendente }) {
  const qc = useQueryClient();
  const [modifica, setModifica] = useState(false);
  const [valori, setValori] = useState<DatiContratto>(datiDa(corrente));
  const [dataFine, setDataFine] = useState(oggiIso());
  const [chiedeTermine, setChiedeTermine] = useState(false);

  useEffect(() => {
    setValori(datiDa(corrente));
    setModifica(false);
    setChiedeTermine(false);
  }, [corrente]);

  async function salva(dati: DatiContratto, msg: string) {
    try {
      await aggiornaContrattoDipendente(corrente.id, dati);
      toast.success(msg);
      setModifica(false);
      setChiedeTermine(false);
      qc.invalidateQueries({ queryKey: ["dipendenti"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const cessato = isCessato(corrente);
  const giorni = giorniAllaFine(corrente);
  const avviso = richiedeDecisione(corrente);

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Contratto</h3>
        {!cessato && !modifica && (
          <Button size="sm" variant="outline" onClick={() => setModifica(true)}>
            <Pencil className="size-4" /> Modifica / Riconferma
          </Button>
        )}
      </div>

      {cessato ? (
        <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Archive className="size-4" /> Cessato il {formatData(corrente.data_cessazione ?? null)} — conservato in archivio con tutti gli attestati.
          </p>
          <Button size="sm" variant="outline" onClick={() => salva({ stato_lavoratore: "in_forza", data_cessazione: null }, "Lavoratore riattivato")}>
            <RotateCcw className="size-4" /> Riattiva (riassunto)
          </Button>
        </div>
      ) : modifica ? (
        <div className="space-y-2">
          <CampiContratto valori={valori} onChange={setValori} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => salva(valori, "Contratto aggiornato")}>Salva</Button>
            <Button size="sm" variant="outline" onClick={() => { setValori(datiDa(corrente)); setModifica(false); }}>Annulla</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tempo {corrente.tipo_contratto ?? "indeterminato"}
          {corrente.data_assunzione ? ` · assunto il ${formatData(corrente.data_assunzione)}` : ""}
          {corrente.tipo_contratto === "determinato"
            ? ` · scadenza ${corrente.data_fine_contratto ? formatData(corrente.data_fine_contratto) : "non indicata"}`
            : ""}
          {corrente.note_contratto ? ` · ${corrente.note_contratto}` : ""}
        </p>
      )}

      {avviso && !modifica && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="size-4 text-destructive" />
          <span className="font-medium">
            {giorni! < 0 ? `Contratto scaduto da ${-giorni!} giorni` : `Contratto in scadenza fra ${giorni} giorni`}: scegli se riconfermare o terminare.
          </span>
        </div>
      )}

      {!cessato && !modifica && (
        chiedeTermine ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Data fine rapporto:</span>
            <Input type="date" className="w-44" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
            <Button size="sm" variant="destructive" onClick={() => salva({ stato_lavoratore: "cessato", data_cessazione: dataFine }, "Lavoratore spostato tra i cessati")}>
              Conferma termine
            </Button>
            <Button size="sm" variant="outline" onClick={() => setChiedeTermine(false)}>Annulla</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setChiedeTermine(true)}>
            <Archive className="size-4" /> Termina rapporto
          </Button>
        )
      )}
    </div>
  );
}
