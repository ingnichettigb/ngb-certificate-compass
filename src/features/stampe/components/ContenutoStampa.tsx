/*
 * File:      ContenutoStampa.tsx
 * Percorso:  src/features/stampe/components/ContenutoStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Corpo dei 5 modelli: registro, gruppi, scadenze, schede individuali, reparti.
 *   rev 2 — 03/11/2026 20:50 — Colonne decise dall'anteprima (rimovibili) e modello «Elenco lavoratori in servizio».
 */
import type { Dipendente } from "@/lib/api";
import type { DittaRecord } from "@/lib/api/ditta";
import { dataIt, raggruppa, type Colonna, type FiltriStampa, type RigaStampa } from "../dati-stampa";
import { Firme, IntestazioneDitta } from "./FoglioStampa";
import { TabellaStampa } from "./TabellaStampa";

type Props = {
  filtri: FiltriStampa;
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna: (c: Colonna) => void;
  dipendenti: Dipendente[];
  ditta: DittaRecord | undefined;
};

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1 border-b border-foreground/40 text-sm font-bold" style={{ breakAfter: "avoid" }}>{titolo}</h3>
      {children}
    </section>
  );
}

export function ContenutoStampa({ filtri, righe, colonne, onRimuoviColonna, dipendenti, ditta }: Props) {
  if (!righe.length) return <p className="py-10 text-center text-sm">Nessun dato con i filtri scelti.</p>;
  const tab = (rr: RigaStampa[], cols: Colonna[] = colonne) => (
    <TabellaStampa righe={rr} colonne={cols} onRimuoviColonna={onRimuoviColonna} />
  );

  switch (filtri.modello) {
    case "registro":
    case "lavoratori":
      return tab(righe);
    case "scadenze":
      return tab([...righe].sort((a, b) => (a.scadenza ?? "").localeCompare(b.scadenza ?? "")));
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
