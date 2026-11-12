/*
 * File:      PannelloSoloNuovi.tsx
 * Percorso:  src/features/dipendenti/import-elenco/PannelloSoloNuovi.tsx
 * Creato:    05/11/2026
 * Anteprima e conferma dell'importazione: ogni codice fiscale è confrontato con l'archivio
 * (nuovo / già presente in forza / già presente cessato). Tutte le caselle sono sbloccate,
 * con 4 pulsanti di selezione rapida (Tutti, Nessuno, Solo nuovi, Solo già in archivio).
 * I cessati selezionati vengono riesumati e inviati in «Da completare».
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 *   rev 2 — 06/11/2026 08:20 — Caselle di spunta singole.
 *   rev 3 — 06/11/2026 08:35 — Spunte libere per tutti, bottoni rapidi (Tutti/Nessuno/Nuovi/Archivio) e riesumazione cessati.
 *   rev 4 — 11/11/2026 — Colonne «Classe / Profilo» e «Funzioni» (X del file): per i già presenti selezionati le funzioni si aggiungono ai ruoli.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckSquare, FileUp, GraduationCap, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CHIAVE_ASSEGNAZIONI_RUOLI, type Dipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { formatData } from "@/lib/api/formattazione";
import { analizzaSoloNuovi, type CategoriaNuovo, type RepartoImport, type RigaGrezza } from "./analisi-elenco";
import { registraNuovi, type EsitoImportazione } from "./registra-nuovi";
import { FUNZIONI } from "./funzioni-sicurezza";

const ETICHETTA: Record<CategoriaNuovo, { testo: string; classe: string }> = {
  nuovo: { testo: "nuovo", classe: "bg-amber-500/25 text-amber-800" },
  presente_in_forza: { testo: "già presente · in forza", classe: "bg-emerald-500/15 text-emerald-700" },
  presente_cessato: { testo: "già presente · cessato (da riesumare)", classe: "bg-sky-500/20 text-sky-800" },
  non_valido: { testo: "CF non valido", classe: "bg-destructive/15 text-destructive" },
  doppione: { testo: "doppione", classe: "bg-muted text-muted-foreground" },
};

export function PannelloSoloNuovi({
  righe,
  nomeFile,
  dataInizio,
  dipendenti,
  ruoli,
  codiciClasse = [],
  repartoIniziale,
  onEsito,
  onAnnulla,
}: {
  righe: RigaGrezza[];
  nomeFile: string;
  dataInizio: string;
  dipendenti: Dipendente[];
  ruoli: RuoloSicurezza[];
  /** Codici delle classi di concorso presenti in archivio (per riconoscere la colonna Classe/Profilo). */
  codiciClasse?: string[];
  repartoIniziale: RepartoImport;
  onEsito: (e: EsitoImportazione) => void;
  onAnnulla: () => void;
}) {
  const qc = useQueryClient();
  const [reparto, setReparto] = useState<RepartoImport>(repartoIniziale);
  const [lavoro, setLavoro] = useState(false);

  const analisi = useMemo(() => analizzaSoloNuovi(righe, dipendenti, reparto, codiciClasse), [righe, dipendenti, reparto, codiciClasse]);

  // Di default sono selezionati i nuovi e i già presenti cessati (candidati alla riesumazione)
  const [selezionati, setSelezionati] = useState<Set<string>>(() => {
    const init = new Set<string>();
    analisi.forEach((r) => {
      if (r.categoria === "nuovo" || r.categoria === "presente_cessato") init.add(r.cf);
    });
    return init;
  });

  const conta = (c: CategoriaNuovo) => analisi.filter((r) => r.categoria === c).length;
  const nNuoviNelFile = conta("nuovo");

  const righeSelezionate = analisi.filter((r) => selezionati.has(r.cf));
  const nNuovi = righeSelezionate.filter((r) => r.categoria === "nuovo").length;
  const nCessatiDaRiesumare = righeSelezionate.filter((r) => r.categoria === "presente_cessato").length;

  const alterna = (cf: string) =>
    setSelezionati((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(cf)) dopo.delete(cf);
      else dopo.add(cf);
      return dopo;
    });

  // Selettori rapidi
  const selezionaTutti = () => {
    const tutti = new Set<string>();
    analisi.forEach((r) => {
      if (r.categoria !== "non_valido" && r.categoria !== "doppione") tutti.add(r.cf);
    });
    setSelezionati(tutti);
  };

  const selezionaNessuno = () => setSelezionati(new Set());

  const selezionaSoloNuovi = () => {
    const s = new Set<string>();
    analisi.forEach((r) => {
      if (r.categoria === "nuovo") s.add(r.cf);
    });
    setSelezionati(s);
  };

  const selezionaSoloArchivio = () => {
    const s = new Set<string>();
    analisi.forEach((r) => {
      if (r.categoria === "presente_in_forza" || r.categoria === "presente_cessato") s.add(r.cf);
    });
    setSelezionati(s);
  };

  async function conferma() {
    if (righeSelezionate.length === 0) return;
    setLavoro(true);

    const idsCessati = righeSelezionate
      .filter((r) => r.categoria === "presente_cessato" && !!r.dipendenteId)
      .map((r) => r.dipendenteId!);

    try {
      const esito = await registraNuovi({
        righe: righeSelezionate,
        dataInizio,
        ruoli,
        idsDaRiesumare: idsCessati,
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dipendenti"] }),
        qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
      ]);

      const messaggi: string[] = [];
      if (esito.inseriti.length > 0) messaggi.push(`${esito.inseriti.length} nuovi inseriti`);
      if (esito.riabilitatiSubito.length > 0) messaggi.push(`${esito.riabilitatiSubito.length} riesumati in servizio`);
      toast.success(messaggi.join(" e ") || "Registrazione completata");

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Reparto predefinito:</span>
            <div className="inline-flex rounded-md border border-border bg-background p-0.5">
              <Button
                type="button"
                size="sm"
                variant={reparto === "ATA" ? "default" : "ghost"}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setReparto("ATA")}
              >
                <Users className="size-3.5" /> ATA
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reparto === "Docente" ? "default" : "ghost"}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setReparto("Docente")}
              >
                <GraduationCap className="size-3.5" /> Docenti
              </Button>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Testi in MAIUSCOLO. Assunzione {formatData(dataInizio)}, tempo determinato.
          </span>
        </div>
      )}

      {/* Bottoni di selezione rapida */}
      {analisi.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Selezione rapida:</span>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaTutti}>
            <CheckSquare className="size-3 mr-1" /> Tutti ({analisi.filter((r) => r.categoria !== "non_valido" && r.categoria !== "doppione").length})
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaSoloNuovi}>
            Solo nuovi ({nNuoviNelFile})
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaSoloArchivio}>
            Solo già in archivio ({conta("presente_in_forza") + conta("presente_cessato")})
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={selezionaNessuno}>
            <Square className="size-3 mr-1" /> Nessuno
          </Button>
        </div>
      )}

      {righe.length > 0 && (
        <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <span>
              <strong>{nomeFile}</strong>: {analisi.length} righe — {righeSelezionate.length} selezionate ({nNuovi} nuovi,{" "}
              {nCessatiDaRiesumare} cessati da riesumare)
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-left">
              <tr>
                <th className="w-8 p-2" aria-label="Seleziona" />
                <th className="w-10 p-2 text-center">N°</th>
                <th className="p-2">Cognome e nome</th>
                <th className="p-2">Codice fiscale</th>
                <th className="p-2">Luogo di nascita</th>
                <th className="p-2">Nato il</th>
                <th className="p-2">Reparto</th>
                <th className="p-2">Classe / Profilo</th>
                <th className="p-2">Funzioni (X)</th>
                <th className="p-2">Stato archivio</th>
              </tr>
            </thead>
            <tbody>
              {analisi.map((r, n) => {
                const selezionato = selezionati.has(r.cf);
                const disabilitato = r.categoria === "non_valido" || r.categoria === "doppione";
                return (
                  <tr
                    key={`${r.cf}-${n}`}
                    className={`border-t border-border ${selezionato ? (r.categoria === "nuovo" ? "bg-amber-500/10" : "bg-sky-500/10") : "opacity-50 text-muted-foreground"}`}
                  >
                    <td className="p-2 text-center">
                      <Checkbox
                        aria-label={`Seleziona ${r.cognome} ${r.nome}`}
                        checked={selezionato}
                        disabled={disabilitato}
                        onCheckedChange={() => alterna(r.cf)}
                      />
                    </td>
                    <td className="p-2 text-center font-mono text-xs text-muted-foreground">{n + 1}</td>
                    <td className="p-2 font-medium">{r.cognome} {r.nome}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{r.cf}</td>
                    <td className="p-2 text-xs">{r.luogoNascita || "—"}</td>
                    <td className="p-2 text-xs">{r.dataNascita ? formatData(r.dataNascita) : "—"}</td>
                    <td className="p-2 text-xs">{r.reparto}</td>
                    <td className="p-2 text-xs">{r.classe ?? r.sottorepartoAta ?? "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {FUNZIONI.filter((f) => r.funzioni[f.chiave]).map((f) => (
                          <span key={f.chiave} title={f.intestazione} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {f.breve}
                          </span>
                        ))}
                        {FUNZIONI.every((f) => !r.funzioni[f.chiave]) && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-2">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ETICHETTA[r.categoria].classe}`}>
                        {ETICHETTA[r.categoria].testo}
                      </span>
                      {r.avvisi.map((a) => (
                        <div key={a} className="mt-0.5 text-[11px] font-medium text-amber-700">{a}</div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-2">
        <Button variant="outline" onClick={onAnnulla}>Annulla</Button>
        <Button disabled={lavoro || righeSelezionate.length === 0} onClick={conferma} className="gap-1.5">
          <FileUp className="size-4" /> Registra e riesuma {righeSelezionate.length} nominativi
        </Button>
      </div>
    </>
  );
}
