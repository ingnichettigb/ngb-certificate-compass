/*
 * File:          ZonaLavoratore.tsx
 * Percorso:      src/features/dipendenti/aggancia-allegato/ZonaLavoratore.tsx
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Dati lavoratore precompilati e dati dell'allegato.
 *   - Rev 2 (2026-10-26 16:45): Catalogo corsi completo con codici standard, descrizione, spunta visiva e ricalcolo scadenza.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTipiCorso, type TipoCorso, type Dipendente } from "@/lib/api";

const CODICI_CORSI_STANDARD: Record<string, string> = {
  "Sicurezza Generale": "SIC-GEN-04",
  "Sicurezza Specifica Rischio Basso": "SIC-BAS-04",
  "Sicurezza Specifica Rischio Medio": "SIC-MED-08",
  "Sicurezza Specifica Rischio Alto": "SIC-ALT-12",
  "Aggiornamento Lavoratori": "SIC-AGG-06",
  "Preposto": "PRP-BAS-12",
  "Aggiornamento Preposto": "PRP-AGG-06",
  "Antincendio Livello 1 Base": "ANT-L1B-04",
  "Aggiornamento Antincendio Livello 1": "ANT-L1A-02",
  "Antincendio Livello 2": "ANT-L2B-08",
  "Aggiornamento Antincendio Livello 2": "ANT-L2A-05",
  "Primo Soccorso Gruppo A Base": "PSO-GAB-16",
  "Aggiornamento Primo Soccorso Gruppo A": "PSO-GAA-06",
  "Primo Soccorso Gruppo B/C Base": "PSO-BCB-12",
  "Aggiornamento Primo Soccorso Gruppo B/C": "PSO-BCA-04",
  "Uso del DAE (BLSD)": "BLS-BAS-05",
  "Aggiornamento Uso del DAE (BLSD)": "BLS-AGG-02",
  "Prova di Evacuazione / Emergenze": "EME-EVA-02",
};

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
  const { data: corsi = [], isLoading } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  const codiciMappa = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of corsi) {
      const cod = c.codice || CODICI_CORSI_STANDARD[c.nome_corso] || "";
      map.set(c.nome_corso, cod);
    }
    return map;
  }, [corsi]);

  function ricalcolaScadenza(nomeCorso: string, dataRif: string): string {
    const c = corsi.find((x) => x.nome_corso === nomeCorso);
    if (!c || !dataRif || !c.durata_validita_anni) return "";
    const d = new Date(dataRif);
    if (isNaN(d.getTime())) return "";
    d.setFullYear(d.getFullYear() + c.durata_validita_anni);
    return d.toISOString().slice(0, 10);
  }

  function selezionaTipo(nuovoTipo: string) {
    let nuovaScadenza = dati.scadenza;
    if (dati.dataCorso && nuovoTipo !== "Altro") {
      const calcolata = ricalcolaScadenza(nuovoTipo, dati.dataCorso);
      if (calcolata) nuovaScadenza = calcolata;
    }
    onCambia({ ...dati, tipo: nuovoTipo, scadenza: nuovaScadenza });
  }

  function cambiaDataCorso(nuovaData: string) {
    let nuovaScadenza = dati.scadenza;
    if (nuovaData && dati.tipo && dati.tipo !== "Altro") {
      const calcolata = ricalcolaScadenza(dati.tipo, nuovaData);
      if (calcolata) nuovaScadenza = calcolata;
    }
    onCambia({ ...dati, dataCorso: nuovaData, scadenza: nuovaScadenza });
  }

  const corsoSelezionato = corsi.find((c) => c.nome_corso === dati.tipo);
  const codiceSelezionato = dati.tipo ? codiciMappa.get(dati.tipo) : "";

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
          <Select value={dati.tipo} onValueChange={selezionaTipo}>
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
                ) : dati.tipo === "Altro" ? (
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
                    const codice = codiciMappa.get(c.nome_corso) || "";
                    const sel = dati.tipo === c.nome_corso;
                    return (
                      <SelectItem key={c.id} value={c.nome_corso} className="cursor-pointer py-2">
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
                  <SelectItem value="Altro" className="cursor-pointer border-t border-border py-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          dati.tipo === "Altro"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {dati.tipo === "Altro" && <Check className="size-3 stroke-[3]" />}
                      </span>
                      <span className="font-semibold text-foreground">Altro (corso fuori catalogo)</span>
                    </div>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {dati.tipo === "Altro" && (
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
