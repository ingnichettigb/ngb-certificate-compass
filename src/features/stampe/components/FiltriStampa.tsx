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
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Dipendente } from "@/lib/api";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { conSelezione, dataIt, TITOLI_MODELLO, TUTTI, type FiltriStampa as Filtri, type Modello, type Finestra, type PeriodoArrivi, type ModoSenza } from "../dati-stampa";

type Props = {
  filtri: Filtri;
  onChange: (f: Filtri) => void;
  reparti: string[];
  ruoli: { id: string; nome: string }[];
  categorie: string[];
  materie: string[];
  dipendenti: Dipendente[];
  conteggio: number;
  infoArrivi: { inizio: string | null; senzaData: number };
};

const sel = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

/** Pulsante a scelta: quando è attivo diventa verde scuro con testo bianco. */
const ATTIVO = "border-emerald-950 bg-emerald-800 text-white shadow-md hover:border-emerald-950 hover:bg-emerald-900 hover:text-white active:bg-emerald-950 dark:bg-emerald-700";

function PulsanteScelta({ attivo, onClick, children }: { attivo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
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
}

export function FiltriStampa({ filtri, onChange, reparti, ruoli, categorie, materie, dipendenti, conteggio, infoArrivi }: Props) {
  const set = <K extends keyof Filtri>(k: K, v: Filtri[K]) => onChange({ ...filtri, [k]: v });
  const anagrafica = filtri.modello === "lavoratori";
  const arrivi = filtri.arrivi !== "no";
  const mostraCategorie = filtri.reparto !== "Docente" && categorie.length > 0;
  const mostraMaterie = filtri.reparto !== "ATA" && materie.length > 0;

  const cambiaReparto = (reparto: string) =>
    onChange({
      ...filtri,
      reparto,
      categoria: reparto === "Docente" ? TUTTI : filtri.categoria,
      materia: reparto === "ATA" ? TUTTI : filtri.materia,
    });

  return (
    <aside className="space-y-4 rounded-lg border border-border bg-card p-4 text-sm print:hidden">
      <div className="space-y-1.5">
        <p className="mb-2 font-semibold">Selezione</p>
        <PulsanteScelta attivo={arrivi} onClick={() => onChange(conSelezione(filtri, { arrivi: arrivi ? "no" : "scolastico" }))}>
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
        <PulsanteScelta attivo={filtri.incompleta} onClick={() => onChange(conSelezione(filtri, { incompleta: !filtri.incompleta }))}>
          Anagrafica incompleta
        </PulsanteScelta>
        {filtri.incompleta && (
          <p className="text-xs text-muted-foreground">
            Lavoratori a cui manca almeno un dato (l'email non conta). Compaiono le colonne dei dati mancanti.
          </p>
        )}
        <PulsanteScelta attivo={filtri.senzaAttestati} onClick={() => onChange(conSelezione(filtri, { senzaAttestati: !filtri.senzaAttestati }))}>
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
            <PulsanteScelta key={m} attivo={filtri.modello === m} onClick={() => set("modello", m)}>
              {TITOLI_MODELLO[m]}
            </PulsanteScelta>
          ))}
        </div>
      </div>

      {!anagrafica && (
        <label className="block space-y-1">
          <span className="font-medium">Gruppo corsi</span>
          <select className={sel} value={filtri.gruppo} onChange={(e) => set("gruppo", e.target.value)}>
            <option value={TUTTI}>Tutti i gruppi</option>
            {GRUPPI_ARGOMENTO.map((g) => <option key={g.chiave} value={g.chiave}>{g.titolo}</option>)}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-medium">Reparto</span>
        <select className={sel} value={filtri.reparto} onChange={(e) => cambiaReparto(e.target.value)}>
          <option value={TUTTI}>Tutti i reparti</option>
          {reparti.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="font-medium">Ruolo di sicurezza</span>
        <select className={sel} value={filtri.ruoloId} onChange={(e) => set("ruoloId", e.target.value)}>
          <option value={TUTTI}>Tutti i ruoli</option>
          {ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
      </label>

      {mostraCategorie && (
        <label className="block space-y-1">
          <span className="font-medium">Categoria / Profilo ATA</span>
          <select className={sel} value={filtri.categoria} onChange={(e) => set("categoria", e.target.value)}>
            <option value={TUTTI}>Tutte le categorie</option>
            {categorie.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}

      {mostraMaterie && (
        <label className="block space-y-1">
          <span className="font-medium">Materia</span>
          <select className={sel} value={filtri.materia} onChange={(e) => set("materia", e.target.value)}>
            <option value={TUTTI}>Tutte le materie</option>
            {materie.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      )}

      <label className="block space-y-1">
        <span className="font-medium">Lavoratore</span>
        <select className={sel} value={filtri.dipendenteId} onChange={(e) => set("dipendenteId", e.target.value)}>
          <option value={TUTTI}>Tutti i lavoratori</option>
          {dipendenti.map((d) => <option key={d.id} value={d.id}>{d.cognome} {d.nome}</option>)}
        </select>
      </label>

      {!anagrafica && (
        <label className="block space-y-1">
          <span className="font-medium">Scadenza</span>
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

      <div className="space-y-2">
        {([
          ...(anagrafica ? [] : [["soloUltimo", "Solo l'attestato più recente per corso"]]),
          ["includiCessati", "Includi lavoratori cessati"],
          ["mostraFirme", "Spazio firme in fondo"],
        ] as [("soloUltimo" | "includiCessati" | "mostraFirme"), string][]).map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={filtri[k]} onCheckedChange={(v) => set(k, v === true)} />
            {l}
          </label>
        ))}
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium">
        {conteggio} righe in anteprima
      </div>
    </aside>
  );
}
