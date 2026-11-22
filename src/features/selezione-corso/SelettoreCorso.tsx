/*
 * File:           SelettoreCorso.tsx
 * Percorso:       src/features/selezione-corso/SelettoreCorso.tsx
 * Data creazione: 22/11/2026
 * Scopo:          elenco corsi in finestra a comparsa, con in alto i pulsanti delle categorie (una o più) che filtrano
 *                 l'elenco, una ricerca su codice e nome, l'ultimo corso scelto per primo, poi i corsi e a seguire
 *                 tutti gli aggiornamenti. Le categorie e i corsi abilitati vengono dal database (categorie-corso.ts).
 *                 Usato da: Postazione operatore, «Aggiungi attestato PDF», «Modifica attestato».
 * Revisioni:
 *   rev 1 — 22/11/2026 — Prima versione.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  categorieDisponibili,
  categorieValide,
  elencoCorsi,
  type CorsoSelezionabile,
  type LegamiCorsi,
} from "./categorie-corso";
import {
  leggiCategorie,
  leggiUltimoCorso,
  salvaCategorie,
  salvaUltimoCorso,
} from "./memoria-selezione";

export type VoceExtra = {
  /** Valore che il chiamante riceve quando la voce è scelta (es. «Altro»). */
  valore: string;
  /** Testo nell'elenco. */
  etichetta: string;
  /** Testo nel campo quando la voce è quella scelta (se manca, l'etichetta). */
  etichettaScelta?: string;
};

export function SelettoreCorso<T extends CorsoSelezionabile>({
  corsi,
  legami,
  valore,
  onScegli,
  valoreDi = (c) => c.id,
  segnaposto = "Seleziona corso...",
  id,
  caricamento = false,
  badge,
  extra,
  onScegliExtra,
}: {
  corsi: T[];
  legami?: LegamiCorsi | null;
  /** Valore attuale: l'id del corso, o quello che restituisce valoreDi. */
  valore: string;
  onScegli: (corso: T) => void;
  valoreDi?: (corso: T) => string;
  segnaposto?: string;
  id?: string;
  caricamento?: boolean;
  /** Etichetta colorata a destra di ogni corso (facoltativa). */
  badge?: (corso: T) => { testo: string; classe: string } | null;
  extra?: VoceExtra;
  onScegliExtra?: (valore: string) => void;
}) {
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");
  const [categorie, setCategorie] = useState<string[]>(() => leggiCategorie());
  const [ultimoId, setUltimoId] = useState<string | null>(() => leggiUltimoCorso());

  useEffect(() => {
    if (!aperto) setRicerca("");
  }, [aperto]);

  const disponibili = useMemo(() => categorieDisponibili(corsi, legami), [corsi, legami]);
  const attive = useMemo(() => categorieValide(categorie, disponibili), [categorie, disponibili]);
  const elenco = useMemo(
    () => elencoCorsi(corsi, { legami, categorie: attive, ricerca, ultimoId }),
    [corsi, legami, attive, ricerca, ultimoId],
  );
  const totale = disponibili.reduce((somma, c) => somma + c.corsi, 0);
  const visibili = [
    ...(elenco.ultimo ? [elenco.ultimo] : []),
    ...elenco.corsi,
    ...elenco.aggiornamenti,
  ];

  const scelto = corsi.find((c) => valoreDi(c) === valore);

  function cambiaCategorie(nuove: string[]) {
    setCategorie(nuove);
    salvaCategorie(nuove);
  }
  function alternaCategoria(chiave: string) {
    cambiaCategorie(
      attive.includes(chiave) ? attive.filter((k) => k !== chiave) : [...attive, chiave],
    );
  }
  function scegli(c: T) {
    salvaUltimoCorso(c.id);
    setUltimoId(c.id);
    onScegli(c);
    setAperto(false);
  }

  const voce = (c: T) => {
    const marca = badge?.(c);
    const attivo = valoreDi(c) === valore;
    return (
      <button
        key={c.id}
        type="button"
        role="option"
        aria-selected={attivo}
        onClick={() => scegli(c)}
        className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-950/40"
      >
        <span className="shrink-0 font-mono text-xs text-primary">{c.codice ?? "—"}</span>
        <span className="min-w-0 flex-1">{c.nome_corso}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          ({c.ore_minime_legge ?? "?"} ore)
        </span>
        {marca && (
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${marca.classe}`}>
            {marca.testo}
          </span>
        )}
        {attivo && <Check className="size-4 shrink-0 text-emerald-600" />}
      </button>
    );
  };

  const sezione = (titolo: string, voci: T[]): ReactNode =>
    voci.length > 0 && (
      <div key={titolo} role="group" aria-label={titolo}>
        <p className="px-2 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {titolo}
        </p>
        {voci.map(voce)}
      </div>
    );

  let testoCampo: ReactNode = <span className="text-muted-foreground">{segnaposto}</span>;
  if (scelto) {
    testoCampo = (
      <span className="flex min-w-0 items-center gap-2">
        {scelto.codice && (
          <span className="shrink-0 font-mono text-xs text-primary">{scelto.codice}</span>
        )}
        <span className="truncate">{scelto.nome_corso}</span>
      </span>
    );
  } else if (extra && valore === extra.valore) {
    testoCampo = (
      <span className="truncate font-medium">{extra.etichettaScelta ?? extra.etichetta}</span>
    );
  }

  return (
    <Popover open={aperto} onOpenChange={setAperto}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={aperto}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {testoCampo}
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,680px)] p-0">
        <div className="space-y-2 border-b p-2">
          <div role="group" aria-label="Categorie" className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="selezione"
              aria-pressed={attive.length === 0}
              onClick={() => cambiaCategorie([])}
            >
              Tutte ({totale})
            </Button>
            {disponibili.map((cat) => (
              <Button
                key={cat.chiave}
                type="button"
                size="sm"
                variant="selezione"
                aria-pressed={attive.includes(cat.chiave)}
                onClick={() => alternaCategoria(cat.chiave)}
              >
                {cat.nome} ({cat.corsi})
              </Button>
            ))}
          </div>
          <Input
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && visibili[0]) {
                e.preventDefault();
                scegli(visibili[0]);
              }
            }}
            placeholder="Cerca per codice o nome…"
            aria-label="Cerca corso"
            autoFocus
          />
        </div>
        {/* onWheel: dentro una finestra di dialogo la rotellina verrebbe bloccata sull'elenco a comparsa */}
        <div
          role="listbox"
          aria-label="Corsi"
          className="max-h-72 overflow-y-auto p-1"
          onWheel={(e) => e.stopPropagation()}
        >
          {caricamento ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Caricamento corsi…
            </div>
          ) : (
            <>
              {sezione("Ultimo scelto", elenco.ultimo ? [elenco.ultimo] : [])}
              {sezione("Corsi", elenco.corsi)}
              {sezione("Aggiornamenti", elenco.aggiornamenti)}
              {visibili.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">Nessun corso trovato.</p>
              )}
            </>
          )}
          {extra && !caricamento && (
            <button
              type="button"
              role="option"
              aria-selected={valore === extra.valore}
              onClick={() => {
                onScegliExtra?.(extra.valore);
                setAperto(false);
              }}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md border-t border-border px-2 py-2 text-left text-sm font-semibold hover:bg-accent"
            >
              {extra.etichetta}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
