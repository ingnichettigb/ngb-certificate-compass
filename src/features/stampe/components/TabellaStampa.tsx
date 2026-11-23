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
 *                        Pulsante «+» in fondo all'intestazione per aggiungere/togliere colonne. Tutto facoltativo.
 *   rev 8 — 09/11/2026 20:00 — Testo, colore e grassetto delle celle da righeCella (lo stesso del PDF); celle su due righe
 *                        (data + avviso) per l'Organigramma; colori e sfondi mantenuti anche in stampa dal browser.
 *   rev 9 — 23/11/2026 14:15 — Per righe secondarie dello stesso lavoratore, numero vuoto e colonne anagrafiche con «—».
 */
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as PuntatoreReact } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical, X } from "lucide-react";
import {
  cella, INTESTAZIONI, ordinaRighe, righeCella,
  type Colonna, type GruppoColonne, type OrdineColonna, type RigaStampa, type RigaVisuale,
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
  ordine?: OrdineColonna | null | undefined;
  onOrdina?: ((c: Colonna) => void) | undefined;
  larghezze?: LarghezzeColonne | undefined;
  onLarghezze?: ((l: LarghezzeColonne) => void) | undefined;
  righeMisura?: RigaStampa[] | undefined;
  gruppiColonne?: GruppoColonne[] | undefined;
  onAlternaColonna?: ((c: Colonna) => void) | undefined;
  onSposta?: ((da: Colonna, a: Colonna) => void) | undefined;
  onSpostaDi?: ((c: Colonna, passo: -1 | 1) => void) | undefined;
};

const TIPO_TRASCINAMENTO = "application/x-colonna-stampa";

const COLONNE_ANAGRAFICHE_DIPENDENTE: ReadonlySet<Colonna> = new Set([
  "lavoratore", "cf", "reparto", "mansione", "nascita", "luogoNascita", "dataNascita", "assunzione",
]);

function inGrassetto(r: RigaStampa, c: Colonna): boolean {
  return righeCella(r, c).some((v) => v.grassetto);
}

const variabili = (px: number, pct: number) => ({ "--w": `${px}px`, "--p": `${pct}%` }) as CSSProperties;

function classiTesto(t: RigaVisuale): string {
  return [
    t.colore === "rosso" ? "text-destructive" : t.colore === "arancione" ? "text-orange-600 dark:text-orange-400" : "",
    t.grassetto ? "font-bold" : "",
  ].filter(Boolean).join(" ");
}

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

  const dim = useMemo(
    () => {
      if (!personalizzata) return null;
      const misura = creaMisura(tabRef.current);
      return dimensioniTabella(colonne, larghezze ?? {}, (c) => adattaColonna(c, misura));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personalizzata, colonne, larghezze, misuraSu],
  );

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
    const base = larghezzeAttuali();
    onLarghezze({ ...base, [c]: adattaColonna(c) });
  }

  const progressivoPerRiga = useMemo(() => {
    let prog = 0;
    return righe.map((r, i) => {
      const stessoDelPrecedente = i > 0 && righe[i - 1]?.dipendenteId === r.dipendenteId;
      if (!stessoDelPrecedente) prog += 1;
      return stessoDelPrecedente ? null : prog;
    });
  }, [righe]);

  return (
    <table
      ref={tabRef}
      className="w-full border-collapse border border-foreground/60 text-xs"
      style={dim ? { width: `${dim.totalePx}px`, maxWidth: `${dim.totalePx}px` } : undefined}
    >
      <colgroup>
        <col style={{ width: `${LARGHEZZA_NUMERO}px` }} />
        {colonne.map((c) => {
          const w = dim?.colonne[c];
          return (
            <col
              key={c}
              style={w ? variabili(w.px, w.pct) : undefined}
              className={w ? "w-[var(--w)] [max-width:var(--w)]" : undefined}
            />
          );
        })}
        {conSelettore && <col className="w-8 print:hidden" />}
      </colgroup>
      <thead>
        <tr>
          <th className="sticky top-0 z-10 w-9 border border-foreground/60 bg-muted px-1 py-1 text-center font-semibold print:static">
            N.
          </th>
          {colonne.map((c) => (
            <th
              key={c}
              data-col={c}
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
        {righe.map((r, i) => {
          const stessoLavoratore = i > 0 && righe[i - 1]?.dipendenteId === r.dipendenteId;
          const num = progressivoPerRiga[i];
          return (
            <tr key={r.id} className="odd:bg-muted/30" style={{ breakInside: "avoid" }}>
              <td className="border border-foreground/40 px-1.5 py-0.5 text-center font-mono text-muted-foreground/50">
                {num != null ? num : "—"}
              </td>
              {colonne.map((c) => {
                if (stessoLavoratore && COLONNE_ANAGRAFICHE_DIPENDENTE.has(c)) {
                  return (
                    <td key={c} className="border border-foreground/40 px-1.5 py-0.5 text-center text-muted-foreground/35">
                      —
                    </td>
                  );
                }
                const righeTesto = righeCella(r, c);
                const unica = righeTesto.length === 1 ? righeTesto[0]! : null;
                return (
                  <td
                    key={c}
                    className={`border border-foreground/40 px-1.5 py-0.5 ${unica ? classiTesto(unica) : ""}`}
                  >
                    {unica ? unica.testo : righeTesto.map((t, k) => <div key={k} className={classiTesto(t)}>{t.testo}</div>)}
                  </td>
                );
              })}
              {conSelettore && <td aria-hidden="true" className="print:hidden" />}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
