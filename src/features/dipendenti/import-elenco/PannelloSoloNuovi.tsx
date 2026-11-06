/*
 * File:      PannelloSoloNuovi.tsx
 * Percorso:  src/features/dipendenti/import-elenco/PannelloSoloNuovi.tsx
 * Creato:    05/11/2026
 * Anteprima e conferma dell'importazione «solo nuovi»: ogni codice fiscale è confrontato con l'archivio
 * (nuovo / già presente in forza / già presente cessato). Si inseriscono solo i nuovi, con nascita dal file,
 * data di assunzione scelta in testa alla finestra, contratto determinato e testi in MAIUSCOLO.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 *   rev 2 — 06/11/2026 08:20 — Casella su ogni riga: i nuovi sono spuntati e si possono escludere; i già presenti
 *            sono sempre esclusi (non toccati) e la loro casella è bloccata e vuota.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CHIAVE_ASSEGNAZIONI_RUOLI, type Dipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { formatData } from "@/lib/api/formattazione";
import { analizzaSoloNuovi, type CategoriaNuovo, type RepartoImport, type RigaGrezza } from "./analisi-elenco";
import { registraNuovi, type EsitoImportazione } from "./registra-nuovi";

const ETICHETTA: Record<CategoriaNuovo, { testo: string; classe: string }> = {
  nuovo: { testo: "nuovo", classe: "bg-amber-500/25 text-amber-800" },
  presente_in_forza: { testo: "già presente · in forza", classe: "bg-emerald-500/15 text-emerald-700" },
  presente_cessato: { testo: "già presente · cessato", classe: "bg-sky-500/20 text-sky-800" },
  non_valido: { testo: "CF non valido", classe: "bg-destructive/15 text-destructive" },
  doppione: { testo: "doppione", classe: "bg-muted text-muted-foreground" },
};

export function PannelloSoloNuovi({
  righe,
  nomeFile,
  dataInizio,
  dipendenti,
  ruoli,
  repartoIniziale,
  onEsito,
  onAnnulla,
}: {
  righe: RigaGrezza[];
  nomeFile: string;
  dataInizio: string;
  dipendenti: Dipendente[];
  ruoli: RuoloSicurezza[];
  repartoIniziale: RepartoImport;
  onEsito: (e: EsitoImportazione) => void;
  onAnnulla: () => void;
}) {
  const qc = useQueryClient();
  const [reparto, setReparto] = useState<RepartoImport>(repartoIniziale);
  const [lavoro, setLavoro] = useState(false);
  /** Codici fiscali dei nuovi che l'utente ha deselezionato. */
  const [esclusi, setEsclusi] = useState<Set<string>>(new Set());

  const analisi = useMemo(() => analizzaSoloNuovi(righe, dipendenti, reparto), [righe, dipendenti, reparto]);
  const conta = (c: CategoriaNuovo) => analisi.filter((r) => r.categoria === c).length;
  const nNuoviNelFile = conta("nuovo");
  const daInserire = analisi.filter((r) => r.categoria !== "nuovo" || !esclusi.has(r.cf));
  const nNuovi = daInserire.filter((r) => r.categoria === "nuovo").length;

  const alterna = (cf: string) =>
    setEsclusi((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(cf)) dopo.delete(cf);
      else dopo.add(cf);
      return dopo;
    });

  async function conferma() {
    if (nNuovi === 0) return;
    setLavoro(true);
    try {
      const esito = await registraNuovi({ righe: daInserire, dataInizio, ruoli });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dipendenti"] }),
        qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
      ]);
      toast.success(`${esito.inseriti.length} nuovi lavoratori inseriti`);
      onEsito(esito);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLavoro(false);
    }
  }

  return (
    <>
      {righe.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-semibold">Reparto se non indicato nel file:</span>
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <Button type="button" size="sm" variant={reparto === "ATA" ? "default" : "ghost"} className="h-8 gap-1.5 px-3 text-xs" onClick={() => setReparto("ATA")}>
              <Users className="size-3.5" /> ATA
            </Button>
            <Button type="button" size="sm" variant={reparto === "Docente" ? "default" : "ghost"} className="h-8 gap-1.5 px-3 text-xs" onClick={() => setReparto("Docente")}>
              <GraduationCap className="size-3.5" /> Docenti
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            Tutti i testi vengono scritti in MAIUSCOLO. Assunzione {formatData(dataInizio)}, contratto a tempo determinato.
          </span>
        </div>
      )}

      {righe.length > 0 && (
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <span>
              <strong>{nomeFile}</strong>: {analisi.length} righe — {nNuoviNelFile} nuovi
              {nNuoviNelFile !== nNuovi && ` (${nNuoviNelFile - nNuovi} esclusi da te)`}, {conta("presente_in_forza")} già presenti in forza,{" "}
              {conta("presente_cessato")} già presenti cessati
              {conta("non_valido") > 0 && `, ${conta("non_valido")} con codice fiscale non valido`}
              {conta("doppione") > 0 && `, ${conta("doppione")} doppioni`}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-left">
              <tr>
                <th className="w-8 p-2" aria-label="Inserisci" />
                <th className="w-10 p-2 text-center">N°</th>
                <th className="p-2">Cognome e nome</th>
                <th className="p-2">Codice fiscale</th>
                <th className="p-2">Luogo di nascita</th>
                <th className="p-2">Nato il</th>
                <th className="p-2">Reparto</th>
                <th className="p-2">Esito</th>
              </tr>
            </thead>
            <tbody>
              {analisi.map((r, n) => (
                <tr
                  key={`${r.cf}-${n}`}
                  className={`border-t border-border ${r.categoria === "nuovo" ? (esclusi.has(r.cf) ? "opacity-50" : "bg-amber-500/10") : "text-muted-foreground"}`}
                >
                  <td className="p-2 text-center">
                    <Checkbox
                      aria-label={`Inserisci ${r.cognome} ${r.nome}`}
                      checked={r.categoria === "nuovo" && !esclusi.has(r.cf)}
                      disabled={r.categoria !== "nuovo"}
                      onCheckedChange={() => alterna(r.cf)}
                    />
                  </td>
                  <td className="p-2 text-center font-mono text-xs text-muted-foreground">{n + 1}</td>
                  <td className="p-2 font-medium">{r.cognome} {r.nome}</td>
                  <td className="p-2 font-mono text-xs text-muted-foreground">{r.cf}</td>
                  <td className="p-2 text-xs">{r.luogoNascita || "—"}</td>
                  <td className="p-2 text-xs">{r.dataNascita ? formatData(r.dataNascita) : "—"}</td>
                  <td className="p-2 text-xs">{r.reparto}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ETICHETTA[r.categoria].classe}`}>
                      {ETICHETTA[r.categoria].testo}
                    </span>
                    {r.avvisi.map((a) => (
                      <div key={a} className="mt-0.5 text-[11px] font-medium text-amber-700">{a}</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-2">
        <Button variant="outline" onClick={onAnnulla}>Annulla</Button>
        <Button disabled={lavoro || nNuovi === 0} onClick={conferma} className="gap-1.5">
          <FileUp className="size-4" /> Conferma e registra {nNuovi} nominativi
        </Button>
      </div>
    </>
  );
}
