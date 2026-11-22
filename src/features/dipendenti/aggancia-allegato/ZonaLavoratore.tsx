/*
 * File:          ZonaLavoratore.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/ZonaLavoratore.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Dati lavoratore precompilati e dati dell'allegato.
 *   - Rev 2 (2026-10-26 16:45): Catalogo corsi completo con codici standard, descrizione, spunta visiva e ricalcolo scadenza.
 *   - Rev 3 (2026-11-01 11:00): Mappa nome→codice allineata al catalogo reale (codici VFF-FOR… per l'antincendio, PSO-AgB-04,
 *     EME-PRO-02, SIC-SPE-…); i vecchi nomi dell'antincendio restano come alias.
 *   - Rev 4 (2026-11-22): Punto di verità ruoli-corsi (Fase 7). Il corso si sceglie per IDENTIFICATIVO, non per nome: base e
 *     aggiornamento hanno lo stesso nome e prima vinceva sempre il primo. Tolta la mappa nome→codice (i corsi hanno tutti il codice).
 *     Il corso si propone dal codice (o dal nome, se unico) scritto nel nome del file scelto e dai corsi che la Tabella 02 prevede per
 *     i ruoli del lavoratore e che mancano o sono scaduti. Il nome del documento porta il codice se più corsi hanno lo stesso nome.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Lightbulb, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getAttestati,
  getRuoliSicurezza,
  getTipiCorso,
  type TipoCorso,
  type Dipendente,
} from "@/lib/api";
import { useContestoRegole } from "../matrice/useContestoRegole";
import { useRegoleRuoloCorso } from "../matrice/useRegoleRuoloCorso";
import { corsiProposti, corsoDalNomeFile, etichettaCorso } from "./proposta-corso";

/** Voce «Altro» del menu: corso fuori catalogo, descritto a mano. */
const ALTRO = "Altro";

/**
 * tipo: testo del corso per il documento e per il nome file (con il codice se il nome è condiviso da più corsi);
 * tipoCorsoId: identificativo del corso scelto («Altro» per un corso fuori catalogo, vuoto se non scelto).
 */
export type DatiAllegato = { tipo: string; tipoCorsoId: string; altro: string; dataCorso: string; scadenza: string };

export function ZonaLavoratore({
  dipendente,
  dati,
  onCambia,
  nomeFile = null,
}: {
  dipendente: Dipendente;
  dati: DatiAllegato;
  onCambia: (d: DatiAllegato) => void;
  /** Nome del file scelto a sinistra: se contiene il codice del corso, il corso si propone da solo. */
  nomeFile?: string | null;
}) {
  const { data: corsi = [], isLoading } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });
  const { data: ruoli = [] } = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza, retry: false });
  const { data: assegnazioni = [] } = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli, retry: false });
  const { data: attestati = [] } = useQuery({ queryKey: ["attestati", "Tutti"], queryFn: () => getAttestati("Tutti") });
  const regole = useRegoleRuoloCorso();
  const contesto = useContestoRegole();
  const [suggerimento, setSuggerimento] = useState<string | null>(null);
  const autoDaFile = useRef(false);
  const ultimoFile = useRef<string | null>(null);

  /** Corsi previsti dalla Tabella 02 per i ruoli del lavoratore che mancano o sono scaduti. */
  const proposti = useMemo(
    () =>
      regole && regole.length > 0
        ? corsiProposti({ ruoli, assegnazioni, dipendenteId: dipendente.id, regole, contesto, corsi, attestati })
        : [],
    [ruoli, assegnazioni, dipendente.id, regole, contesto, corsi, attestati],
  );

  function ricalcolaScadenza(corso: TipoCorso | undefined, dataRif: string): string {
    if (!corso || !dataRif || !corso.durata_validita_anni) return "";
    const d = new Date(dataRif);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + corso.durata_validita_anni);
    return d.toISOString().slice(0, 10);
  }

  function datiPerCorso(corso: TipoCorso): DatiAllegato {
    const calcolata = dati.dataCorso ? ricalcolaScadenza(corso, dati.dataCorso) : "";
    return { ...dati, tipo: etichettaCorso(corso, corsi), tipoCorsoId: corso.id, scadenza: calcolata || dati.scadenza };
  }

  function selezionaCorso(corso: TipoCorso) {
    autoDaFile.current = false;
    setSuggerimento(null);
    onCambia(datiPerCorso(corso));
  }

  function selezionaVoce(valore: string) {
    if (valore === ALTRO) {
      autoDaFile.current = false;
      setSuggerimento(null);
      onCambia({ ...dati, tipo: ALTRO, tipoCorsoId: ALTRO });
      return;
    }
    const corso = corsi.find((c) => c.id === valore);
    if (corso) selezionaCorso(corso);
  }

  // Il file scelto contiene il codice (o il nome, se unico) di un corso: lo propone, senza mai scavalcare una scelta fatta a mano
  useEffect(() => {
    if (!nomeFile || nomeFile === ultimoFile.current || corsi.length === 0) return;
    ultimoFile.current = nomeFile;
    if (dati.tipoCorsoId && !autoDaFile.current) return;
    const trovato = corsoDalNomeFile(nomeFile, corsi);
    if (!trovato) {
      if (autoDaFile.current) setSuggerimento(null);
      return;
    }
    autoDaFile.current = true;
    setSuggerimento(
      trovato.via === "codice"
        ? `Proposto dal codice nel nome del file (${trovato.corso.codice}).`
        : "Proposto dal nome del corso nel nome del file.",
    );
    onCambia(datiPerCorso(trovato.corso));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeFile, corsi]);

  function cambiaDataCorso(nuovaData: string) {
    let nuovaScadenza = dati.scadenza;
    const corso = corsi.find((c) => c.id === dati.tipoCorsoId);
    if (nuovaData && corso) {
      const calcolata = ricalcolaScadenza(corso, nuovaData);
      if (calcolata) nuovaScadenza = calcolata;
    }
    onCambia({ ...dati, dataCorso: nuovaData, scadenza: nuovaScadenza });
  }

  const corsoSelezionato = corsi.find((c) => c.id === dati.tipoCorsoId);
  const codiceSelezionato = corsoSelezionato?.codice ?? "";

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
          <Label>Tipo attestato / Corso identificato</Label>
          <Select value={dati.tipoCorsoId} onValueChange={selezionaVoce}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Scegli il corso dal catalogo">
                {corsoSelezionato ? (
                  <span className="flex items-center gap-2 truncate">
                    {codiceSelezionato && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                        {codiceSelezionato}
                      </span>
                    )}
                    <span className="truncate font-medium">{corsoSelezionato.nome_corso}</span>
                  </span>
                ) : dati.tipoCorsoId === ALTRO ? (
                  <span className="font-medium">Altro (specifica sotto)</span>
                ) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[150] max-h-80 w-[min(92vw,560px)]">
              {isLoading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Caricamento corsi…
                </div>
              ) : (
                <>
                  {corsi.map((c: TipoCorso) => {
                    const codice = c.codice || "";
                    const sel = dati.tipoCorsoId === c.id;
                    return (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer py-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                              sel
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {sel && <Check className="size-3 stroke-[3]" />}
                          </span>
                          {codice && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                              {codice}
                            </span>
                          )}
                          <span className="font-medium text-foreground">{c.nome_corso}</span>
                          {(c.ore_minime_legge || c.durata_validita_anni) && (
                            <span className="ml-auto pl-2 text-xs text-muted-foreground">
                              {[
                                c.ore_minime_legge ? `${c.ore_minime_legge}h` : null,
                                c.durata_validita_anni ? `${c.durata_validita_anni}a` : "illimitata",
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value={ALTRO} className="cursor-pointer border-t border-border py-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          dati.tipoCorsoId === ALTRO
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {dati.tipoCorsoId === ALTRO && <Check className="size-3 stroke-[3]" />}
                      </span>
                      <span className="font-semibold text-foreground">Altro (corso fuori catalogo)</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {suggerimento && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2">
            <Lightbulb className="size-3.5" /> {suggerimento}
          </p>
        )}

        {proposti.length > 0 && (
          <div className="space-y-1 sm:col-span-2" aria-label="Corsi proposti per questo lavoratore">
            <span className="text-xs text-muted-foreground">Proposti per questo lavoratore (dai suoi ruoli)</span>
            <div className="flex flex-wrap gap-1.5">
              {proposti.slice(0, 6).map((p) => (
                <button
                  key={p.corso.id}
                  type="button"
                  onClick={() => selezionaCorso(p.corso)}
                  className={`rounded-md border px-2 py-1 text-left text-xs hover:bg-muted ${
                    dati.tipoCorsoId === p.corso.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                  title={p.dettaglio}
                >
                  <span className="font-mono font-semibold text-primary">{p.corso.codice}</span>{" "}
                  <span className="font-medium">{p.corso.nome_corso}</span>
                  <span className="block text-muted-foreground">{p.dettaglio}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {dati.tipoCorsoId === ALTRO && (
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrizione attestato personalizzato</Label>
            <Input
              value={dati.altro}
              onChange={(e) => onCambia({ ...dati, altro: e.target.value })}
              placeholder="Es. Corso specifico carrello elevatore, PLE, ecc."
            />
          </div>
        )}

        <div className="space-y-1">
          <Label>Data corso (emanazione)</Label>
          <Input
            type="date"
            value={dati.dataCorso}
            onChange={(e) => cambiaDataCorso(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Scadenza</Label>
          <Input
            type="date"
            value={dati.scadenza}
            onChange={(e) => onCambia({ ...dati, scadenza: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
