/*
 * File:      FoglioStampa.tsx
 * Percorso:  src/features/stampe/components/FoglioStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Foglio A4 con intestazione ditta, regole di pagina e firme.
 */
import type { ReactNode } from "react";
import type { DittaRecord } from "@/lib/api/ditta";

type Props = {
  titolo: string;
  sottotitolo?: string | undefined;
  orizzontale: boolean;
  ditta: DittaRecord | undefined;
  mostraFirme: boolean;
  children: ReactNode;
};

export function IntestazioneDitta({ ditta, titolo, sottotitolo }: { ditta: DittaRecord | undefined; titolo: string; sottotitolo?: string | undefined }) {
  const ind = [ditta?.indirizzo, [ditta?.cap, ditta?.comune].filter(Boolean).join(" "), ditta?.provincia && `(${ditta.provincia})`].filter(Boolean).join(" ");
  return (
    <header className="mb-4 border-b-2 border-foreground pb-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-bold">{ditta?.ragione_sociale || "Nichetti Gian Battista"}</p>
          <p className="text-[11px]">{ind || "Soresina (CR)"}</p>
          {ditta?.partita_iva && <p className="text-[11px]">P.IVA {ditta.partita_iva}</p>}
        </div>
        <div className="text-right text-[11px]">
          <p>Formazione D.Lgs. 81/2008 – Accordo Stato-Regioni</p>
          <p>Stampato il {new Date().toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</p>
        </div>
      </div>
      <h2 className="mt-2 text-lg font-bold uppercase">{titolo}</h2>
      {sottotitolo && <p className="text-xs">{sottotitolo}</p>}
    </header>
  );
}

export function Firme({ ditta, lavoratore }: { ditta: DittaRecord | undefined; lavoratore?: boolean }) {
  const caselle = lavoratore
    ? ["Il lavoratore (per presa visione)", `Il Datore di Lavoro${ditta?.datore_di_lavoro ? ` – ${ditta.datore_di_lavoro}` : ""}`]
    : [`Il Datore di Lavoro${ditta?.datore_di_lavoro ? ` – ${ditta.datore_di_lavoro}` : ""}`, `RSPP${ditta?.rspp ? ` – ${ditta.rspp}` : ""}`];
  return (
    <div className="mt-8 grid grid-cols-2 gap-10 text-xs" style={{ breakInside: "avoid" }}>
      {caselle.map((c) => (
        <div key={c}>
          <p>{c}</p>
          <div className="mt-10 border-b border-foreground" />
        </div>
      ))}
    </div>
  );
}

export function FoglioStampa({ titolo, sottotitolo, orizzontale, ditta, mostraFirme, children }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-border bg-muted/40 p-4 print:overflow-visible print:border-0 print:bg-transparent print:p-0">
      <style>{`@media print { @page { size: A4 ${orizzontale ? "landscape" : "portrait"}; margin: 12mm; } }`}</style>
      <div
        className="foglio-stampa mx-auto bg-background p-8 text-foreground shadow-md print:w-auto print:p-0 print:shadow-none"
        style={{ width: orizzontale ? "297mm" : "210mm", minHeight: orizzontale ? "210mm" : "297mm" }}
      >
        <IntestazioneDitta ditta={ditta} titolo={titolo} sottotitolo={sottotitolo} />
        {children}
        {mostraFirme && <Firme ditta={ditta} />}
      </div>
    </div>
  );
}
