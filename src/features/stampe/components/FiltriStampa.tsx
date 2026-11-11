/*
 * File:      FiltriStampa.tsx
 * Percorso:  src/features/stampe/components/FiltriStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Pannello scelta modello e filtri di stampa.
 *   rev 2 — 03/11/2026 20:50 — Filtri dinamici ruolo/categoria/materia, scadenza 9 mesi; stampa spostata in alto a destra.
 *   rev 3 — 05/11/2026 18:30 — Pulsante «Nuovi arrivati dell'anno» sopra i tipi di documento, con scelta anno scolastico/solare.
 *   rev 4 — 05/11/2026 19:50 — Pulsanti attivi in verde scuro, nuovo pulsante «Anagrafica incompleta», passaggio automatico
 *                              all'elenco lavoratori quando si accende una selezione.
 *   rev 5 — 06/11/2026 — Nuovo pulsante «Senza attestati» con scelta «Nessuno dei due» / «Manca almeno uno dei due».
 *   rev 6 — 07/11/2026 — Suggerimenti (tooltip) su pulsanti, filtri e opzioni; sottotitoli «per attestato» / «per incarico»;
 *                        spunta «Solo incarichi attualmente assegnati» per ogni gruppo con ruolo collegato; filtro «Classe di concorso» al posto di «Materia».
 *   rev 7 — 11/11/2026 20:05 — Sostituita la singola spunta «Includi cessati» con il menu «Stato lavoratore» (Solo in forza / Solo cessati / Tutti).
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Dipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { SUGGERIMENTI, SUGGERIMENTI_MODELLO } from "../suggerimenti";
import {
  conSelezione, dataIt, ruoliDelGruppo, TITOLI_MODELLO, TUTTI,
  type FiltriStampa as Filtri, type FiltroStatoLavoratore, type Modello, type Finestra, type PeriodoArrivi, type ModoSenza,
} from "../dati-stampa";

type Props = {
  filtri: Filtri;
  onChange: (f: Filtri) => void;
  reparti: string[];
  ruoli: { id: string; nome: string }[];
  categorie: string[];
  classi: string[];
  /** Tutti i ruoli attivi della Matrice (per sapere se un gruppo corsi ha un ruolo collegato). */
  ruoliCatalogo?: RuoloSicurezza[];
  dipendenti: Dipendente[];
  conteggio: number;
  infoArrivi: { inizio: string | null; senzaData: number };
};

const sel = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

/** Pulsante a scelta: quando è attivo diventa verde scuro con testo bianco. */
const ATTIVO = "border-emerald-950 bg-emerald-800 text-white shadow-md hover:border-emerald-950 hover:bg-emerald-900 hover:text-white active:bg-emerald-950 dark:bg-emerald-700";

/** Fumetto esplicativo al passaggio del mouse. */
function Suggerimento({ testo, children }: { testo: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs text-xs leading-snug">{testo}</TooltipContent>
    </Tooltip>
  );
}

function PulsanteScelta({ attivo, onClick, suggerimento, children }: { attivo: boolean; onClick: () => void; suggerimento?: string; children: React.ReactNode }) {
  const pulsante = (
    <Button
      size="sm"
      type="button"
      variant={attivo ? "default" : "outline"}
      aria-pressed={attivo}
      className={`w-full justify-start ${attivo ? ATTIVO : ""}`}
      onClick={onClick}
    >
      {children}
    </Button>
  );
  return suggerimento ? <Suggerimento testo={suggerimento}>{pulsante}</Suggerimento> : pulsante;
}

export function FiltriStampa({ filtri, onChange, reparti, ruoli, categorie, classi, ruoliCatalogo = [], dipendenti, conteggio, infoArrivi }: Props) {
  const set = <K extends keyof Filtri>(k: K, v: Filtri[K]) => onChange({ ...filtri, [k]: v });
  const anagrafica = filtri.modello === "lavoratori";
  const arrivi = filtri.arrivi !== "no";
  const mostraCategorie = filtri.reparto !== "Docente" && categorie.length > 0;
  const mostraClassi = filtri.reparto !== "ATA" && classi.length > 0;
  const incarichiOk = ruoliDelGruppo(filtri.gruppo, ruoliCatalogo).length > 0;
  const titoloGruppo = GRUPPI_ARGOMENTO.find((g) => g.chiave === filtri.gruppo)?.titolo ?? "";

  const cambiaReparto = (reparto: string) =>
    onChange({
      ...filtri,
      reparto,
      categoria: reparto === "Docente" ? TUTTI : filtri.categoria,
      classe: reparto === "ATA" ? TUTTI : filtri.classe,
    });

  const valoreStato: FiltroStatoLavoratore =
    filtri.statoLavoratori ?? (filtri.includiCessati ? "tutti" : "in_forza");

  return (
    <TooltipProvider delayDuration={250}>
      <aside className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm print:hidden">
        <div className="space-y-1.5">
          <p className="mb-2 font-semibold">Selezione</p>
          <PulsanteScelta suggerimento={SUGGERIMENTI.arrivi} attivo={arrivi} onClick={() => onChange(conSelezione(filtri, { arrivi: arrivi ? "no" : "scolastico" }))}>
            Nuovi arrivati dell'anno
          </PulsanteScelta>
          {arrivi && (
            <>
              <select
                className={sel}
                aria-label="Periodo dei nuovi arrivati"
                value={filtri.arrivi}
                onChange={(e) => set("arrivi", e.target.value as PeriodoArrivi)}
              >
                <option value="scolastico">Anno scolastico (dal 1 settembre)</option>
                <option value="solare">Anno solare (dal 1 gennaio)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Assunti dal {dataIt(infoArrivi.inizio)}.
                {infoArrivi.senzaData > 0 && ` ${infoArrivi.senzaData} lavoratori senza data di assunzione non sono inclusi.`}
              </p>
            </>
          )}
          <PulsanteScelta suggerimento={SUGGERIMENTI.incompleta} attivo={filtri.incompleta} onClick={() => onChange(conSelezione(filtri, { incompleta: !filtri.incompleta }))}>
            Anagrafica incompleta
          </PulsanteScelta>
          {filtri.incompleta && (
            <p className="text-xs text-muted-foreground">
              Lavoratori a cui manca almeno un dato (l'email non conta). Compaiono le colonne dei dati mancanti.
            </p>
          )}
          <PulsanteScelta suggerimento={SUGGERIMENTI.senzaAttestati} attivo={filtri.senzaAttestati} onClick={() => onChange(conSelezione(filtri, { senzaAttestati: !filtri.senzaAttestati }))}>
            Senza attestati
          </PulsanteScelta>
          {filtri.senzaAttestati && (
            <>
              <select
                className={sel}
                aria-label="Quali lavoratori senza attestati"
                value={filtri.senzaModo}
                onChange={(e) => set("senzaModo", e.target.value as ModoSenza)}
              >
                <option value="almeno">Manca almeno uno dei due (base o specifico)</option>
                <option value="nessuno">Nessuno dei due (né base né specifico)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Minimi richiesti: Corso base e Corso specifico. Nelle due colonne compare la data se c'è, «No» se manca.
              </p>
            </>
          )}
        </div>

        <div>
          <p className="mb-2 font-semibold">Tipo di documento</p>
          <div className="flex flex-col gap-1.5">
            {(Object.keys(TITOLI_MODELLO) as Modello[]).map((m) => (
              <PulsanteScelta key={m} suggerimento={SUGGERIMENTI_MODELLO[m]} attivo={filtri.modello === m} onClick={() => set("modello", m)}>
                {TITOLI_MODELLO[m]}
              </PulsanteScelta>
            ))}
          </div>
        </div>

        {!anagrafica && (
          <div className="space-y-1.5">
            <label className="block space-y-1">
              <Suggerimento testo={SUGGERIMENTI.gruppo}><span className="font-medium">Gruppo corsi</span></Suggerimento>
              <select className={sel} value={filtri.gruppo} onChange={(e) => set("gruppo", e.target.value)}>
                <option value={TUTTI}>Tutti i gruppi</option>
                {GRUPPI_ARGOMENTO.map((g) => <option key={g.chiave} value={g.chiave}>{g.titolo}</option>)}
              </select>
            </label>
            <p className="text-xs text-sky-700 dark:text-sky-300">Cerca per attestato conseguito (storico)</p>
            <Suggerimento testo={SUGGERIMENTI.soloIncarichi}>
              <label className={`flex items-center gap-2 ${incarichiOk ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <Checkbox
                  disabled={!incarichiOk}
                  checked={incarichiOk && filtri.soloIncarichi}
                  onCheckedChange={(v) => set("soloIncarichi", v === true)}
                />
                Solo incarichi attualmente assegnati
              </label>
            </Suggerimento>
            {!incarichiOk && (
              <p className="text-xs text-muted-foreground">
                {filtri.gruppo === TUTTI
                  ? "Scegli un gruppo corsi per poterla usare."
                  : filtri.gruppo === "altro"
                    ? "Il gruppo «Altro» non ha un ruolo collegato."
                    : `Nella Matrice non c'è un ruolo collegato a «${titoloGruppo}»: crea un ruolo con macro-categoria «${titoloGruppo}» e la spunta funzionerà.`}
              </p>
            )}
          </div>
        )}

        <label className="block space-y-1">
          <Suggerimento testo={SUGGERIMENTI.reparto}><span className="font-medium">Reparto</span></Suggerimento>
          <select className={sel} value={filtri.reparto} onChange={(e) => cambiaReparto(e.target.value)}>
            <option value={TUTTI}>Tutti i reparti</option>
            {reparti.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>

        <div className="space-y-1">
          <label className="block space-y-1">
            <Suggerimento testo={SUGGERIMENTI.ruolo}><span className="font-medium">Ruolo di sicurezza</span></Suggerimento>
            <select className={sel} value={filtri.ruoloId} onChange={(e) => set("ruoloId", e.target.value)}>
              <option value={TUTTI}>Tutti i ruoli</option>
              {ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </label>
          <p className="text-xs text-amber-700 dark:text-amber-300">Cerca per incarico formale attivo</p>
        </div>

        {mostraCategorie && (
          <label className="block space-y-1">
            <Suggerimento testo={SUGGERIMENTI.categoria}><span className="font-medium">Categoria / Profilo ATA</span></Suggerimento>
            <select className={sel} value={filtri.categoria} onChange={(e) => set("categoria", e.target.value)}>
              <option value={TUTTI}>Tutte le categorie</option>
              {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        {mostraClassi && (
          <label className="block space-y-1">
            <Suggerimento testo={SUGGERIMENTI.classe}><span className="font-medium">Classe di concorso</span></Suggerimento>
            <select className={sel} value={filtri.classe} onChange={(e) => set("classe", e.target.value)}>
              <option value={TUTTI}>Tutte le classi di concorso</option>
              {classi.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        )}

        <label className="block space-y-1">
          <Suggerimento testo={SUGGERIMENTI.lavoratore}><span className="font-medium">Lavoratore</span></Suggerimento>
          <select className={sel} value={filtri.dipendenteId} onChange={(e) => set("dipendenteId", e.target.value)}>
            <option value={TUTTI}>Tutti i lavoratori</option>
            {dipendenti.map((d) => <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>)}
          </select>
        </label>

        {!anagrafica && (
          <label className="block space-y-1">
            <Suggerimento testo={SUGGERIMENTI.scadenza}><span className="font-medium">Scadenza</span></Suggerimento>
            <select className={sel} value={filtri.finestra} onChange={(e) => set("finestra", e.target.value as Finestra)}>
              <option value="tutti">{filtri.modello === "scadenze" ? "Entro 1 anno" : "Tutti"}</option>
              <option value="scaduti">Solo scaduti</option>
              <option value="90">Scaduti + entro 90 giorni</option>
              <option value="180">Scaduti + entro 6 mesi</option>
              <option value="270">Scaduti + entro 9 mesi</option>
              <option value="365">Scaduti + entro 1 anno</option>
            </select>
          </label>
        )}

        {/* Selettore Stato lavoratore */}
        <label className="block space-y-1">
          <Suggerimento testo={SUGGERIMENTI.statoLavoratori}>
            <span className="font-medium">Stato lavoratore</span>
          </Suggerimento>
          <select
            className={sel}
            value={valoreStato}
            onChange={(e) => {
              const v = e.target.value as FiltroStatoLavoratore;
              onChange({
                ...filtri,
                statoLavoratori: v,
                includiCessati: v !== "in_forza",
              });
            }}
          >
            <option value="in_forza">Solo in forza (in servizio)</option>
            <option value="solo_cessati">Solo cessati</option>
            <option value="tutti">Tutti (in forza + cessati)</option>
          </select>
        </label>

        <div className="space-y-2">
          {([
            ...(anagrafica ? [] : [["soloUltimo", "Solo l'attestato più recente per corso"]]),
            ["mostraFirme", "Spazio firme in fondo"],
          ] as [("soloUltimo" | "mostraFirme"), string][]).map(([k, l]) => (
            <Suggerimento key={k} testo={SUGGERIMENTI[k]}>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={filtri[k]} onCheckedChange={(v) => set(k, v === true)} />
                {l}
              </label>
            </Suggerimento>
          ))}
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium">
          {conteggio} righe in anteprima
        </div>
      </aside>
    </TooltipProvider>
  );
}
