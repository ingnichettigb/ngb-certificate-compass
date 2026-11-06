/*
 * File:      LineaCicloFormativo.tsx
 * Percorso:  src/features/scadenze/components/LineaCicloFormativo.tsx
 * Data creazione: 2026-11-06
 * Revisioni:
 * - Rev 1 (2026-11-06 14:00): Linea temporale per cicli. Disegna solo ciò che calcola il motore (cicli ed eventi),
 *   senza ricalcolare ore o scadenze.
 *
 * Colori per ciclo: verde = completato, arancione = da completare, rosso = scaduto,
 * nero = non ancora attivo, bordeaux = decaduto.
 */
import { useMemo } from "react";
import { formatData } from "@/lib/api";
import { aggiungiAnni, giorniTra } from "../calcolo-ciclo";
import type {
  CicloVisuale,
  EventoCiclo,
  MotivoIgnorato,
  RigaScadenzaDati,
  StatoCiclo,
} from "../types";

const COLORE_CICLO: Record<StatoCiclo, string> = {
  completato: "bg-emerald-500",
  da_completare: "bg-amber-500",
  scaduto: "bg-destructive",
  futuro: "bg-zinc-900 dark:bg-zinc-500",
  decaduto: "bg-rose-900",
};

const ETICHETTA_CICLO: Record<StatoCiclo, string> = {
  completato: "completato",
  da_completare: "da completare",
  scaduto: "scaduto",
  futuro: "non attivo",
  decaduto: "decaduto",
};

const MOTIVO_IGNORATO: Record<MotivoIgnorato, string> = {
  decaduto: "Non contato: successivo alla decadenza",
  in_eccesso: "Non contato: ciclo già coperto (ore in eccesso)",
  futuro: "Non contato: data futura",
  tardivo_non_ammesso: "Non contato: tardivo e sanatoria non ammessa",
};

/** Altezza (px) di un livello di etichette sopra la linea. */
const ALTEZZA_LIVELLO = 52;
/** Distanza minima (in % della larghezza) tra due etichette sullo stesso livello. */
const DISTANZA_MIN_PCT = 13;
const LIVELLI_MAX = 3;

/** Assegna un livello (0..2) a ciascun evento, in ordine di posizione, per evitare sovrapposizioni. */
function assegnaLivelli(posizioni: number[]): number[] {
  const ultimo = new Array<number>(LIVELLI_MAX).fill(-Infinity);
  return posizioni.map((p) => {
    let livello = ultimo.findIndex((u) => p - u >= DISTANZA_MIN_PCT);
    if (livello === -1) livello = ultimo.indexOf(Math.min(...ultimo));
    ultimo[livello] = p;
    return livello;
  });
}

function titoloEvento(ev: EventoCiclo): string {
  if (ev.tipo === "base") return "Corso Base";
  return ev.ore !== null && ev.ore > 0 ? `Agg. ${ev.ore}h` : "Agg.";
}

function suggerimentoEvento(ev: EventoCiclo): string {
  const ore = ev.ore !== null ? ` (${ev.ore}h)` : "";
  if (ev.tipo === "base") return `Corso Base · ${formatData(ev.data)}`;
  if (ev.tipo === "parziale") return `Aggiornamento parziale${ore} · ${formatData(ev.data)}`;
  if (ev.tipo === "completo")
    return `Aggiornamento che completa il monte ore${ore} · ${formatData(ev.data)}`;
  return `${ev.motivo ? MOTIVO_IGNORATO[ev.motivo] : "Non contato"}${ore} · ${formatData(ev.data)}`;
}

function PallinoEvento({ tipo }: { tipo: EventoCiclo["tipo"] }) {
  const base = "h-3 w-3 rounded-full";
  if (tipo === "parziale")
    return <span className={`${base} bg-amber-500 ring-2 ring-amber-500/30`} />;
  if (tipo === "ignorato")
    return <span className={`${base} border-2 border-muted-foreground/60 bg-background`} />;
  return <span className={`${base} bg-emerald-500 ring-2 ring-emerald-500/30`} />;
}

function EtichettaCiclo({ c }: { c: CicloVisuale }) {
  const mostraOre =
    c.attivo && (c.stato === "da_completare" || c.stato === "scaduto") && c.oreRichieste > 0;
  return (
    <>
      Ciclo {c.indice} ·{" "}
      {mostraOre ? `${c.oreAccumulate}/${c.oreRichieste} ore` : ETICHETTA_CICLO[c.stato]}
    </>
  );
}

export function LineaCicloFormativo({ riga }: { riga: RigaScadenzaDati }) {
  const { ciclo } = riga;

  const dati = useMemo(() => {
    const { cicli } = ciclo;
    if (cicli.length === 0 || !ciclo.dataAncora) return null;

    const inizio = cicli[0].inizio;
    const fine = cicli[cicli.length - 1].fine;
    const span = Math.max(1, giorniTra(inizio, fine));
    const pct = (data: string) => (giorniTra(inizio, data) / span) * 100;

    // Tacche annuali (senza testo), escluse quelle sui confini di ciclo.
    const N = ciclo.durataCicloAnni;
    const anniTotali = cicli.length * N;
    const tacche: number[] = [];
    for (let y = 1; y < anniTotali; y++) {
      if (y % N !== 0) tacche.push(pct(aggiungiAnni(ciclo.dataAncora, y)));
    }

    // Eventi dentro la finestra, con livello per evitare sovrapposizioni.
    const visibili = ciclo.eventi
      .filter((e) => e.data >= inizio && e.data <= fine)
      .map((e) => ({ ev: e, p: pct(e.data) }))
      .sort((a, b) => a.p - b.p);
    const livelli = assegnaLivelli(visibili.map((v) => v.p));
    const eventi = visibili.map((v, i) => ({ ...v, livello: livelli[i] }));
    const livelloMax = eventi.reduce((m, e) => Math.max(m, e.livello), 0);

    const oggi = ciclo.dataValutazione;
    const confini = [
      { p: 0, titolo: "Partenza", data: inizio },
      ...cicli.map((c) => ({ p: pct(c.fine), titolo: `Fine ciclo ${c.indice}`, data: c.fine })),
    ];

    return {
      inizio,
      fine,
      pct,
      tacche,
      eventi,
      altezzaSopra: 6 + livelloMax * ALTEZZA_LIVELLO + 54,
      oggi,
      pctOggi: oggi >= inizio && oggi <= fine ? pct(oggi) : null,
      confini,
    };
  }, [ciclo]);

  if (!dati) {
    return (
      <div className="py-2 text-xs italic text-muted-foreground">
        Nessuna linea temporale: il corso non ha scadenza o manca il corso base.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 text-xs">
      <div className="overflow-x-auto">
        <div className="min-w-[680px] px-14 pb-3 pt-3">
          <div className="mb-2 text-[11px] text-muted-foreground">
            Ciclo di {ciclo.durataCicloAnni} anni
            {ciclo.oreRichieste > 0
              ? ` · ${ciclo.oreRichieste} ore di aggiornamento per ciclo`
              : ""}
          </div>

          {/* 1. Eventi reali sopra la linea */}
          <div className="relative w-full" style={{ height: dati.altezzaSopra }}>
            {dati.eventi.map(({ ev, p, livello }) => (
              <div
                key={`${ev.id}-${ev.data}`}
                title={suggerimentoEvento(ev)}
                className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${p}%` }}
              >
                <div className="text-center leading-tight">
                  <div className="whitespace-nowrap text-[10px] font-medium text-foreground">
                    {titoloEvento(ev)}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                    {formatData(ev.data)}
                  </div>
                  <div
                    className={`h-3 whitespace-nowrap text-[9px] font-medium ${
                      ev.tipo === "parziale"
                        ? "text-amber-600 dark:text-amber-400"
                        : ev.tipo === "completo"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {ev.tipo === "parziale" && "parziale"}
                    {ev.tipo === "completo" && "completo"}
                    {ev.tipo === "ignorato" && "non contato"}
                  </div>
                </div>
                <PallinoEvento tipo={ev.tipo} />
                <div className="w-px bg-border" style={{ height: 6 + livello * ALTEZZA_LIVELLO }} />
              </div>
            ))}
          </div>

          {/* 2. Linea: un segmento per ciclo */}
          <div className="relative h-3 w-full">
            {ciclo.cicli.map((c, i) => {
              const sx = dati.pct(c.inizio);
              const dx = dati.pct(c.fine);
              const primo = i === 0;
              const ultimo = i === ciclo.cicli.length - 1;
              return (
                <div
                  key={c.indice}
                  title={`Ciclo ${c.indice}: ${formatData(c.inizio)} → ${formatData(c.fine)} · ${ETICHETTA_CICLO[c.stato]}`}
                  className={`absolute inset-y-0 ${COLORE_CICLO[c.stato]} ${primo ? "rounded-l-full" : ""} ${
                    ultimo ? "rounded-r-full" : "border-r-2 border-background"
                  }`}
                  style={{ left: `${sx}%`, width: `${dx - sx}%` }}
                />
              );
            })}
            {dati.tacche.map((p) => (
              <div
                key={p}
                className="absolute -top-1 h-5 w-px bg-foreground/25"
                style={{ left: `${p}%` }}
              />
            ))}
            {dati.pctOggi !== null && (
              <div
                className="absolute -bottom-1.5 -top-1.5 z-10 w-0.5 -translate-x-1/2 bg-foreground"
                style={{ left: `${dati.pctOggi}%` }}
              />
            )}
          </div>

          {/* 3. Etichette dei cicli */}
          <div className="relative mt-1.5 h-4 w-full">
            {ciclo.cicli.map((c) => (
              <div
                key={c.indice}
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground"
                style={{ left: `${(dati.pct(c.inizio) + dati.pct(c.fine)) / 2}%` }}
              >
                <EtichettaCiclo c={c} />
              </div>
            ))}
          </div>

          {/* 4. Indicatore Oggi */}
          <div className="relative h-5 w-full">
            {dati.pctOggi !== null && (
              <span
                title={`Oggi (${formatData(dati.oggi)})`}
                className="absolute top-0.5 -translate-x-1/2 rounded bg-foreground px-1 py-px text-[9px] font-bold text-background"
                style={{ left: `${dati.pctOggi}%` }}
              >
                Oggi
              </span>
            )}
          </div>

          {/* 5. Date di partenza e fine ciclo */}
          <div className="relative h-10 w-full text-[11px]">
            {dati.confini.map((b) => (
              <div
                key={b.titolo}
                className="absolute flex -translate-x-1/2 flex-col items-center leading-tight"
                style={{ left: `${b.p}%` }}
              >
                <span className="text-[8px] text-foreground/70">▲</span>
                <span className="whitespace-nowrap font-semibold text-foreground">{b.titolo}</span>
                <span className="whitespace-nowrap font-mono text-muted-foreground">
                  {formatData(b.data)}
                </span>
              </div>
            ))}
          </div>

          {/* Legenda */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
            {(["completato", "da_completare", "scaduto", "futuro", "decaduto"] as StatoCiclo[]).map(
              (s) => (
                <span key={s} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-3 rounded-sm ${COLORE_CICLO[s]}`} />
                  {ETICHETTA_CICLO[s]}
                </span>
              ),
            )}
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground/60" />
              non contato
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
