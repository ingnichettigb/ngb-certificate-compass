/*
 * File:      ContenutoStampa.tsx
 * Percorso:  src/features/stampe/components/ContenutoStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Corpo dei 5 modelli: registro, gruppi, scadenze, schede individuali, reparti.
 *   rev 2 — 03/11/2026 20:50 — Colonne decise dall'anteprima (rimovibili) e modello «Elenco lavoratori in servizio».
 *   rev 3 — 05/11/2026 19:50 — Messaggio di elenco vuoto personalizzato e legenda (Sì/Scaduto/No, MANCA) sotto l'elenco lavoratori.
 *   rev 4 — 06/11/2026 — Ordinamento per colonna: vale dentro ogni sezione; con un ordine scelto lo scadenzario non si riordina da solo.
 *   rev 6 — 07/11/2026 — Totale delle righe (e dei lavoratori) in fondo al documento, anche in stampa.
 *   rev 5 — 06/11/2026 — Legenda di «NA», «No» e neretto per le colonne legate al ruolo (Preposto, Antincendio, Primo soccorso, Defibrillatore).
 *   rev 8 — 07/11/2026 — Passa alla tabella larghezze delle colonne e «+» delle colonne aggiungibili (proprietà facoltative).
 */
import type { Dipendente } from "@/lib/api";
import type { DittaRecord } from "@/lib/api/ditta";
import { dataIt, raggruppa, testoTotale, type Colonna, type FiltriStampa, type GruppoColonne, type OrdineColonna, type RigaStampa } from "../dati-stampa";
import type { LarghezzeColonne } from "../preferenze-colonne";
import { Firme, IntestazioneDitta } from "./FoglioStampa";
import { TabellaStampa } from "./TabellaStampa";

type Props = {
  filtri: FiltriStampa;
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna: (c: Colonna) => void;
  /** Ordinamento scelto dall'utente sulle intestazioni (null = ordine predefinito del documento). */
  ordine?: OrdineColonna | null;
  onOrdina?: (c: Colonna) => void;
  dipendenti: Dipendente[];
  ditta: DittaRecord | undefined;
  /** Spiegazione mostrata quando non ci sono righe (se dipende dalle selezioni attive). */
  messaggioVuoto?: string | undefined;
  /** Larghezze delle colonne scelte dall'utente e relativo gestore (maniglie sul bordo delle intestazioni). */
  larghezze?: LarghezzeColonne | undefined;
  onLarghezze?: ((l: LarghezzeColonne) => void) | undefined;
  /** Colonne che si possono aggiungere o togliere dal «+» in fondo all'intestazione. */
  gruppiColonne?: GruppoColonne[] | undefined;
  onAlternaColonna?: ((c: Colonna) => void) | undefined;
};

const VOCI_CORSO: Colonna[] = ["corsoBase", "corsoSpecifico", "preposto", "antincendio", "primoSoccorso", "defibrillatore"];
const VOCI_RUOLO: Colonna[] = ["preposto", "antincendio", "primoSoccorso", "defibrillatore"];

function Legenda({ colonne }: { colonne: Colonna[] }) {
  const corsi = colonne.some((c) => VOCI_CORSO.includes(c));
  const conRuolo = colonne.some((c) => VOCI_RUOLO.includes(c));
  const manca = colonne.includes("mancano");
  if (!corsi && !manca) return null;
  return (
    <div className="mt-3 space-y-0.5 text-[10px]" style={{ breakInside: "avoid" }}>
      {corsi && <p><b>Legenda corsi:</b> «Sì – data» = data dell'ultimo corso approvato; «Scaduto – data» = corso da rifare; «No» = nessun attestato in archivio.</p>}
      {conRuolo && <p><b>Preposto, Antincendio, Primo soccorso, Defibrillatore:</b> «NA» = ruolo di sicurezza non assegnato al lavoratore; «No» = ruolo assegnato ma attestato mancante; <b>in neretto</b> = ha l'attestato ma non il ruolo assegnato.</p>}
      {manca && <p><b>Anagrafica:</b> «MANCA» in rosso = dato assente nell'anagrafica del lavoratore.</p>}
    </div>
  );
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1 border-b border-foreground/40 text-sm font-bold" style={{ breakAfter: "avoid" }}>{titolo}</h3>
      {children}
    </section>
  );
}

export function ContenutoStampa(props: Props) {
  return (
    <>
      <CorpoStampa {...props} />
      {props.righe.length > 0 && (
        <p className="mt-3 border-t border-foreground/40 pt-1 text-xs" style={{ breakInside: "avoid" }}>
          <b>Totale:</b> {testoTotale(props.filtri.modello, props.righe)}
        </p>
      )}
    </>
  );
}

function CorpoStampa({ filtri, righe, colonne, onRimuoviColonna, ordine = null, onOrdina, dipendenti, ditta, messaggioVuoto, larghezze, onLarghezze, gruppiColonne, onAlternaColonna }: Props) {
  if (!righe.length) return <p className="py-10 text-center text-sm">{messaggioVuoto ?? "Nessun dato con i filtri scelti."}</p>;
  const tab = (rr: RigaStampa[], cols: Colonna[] = colonne) => (
    <TabellaStampa
      righe={rr} colonne={cols} onRimuoviColonna={onRimuoviColonna} ordine={ordine} onOrdina={onOrdina}
      larghezze={larghezze} onLarghezze={onLarghezze} righeMisura={righe} gruppiColonne={gruppiColonne} onAlternaColonna={onAlternaColonna}
    />
  );

  switch (filtri.modello) {
    case "registro":
      return tab(righe);
    case "lavoratori":
      return (
        <>
          {tab(righe)}
          <Legenda colonne={colonne} />
        </>
      );
    case "scadenze":
      return tab(ordine ? righe : [...righe].sort((a, b) => (a.scadenza ?? "").localeCompare(b.scadenza ?? "")));
    case "gruppo":
      return (
        <>
          {raggruppa(righe, (r) => r.gruppoTitolo).map(([g, rr]) => (
            <Sezione key={g} titolo={`${g} – ${new Set(rr.map((r) => r.dipendenteId)).size} lavoratori`}>
              {tab(rr)}
            </Sezione>
          ))}
        </>
      );
    case "reparto":
      return (
        <>
          {raggruppa([...righe].sort((a, b) => a.reparto.localeCompare(b.reparto, "it")), (r) => r.reparto).map(([rep, rr]) => (
            <Sezione key={rep} titolo={`Reparto: ${rep}`}>
              {tab(rr)}
            </Sezione>
          ))}
        </>
      );
    case "scheda":
      return (
        <>
          {raggruppa(righe, (r) => r.dipendenteId).map(([id, rr], i) => {
            const d = dipendenti.find((x) => x.id === id);
            return (
              <div key={id} style={{ breakBefore: i > 0 ? "page" : "auto" }} className={i > 0 ? "mt-10 border-t-4 border-dashed border-border pt-6 print:mt-0 print:border-0 print:pt-0" : ""}>
                {i > 0 && <IntestazioneDitta ditta={ditta} titolo="Scheda formativa individuale" />}
                <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
                  <p><b>Lavoratore:</b> {rr[0]!.cognome} {rr[0]!.nome}</p>
                  <p><b>Codice fiscale:</b> {rr[0]!.cf}</p>
                  <p><b>Reparto:</b> {d?.reparto ?? "—"}{d?.sottoreparto ? ` – ${d.sottoreparto}` : ""}</p>
                  <p><b>Nato a:</b> {d?.luogo_nascita ?? "—"} il {dataIt(d?.data_nascita)}</p>
                  <p><b>Assunzione:</b> {dataIt(d?.data_assunzione)}</p>
                  <p><b>Stato:</b> {d?.stato_lavoratore === "cessato" ? `Cessato il ${dataIt(d.data_cessazione)}` : "In forza"}</p>
                </div>
                {tab(rr)}
                {filtri.mostraFirme && <Firme ditta={ditta} lavoratore />}
              </div>
            );
          })}
        </>
      );
  }
}
