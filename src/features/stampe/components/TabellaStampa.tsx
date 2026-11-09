/*
 * File:      TabellaStampa.tsx
 * Percorso:  src/features/stampe/components/TabellaStampa.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Tabella righe attestati per i modelli di stampa.
 *   rev 2 — 03/11/2026 20:50 — Pulsante ✕ su ogni intestazione per togliere la colonna (non stampato).
 *   rev 3 — 04/11/2026 10:20 — Intestazione fissa sticky con sfondo opaco per scorrimento record.
 *   rev 4 — 05/11/2026 19:50 — Celle con dato anagrafico mancante in rosso grassetto (anche in stampa).
 *   rev 5 — 06/11/2026 — Clic sull'intestazione per ordinare A→Z / Z→A / nessuno (frecce non stampate).
 *   rev 6 — 06/11/2026 — Neretto (anche in stampa) per l'attestato presente senza il ruolo di sicurezza assegnato.
 *   rev 7 — 07/11/2026 — Larghezza delle colonne: si trascina il bordo dell'intestazione, doppio clic = adatta al contenuto più lungo.
 *                        Pulsante «+» in fondo all'intestazione per aggiungere/togliere colonne. Tutto facoltativo: senza le
 *                        nuove proprietà la tabella si comporta e si stampa come prima.
 */
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as PuntatoreReact } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, X } from "lucide-react";
import {
  attestatoSenzaRuolo, cella, cellaMancante, INTESTAZIONI, ordinaRighe,
  type Colonna, type GruppoColonne, type OrdineColonna, type RigaStampa,
} from "../dati-stampa";
import {
  creaMisura, dimensioniTabella, haLarghezzePersonalizzate, larghezzaAdattata, limitaLarghezza, LARGHEZZA_NUMERO,
} from "../larghezze-colonne";
import type { LarghezzeColonne } from "../preferenze-colonne";
import { SelettoreColonne } from "./SelettoreColonne";

type Props = {
  righe: RigaStampa[];
  colonne: Colonna[];
  onRimuoviColonna?: ((c: Colonna) => void) | undefined;
  /** Ordinamento attivo (se c'è) e gestore del clic sull'intestazione. */
  ordine?: OrdineColonna | null | undefined;
  onOrdina?: ((c: Colonna) => void) | undefined;
  /** Larghezze scelte dall'utente (px). Senza nessuna colonna ridimensionata la tabella resta a larghezza automatica. */
  larghezze?: LarghezzeColonne | undefined;
  /** Se presente compaiono le maniglie sul bordo delle intestazioni. */
  onLarghezze?: ((l: LarghezzeColonne) => void) | undefined;
  /** Righe di tutto il documento: la colonna si adatta al contenuto più lungo anche se sta in un'altra sezione. */
  righeMisura?: RigaStampa[] | undefined;
  /** Se presenti (con onAlternaColonna) compare il «+» in fondo all'intestazione. */
  gruppiColonne?: GruppoColonne[] | undefined;
  onAlternaColonna?: ((c: Colonna) => void) | undefined;
  /** Se presente compare la maniglia per trascinare una colonna in un'altra posizione: (colonna presa, colonna sopra cui è lasciata). */
  onSposta?: ((da: Colonna, a: Colonna) => void) | undefined;
  /** Frecce «sposta a sinistra / a destra» nel selettore colonne (utili dove il trascinamento è scomodo). */
  onSpostaDi?: ((c: Colonna, passo: -1 | 1) => void) | undefined;
};

const TIPO_TRASCINAMENTO = "application/x-colonna-stampa";

/** Stesse regole di neretto della cella disegnata sotto: servono a misurare il testo come verrà mostrato. */
function inGrassetto(r: RigaStampa, c: Colonna): boolean {
  return (c === "stato" && (r.stato === "scaduto" || r.stato === "in_scadenza" || r.stato === "manca")) || (c === "scadenza" && r.stato === "manca") || c === "mancano" || cellaMancante(r, c) || attestatoSenzaRuolo(r, c);
}

const variabili = (px: number, pct: number) => ({ "--w": `${px}px`, "--p": `${pct}%` }) as CSSProperties;

export function TabellaStampa({
  righe: righeIn, colonne, onRimuoviColonna, ordine = null, onOrdina, larghezze, onLarghezze, righeMisura, gruppiColonne, onAlternaColonna, onSposta, onSpostaDi,
}: Props) {
  const [sopra, setSopra] = useState<Colonna | null>(null);
  const righe = ordinaRighe(righeIn, ordine);
  const tabRef = useRef<HTMLTableElement>(null);
  const conSelettore = !!gruppiColonne && !!onAlternaColonna;
  const personalizzata = haLarghezzePersonalizzate(colonne, larghezze);
  const misuraSu = righeMisura ?? righeIn;

  const adattaColonna = (c: Colonna, misura = creaMisura(tabRef.current)) =>
    larghezzaAdattata(INTESTAZIONI[c], misuraSu.map((r) => ({ testo: cella(r, c), grassetto: inGrassetto(r, c) })), misura);

  // Larghezze fisse solo se qualcuna è stata scelta; le colonne senza larghezza propria si adattano al contenuto.
  const dim = useMemo(
    () => {
      if (!personalizzata) return null;
      const misura = creaMisura(tabRef.current);
      return dimensioniTabella(colonne, larghezze ?? {}, (c) => adattaColonna(c, misura));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personalizzata, colonne, larghezze, misuraSu],
  );

  /** Fotografia delle larghezze di adesso: passando alle larghezze fisse nessuna colonna deve spostarsi. */
  function larghezzeAttuali(): LarghezzeColonne {
    const base: LarghezzeColonne = { ...(larghezze ?? {}) };
    tabRef.current?.querySelectorAll<HTMLElement>("thead th[data-col]").forEach((th) => {
      const c = th.dataset["col"] as Colonna;
      if (base[c] == null) base[c] = limitaLarghezza(th.getBoundingClientRect().width);
    });
    return base;
  }

  function iniziaTrascinamento(e: PuntatoreReact<HTMLElement>, c: Colonna) {
    if (!onLarghezze) return;
    e.preventDefault();
    const base = larghezzeAttuali();
    const partenza = base[c] ?? limitaLarghezza(0);
    const x0 = e.clientX;
    const muovi = (ev: PointerEvent) => onLarghezze({ ...base, [c]: limitaLarghezza(partenza + ev.clientX - x0) });
    const fine = () => {
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", fine);
      window.removeEventListener("pointercancel", fine);
    };
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", fine);
    window.addEventListener("pointercancel", fine);
  }

  function adatta(c: Colonna) {
    if (!onLarghezze) return;
    onLarghezze({ ...larghezzeAttuali(), [c]: adattaColonna(c) });
  }

  return (
    <table
      ref={tabRef}
      className={`border-collapse text-[11px] ${dim ? "w-[var(--tw)] print:w-full" : "w-full"}`}
      style={dim ? ({ tableLayout: "fixed", "--tw": `${dim.totale + (conSelettore ? 32 : 0)}px` } as CSSProperties) : undefined}
    >
      {dim && (
        <colgroup>
          <col className="w-[var(--w)] print:w-[var(--p)]" style={variabili(LARGHEZZA_NUMERO, dim.percentuali.numero)} />
          {colonne.map((c, i) => (
            <col key={c} className="w-[var(--w)] print:w-[var(--p)]" style={variabili(dim.px[i]!, dim.percentuali.colonne[i]!)} />
          ))}
          {conSelettore && <col className="w-8 print:hidden" />}
        </colgroup>
      )}
      <thead className="table-header-group sticky top-0 z-10 bg-background print:static">
        <tr>
          <th className="sticky top-0 z-10 w-8 border border-foreground/60 bg-muted px-1.5 py-1 text-center font-semibold print:static">
            N°
          </th>
          {colonne.map((c) => (
            <th
              key={c}
              data-col={c}
              aria-sort={ordine?.colonna === c ? (ordine.direzione === "asc" ? "ascending" : "descending") : undefined}
              className={`sticky top-0 z-10 border border-foreground/60 bg-muted px-1.5 py-1 text-left font-semibold print:static ${sopra === c ? "ring-2 ring-inset ring-primary" : ""}`}
              {...(onSposta
                ? {
                    onDragOver: (e: React.DragEvent) => {
                      e.preventDefault();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                      if (sopra !== c) setSopra(c);
                    },
                    onDragLeave: () => setSopra((s) => (s === c ? null : s)),
                    onDrop: (e: React.DragEvent) => {
                      e.preventDefault();
                      const da = e.dataTransfer?.getData(TIPO_TRASCINAMENTO) as Colonna | undefined;
                      setSopra(null);
                      if (da && da !== c) onSposta(da, c);
                    },
                  }
                : {})}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-0.5">
                {onSposta && (
                  <span
                    draggable
                    role="button"
                    tabIndex={-1}
                    aria-label={`Sposta la colonna ${INTESTAZIONI[c]}`}
                    title="Trascina per spostare la colonna"
                    onDragStart={(e) => {
                      e.dataTransfer.setData(TIPO_TRASCINAMENTO, c);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setSopra(null)}
                    className="cursor-grab rounded p-0.5 opacity-50 hover:bg-primary/15 hover:opacity-100 active:cursor-grabbing print:hidden"
                  >
                    <GripVertical className="size-3" />
                  </span>
                )}
                {onOrdina ? (
                  <button
                    type="button"
                    onClick={() => onOrdina(c)}
                    title={
                      ordine?.colonna === c
                        ? ordine.direzione === "asc"
                          ? `Ordinata dalla A alla Z: clic per Z→A`
                          : `Ordinata dalla Z alla A: clic per togliere l'ordine`
                        : `Ordina «${INTESTAZIONI[c]}» dalla A alla Z`
                    }
                    className="flex items-center gap-1 text-left font-semibold hover:text-primary print:pointer-events-none"
                  >
                    <span>{INTESTAZIONI[c]}</span>
                    <span className="print:hidden">
                      {ordine?.colonna === c ? (
                        ordine.direzione === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </span>
                  </button>
                ) : (
                  <span>{INTESTAZIONI[c]}</span>
                )}
                </div>
                {onRimuoviColonna && colonne.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRimuoviColonna(c)}
                    title={`Togli la colonna «${INTESTAZIONI[c]}»`}
                    aria-label={`Togli colonna ${INTESTAZIONI[c]}`}
                    className="rounded p-0.5 opacity-60 hover:bg-destructive/20 hover:text-destructive hover:opacity-100 print:hidden"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              {onLarghezze && (
                <span
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Larghezza della colonna ${INTESTAZIONI[c]}`}
                  title="Trascina per cambiare la larghezza; doppio clic per adattarla al contenuto"
                  onPointerDown={(e) => iniziaTrascinamento(e, c)}
                  onDoubleClick={() => adatta(c)}
                  className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/40 print:hidden"
                />
              )}
            </th>
          ))}
          {conSelettore && (
            <th className="sticky top-0 z-10 w-8 border border-foreground/60 bg-muted p-0 text-center print:hidden">
              <SelettoreColonne gruppi={gruppiColonne!} visibili={colonne} onAlterna={onAlternaColonna!} onSpostaDi={onSpostaDi} />
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {righe.map((r, i) => (
          <tr key={r.id} className="odd:bg-muted/30" style={{ breakInside: "avoid" }}>
            <td className="border border-foreground/40 px-1.5 py-0.5 text-center font-mono">{i + 1}</td>
            {colonne.map((c) => (
              <td
                key={c}
                className={`border border-foreground/40 px-1.5 py-0.5 ${(c === "stato" && (r.stato === "scaduto" || r.stato === "manca")) || (c === "scadenza" && r.stato === "manca") ? "font-bold text-destructive" : ""} ${c === "stato" && r.stato === "in_scadenza" ? "font-semibold" : ""} ${c === "mancano" || cellaMancante(r, c) ? "font-bold text-destructive" : ""} ${attestatoSenzaRuolo(r, c) ? "font-bold" : ""}`}
              >
                {cella(r, c)}
              </td>
            ))}
            {conSelettore && <td aria-hidden="true" className="print:hidden" />}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
