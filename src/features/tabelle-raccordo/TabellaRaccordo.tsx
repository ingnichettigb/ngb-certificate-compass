/*
 * File:      TabellaRaccordo.tsx
 * Percorso:  src/features/tabelle-raccordo/TabellaRaccordo.tsx
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Tabella generica delle tabelle di raccordo: intestazione fissa, barre di scorrimento sempre visibili,
 *            righe a colori alternati, aggiunta, modifica, duplicazione e cancellazione dei record, spunta manuale «Applica».
 *   rev 2 — 14/11/2026 21:50 — Bottoni standard (Cancella rosso) e colonne regolabili, spostabili e ordinabili (modulo comune).
 *   rev 3 — 15/11/2026 10:50 — Bottone «Esporta» (Excel o CSV) accanto a «Ripristina colonne»: colonne e ordinamento come a schermo.
 *   rev 4 — 15/11/2026 11:45 — Casella «Cerca nella tabella» (la riga selezionata vale solo se visibile; «Esporta» scarica sempre tutti i record)
 *            e, nella 06, evidenziazione delle divisioni ATECO dei codici della Ditta con l'etichetta «In uso Ditta».
 *   rev 5 — 21/11/2026 — Punto di verità ruoli-corsi (Fase 3): colonne «riferimento» con elenco di ruoli o corsi (si vede il nome, si salva il
 *            codice); codice scritto a mano in maiuscolo e non più modificabile; dopo ogni salvataggio si aggiornano anche le letture
 *            usate da Matrice e Scadenze; errori del database in italiano semplice.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { IntestazioneColonna } from "@/components/tabella-comune/IntestazioneColonna";
import { ordinaRighe, useColonneTabella } from "@/components/tabella-comune/useColonneTabella";
import { PulsanteEsporta } from "@/components/tabella-comune/PulsanteEsporta";
import { esportaTabella } from "@/components/tabella-comune/esporta-tabella";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import { divisioneAteco } from "@/features/ditta/regole-ditta";
import { leggiTutto, sb } from "@/lib/api/client";
import { CHIAVE_RUOLI, getRuoliSicurezza } from "@/lib/api/ruoli";
import { getTipiCorso } from "@/lib/api/tipi-corso";
import { ErroreTabelle } from "@/features/impostazioni/ErroreTabelle";
import type { Colonna, DefinizioneTabella, Riga } from "./definizioni";
import { tabellaRaccordoDaEsportare } from "./esporta-raccordo";
import { codiceValido, messaggioErrore } from "./messaggi-raccordo";
import {
  etichettaRiferimento,
  opzioniCorsi,
  opzioniRuoli,
  type FonteRiferimento,
  type OpzioneRiferimento,
} from "./riferimenti";

const messaggio = messaggioErrore;

/** Valore del menu a tendina per «nessuno» (un elemento del menu non può avere valore vuoto). */
const NESSUNO = "__nessuno__";

type Opzioni = Record<FonteRiferimento, OpzioneRiferimento[]>;
const SENZA_OPZIONI: Opzioni = { ruoli: [], corsi: [] };

/** Testo mostrato in cella. */
function mostra(c: Colonna, v: unknown, opzioni: Opzioni = SENZA_OPZIONI): string {
  if (v === null || v === undefined || v === "") return "—";
  if (c.tipo === "riferimento" && c.riferimento)
    return etichettaRiferimento(opzioni[c.riferimento], v) || "—";
  if (c.tipo === "bool") return v ? "sì" : "no";
  if (c.tipo === "numero") return Number(v).toLocaleString("it-IT");
  return String(v);
}

/** Valori del modulo: tutto come testo, convertito al salvataggio. */
type Modulo = Record<string, string | boolean>;

function moduloDa(def: DefinizioneTabella, riga: Riga | null): Modulo {
  const m: Modulo = {};
  for (const c of def.colonne) {
    const v = riga ? riga[c.chiave] : def.predefiniti?.[c.chiave];
    m[c.chiave] = c.tipo === "bool" ? Boolean(v) : v === null || v === undefined ? "" : String(v);
  }
  return m;
}

/** Colonne che in modifica non si cambiano più (es. il codice di un ruolo che ce l'ha già). */
function bloccate(def: DefinizioneTabella, riga: Riga | null): Set<string> {
  const out = new Set<string>();
  if (!riga) return out;
  for (const c of def.colonne) {
    const v = riga[c.chiave];
    if (c.soloLetturaInModifica && v !== null && v !== undefined && String(v).trim() !== "") out.add(c.chiave);
  }
  return out;
}

function valoriDa(
  def: DefinizioneTabella,
  m: Modulo,
  fisse: Set<string> = new Set(),
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of def.colonne) {
    if (c.soloLettura || fisse.has(c.chiave)) continue;
    const v = m[c.chiave];
    if (c.tipo === "bool") out[c.chiave] = Boolean(v);
    else if (c.tipo === "numero")
      out[c.chiave] = String(v).trim() === "" ? null : Number(String(v).replace(",", "."));
    else if (c.codice) out[c.chiave] = String(v).trim() === "" ? null : (codiceValido(String(v)) ?? String(v).trim());
    else out[c.chiave] = String(v).trim() === "" ? null : String(v).trim();
  }
  return out;
}

export function TabellaRaccordo({ def }: { def: DefinizioneTabella }) {
  const qc = useQueryClient();
  const tabella = def.tabella as string;
  const chiave = ["raccordo", def.id] as const;
  const [modifica, setModifica] = useState<{ riga: Riga | null } | null>(null);
  const [modulo, setModulo] = useState<Modulo>({});
  const [salvataggio, setSalvataggio] = useState(false);
  const [daCancellare, setDaCancellare] = useState<Riga | null>(null);
  const [selezionata, setSelezionata] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState("");
  const colonne = useColonneTabella(
    `raccordo:${def.id}`,
    def.colonne.map((c) => c.chiave),
  );

  const {
    data: righe = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: chiave,
    retry: false,
    queryFn: () =>
      leggiTutto<Riga>(() => {
        let q = sb.from(tabella).select("*");
        for (const [k, v] of Object.entries(def.filtro ?? {})) q = q.eq(k, v);
        q = q.order("ordine", { ascending: true });
        for (const k of def.ordinaPer ?? []) q = q.order(k, { ascending: true });
        return q.order("id", { ascending: true });
      }),
  });

  // Colonne «riferimento»: gli elenchi di ruoli e corsi si leggono solo se la tabella li usa (cache condivisa con il resto del programma)
  const usaRuoli = def.colonne.some((c) => c.riferimento === "ruoli");
  const usaCorsi = def.colonne.some((c) => c.riferimento === "corsi");
  const { data: ruoliCatalogo = [] } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
    enabled: usaRuoli,
  });
  const { data: corsiCatalogo = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
    enabled: usaCorsi,
  });
  const opzioni = useMemo<Opzioni>(
    () => ({ ruoli: opzioniRuoli(ruoliCatalogo), corsi: opzioniCorsi(corsiCatalogo) }),
    [ruoliCatalogo, corsiCatalogo],
  );

  // Nella 06: divisioni ATECO dei codici della Ditta, per evidenziare le righe in uso («85.31.20» → riga «85»).
  const ePerAteco = def.id === "ateco";
  const { data: ditta } = useQuery({
    queryKey: CHIAVE_DITTA,
    queryFn: getDitta,
    enabled: ePerAteco,
  });
  const divisioniDitta = useMemo(
    () =>
      new Set(
        (ditta?.codici_ateco ?? [])
          .map((c) => divisioneAteco(c.codice))
          .filter((d): d is string => !!d),
      ),
    [ditta?.codici_ateco],
  );

  // Ricerca nel testo mostrato in cella. Gli hook stanno prima del ritorno anticipato in caso di errore.
  const righeFiltrate = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return righe;
    return righe.filter((r) =>
      def.colonne.some((c) => {
        const v = r[c.chiave];
        return v !== null && v !== undefined && v !== "" && mostra(c, v, opzioni).toLowerCase().includes(q);
      }),
    );
  }, [righe, ricerca, def.colonne, opzioni]);

  /** Aggiorna questa tabella e le letture che altre schermate (Matrice, Scadenze, scheda lavoratore) ricavano dagli stessi dati. */
  const ricarica = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: chiave }),
      ...(def.chiaviCollegate ?? []).map((k) => qc.invalidateQueries({ queryKey: [...k] })),
    ]);
  };
  const prossimoOrdine = () => righe.reduce((m, r) => Math.max(m, Number(r["ordine"] ?? 0)), 0) + 1;

  function apriModulo(riga: Riga | null) {
    setModulo(moduloDa(def, riga));
    setModifica({ riga });
  }

  async function salva() {
    if (!modifica) return;
    for (const c of def.colonne) {
      if (c.obbligatorio && c.tipo !== "bool" && String(modulo[c.chiave] ?? "").trim() === "") {
        toast.error(`Compila «${c.etichetta}»`);
        return;
      }
    }
    const fisse = bloccate(def, modifica.riga);
    for (const c of def.colonne) {
      const testo = String(modulo[c.chiave] ?? "").trim();
      if (c.codice && !fisse.has(c.chiave) && testo !== "" && codiceValido(testo) === null) {
        toast.error(`«${c.etichetta}» non valido`, {
          description: "Usa solo lettere, numeri e il trattino basso (es. ADD_DAE), senza spazi né accenti.",
        });
        return;
      }
    }
    setSalvataggio(true);
    try {
      const valori = valoriDa(def, modulo, fisse);
      if (modifica.riga) {
        const { error: e } = await sb.from(tabella).update(valori).eq("id", modifica.riga.id);
        if (e) throw e;
      } else {
        const { error: e } = await sb.from(tabella).insert({
          ...(def.predefiniti ?? {}),
          ...(def.filtro ?? {}),
          ...valori,
          ordine: prossimoOrdine(),
        });
        if (e) throw e;
      }
      await ricarica();
      setModifica(null);
      toast.success(modifica.riga ? "Record modificato" : "Record aggiunto");
    } catch (e) {
      toast.error("Salvataggio non riuscito", { description: messaggio(e) });
    } finally {
      setSalvataggio(false);
    }
  }

  async function duplica(riga: Riga) {
    try {
      const copia = def.alDuplicare ? def.alDuplicare(riga) : riga;
      const {
        id: _id,
        created_at: _c,
        updated_at: _u,
        n_assegnazioni: _n,
        ...resto
      } = copia as Record<string, unknown>;
      const { error: e } = await sb
        .from(tabella)
        .insert({ ...resto, applica: false, ordine: prossimoOrdine() });
      if (e) throw e;
      await ricarica();
      toast.success("Record duplicato");
    } catch (e) {
      toast.error("Duplicazione non riuscita", { description: messaggio(e) });
    }
  }

  async function conferma() {
    const riga = daCancellare;
    if (!riga) return;
    try {
      const blocco = def.controlloCancellazione ? await def.controlloCancellazione(riga) : null;
      if (blocco) {
        toast.error("Cancellazione non possibile", { description: blocco });
        return;
      }
      const { error: e } = await sb.from(tabella).delete().eq("id", riga.id);
      if (e) throw e;
      await ricarica();
      toast.success("Record cancellato");
    } catch (e) {
      toast.error("Cancellazione non riuscita", { description: messaggio(e) });
    } finally {
      setDaCancellare(null);
    }
  }

  /** Colonne bloccate nel record che si sta modificando (es. il codice di un ruolo che ce l'ha già). */
  const fisseModulo = bloccate(def, modifica?.riga ?? null);

  /**
   * Elenco per una colonna «riferimento»: tutte le opzioni, più il valore attuale se non è più nell'elenco
   * (così il campo non resta vuoto); nei ruoli, «Richiede» non offre il ruolo stesso.
   */
  function elencoPerCampo(c: Colonna): OpzioneRiferimento[] {
    if (!c.riferimento) return [];
    const proprio = def.id === "ruoli" && c.chiave === "richiede" ? String(modifica?.riga?.["codice"] ?? "") : "";
    const base = opzioni[c.riferimento].filter((o) => !proprio || o.valore !== proprio);
    const attuale = String(modulo[c.chiave] ?? "");
    return attuale && !base.some((o) => o.valore === attuale) ? [{ valore: attuale, etichetta: attuale }, ...base] : base;
  }

  /** Spunta «Applica» manuale; se la tabella ha un gruppo, nel gruppo ce n'è una sola. */
  async function cambiaSpunta(riga: Riga, valore: boolean) {
    try {
      if (valore && def.gruppoSpunta) {
        const altre = righe
          .filter(
            (r) =>
              r.id !== riga.id && r["applica"] && def.gruppoSpunta!.every((k) => r[k] === riga[k]),
          )
          .map((r) => r.id);
        if (altre.length) {
          const { error: e } = await sb.from(tabella).update({ applica: false }).in("id", altre);
          if (e) throw e;
        }
      }
      const { error: e } = await sb.from(tabella).update({ applica: valore }).eq("id", riga.id);
      if (e) throw e;
      await ricarica();
    } catch (e) {
      toast.error("Spunta non salvata", { description: messaggio(e) });
    }
  }

  if (error) return <ErroreTabelle messaggio={messaggio(error)} />;

  const visibili = colonne.ordine
    .map((k) => def.colonne.find((c) => c.chiave === k))
    .filter((c): c is Colonna => Boolean(c));
  const mostrate = ordinaRighe(righeFiltrate, colonne.ordinamento);
  // Modifica, Duplica e Cancellazione valgono solo per una riga visibile: con la ricerca attiva non si agisce su righe nascoste.
  const selezionataRiga = mostrate.find((r) => r.id === selezionata) ?? null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{def.descrizione}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => apriModulo(null)}>
          <Plus /> Aggiungi
        </Button>
        <Button
          type="button"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && apriModulo(selezionataRiga)}
        >
          <Pencil /> Modifica
        </Button>
        <Button
          type="button"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && duplica(selezionataRiga)}
        >
          <Copy /> Duplica
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!selezionataRiga}
          onClick={() => selezionataRiga && setDaCancellare(selezionataRiga)}
        >
          <Trash2 /> Cancella
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={colonne.ripristina}>
          Ripristina colonne
        </Button>
        <PulsanteEsporta
          disabled={isLoading}
          onEsporta={(formato) =>
            esportaTabella(
              tabellaRaccordoDaEsportare(def, visibili, ordinaRighe(righe, colonne.ordinamento)),
              formato,
            )
          }
        />
        <div className="relative w-44 sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Cerca nella tabella"
            placeholder="Cerca nella tabella…"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        {def.documento && (
          <Button
            type="button"
            variant="outline"
            className="ml-auto"
            onClick={() => window.open(def.documento!.url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink /> {def.documento.etichetta}
          </Button>
        )}
        <span className={`text-xs text-muted-foreground ${def.documento ? "" : "ml-auto"}`}>
          {ricerca.trim() ? `${mostrate.length} di ${righe.length}` : righe.length} record ·
          seleziona una riga per modificarla, duplicarla o cancellarla
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <div className="scroll-visibile h-[calc(100vh-22rem)] min-h-[16rem] rounded-lg border border-border bg-surface">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-14 border-b border-border bg-muted px-3 py-2 text-center font-semibold">
                  N
                </th>
                {visibili.map((c) => (
                  <IntestazioneColonna
                    key={c.chiave}
                    chiave={c.chiave}
                    etichetta={c.etichetta}
                    colonne={colonne}
                    className={colonne.larghezze[c.chiave] ? "" : (c.larghezza ?? "")}
                  />
                ))}
                <th className="sticky top-0 z-10 w-24 border-b border-border bg-muted px-3 py-2 text-center font-semibold">
                  Applica
                </th>
              </tr>
            </thead>
            <tbody>
              {mostrate.map((r, i) => {
                const inUsoDitta =
                  ePerAteco && divisioniDitta.has(String(r["codice"] ?? "").trim());
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelezionata(r.id)}
                    className={`cursor-pointer ${
                      r.id === selezionata
                        ? "bg-primary/20"
                        : inUsoDitta
                          ? "bg-teal-100 dark:bg-teal-950/50"
                          : i % 2 === 0
                            ? "bg-surface"
                            : "bg-emerald-50 dark:bg-emerald-950/30"
                    } hover:bg-primary/10`}
                  >
                    <td
                      className={`px-3 py-1.5 text-center tabular-nums text-muted-foreground ${
                        inUsoDitta ? "border-l-4 border-l-primary" : ""
                      }`}
                    >
                      {i + 1}
                    </td>
                    {visibili.map((c) => (
                      <td key={c.chiave} className="overflow-hidden px-3 py-1.5 align-top">
                        {mostra(c, r[c.chiave], opzioni)}
                        {inUsoDitta && c.chiave === "codice" && (
                          <span className="ml-2 rounded border border-primary/40 bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                            In uso Ditta
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={Boolean(r["applica"])}
                        onCheckedChange={(v) => cambiaSpunta(r, v === true)}
                        aria-label={`Applica la riga ${i + 1}`}
                      />
                    </td>
                  </tr>
                );
              })}
              {mostrate.length === 0 && (
                <tr>
                  <td
                    colSpan={def.colonne.length + 2}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {righe.length === 0
                      ? "Nessun record. Usa «Aggiungi» per inserirne uno."
                      : `Nessun record corrisponde a «${ricerca.trim()}».`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={modifica !== null}
        onOpenChange={(o) => !o && !salvataggio && setModifica(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {modifica?.riga ? "Modifica record" : "Nuovo record"} · {def.numero} – {def.titolo}
            </DialogTitle>
            <DialogDescription>I campi con asterisco sono obbligatori.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {def.colonne.map((c) => (
              <div key={c.chiave} className="grid gap-1">
                {c.tipo === "bool" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(modulo[c.chiave])}
                      onCheckedChange={(v) => setModulo((m) => ({ ...m, [c.chiave]: v === true }))}
                    />
                    {c.etichetta}
                  </label>
                ) : (
                  <>
                    <Label htmlFor={`raccordo-${c.chiave}`}>
                      {c.etichetta}
                      {c.obbligatorio ? " *" : ""}
                    </Label>
                    {c.tipo === "scelta" ? (
                      <Select
                        value={String(modulo[c.chiave] ?? "")}
                        onValueChange={(v) => setModulo((m) => ({ ...m, [c.chiave]: v }))}
                      >
                        <SelectTrigger id={`raccordo-${c.chiave}`}>
                          <SelectValue placeholder="Scegli…" />
                        </SelectTrigger>
                        <SelectContent>
                          {(c.opzioni ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : c.tipo === "riferimento" && c.riferimento ? (
                      <Select
                        value={String(modulo[c.chiave] ?? "") || (c.obbligatorio ? "" : NESSUNO)}
                        onValueChange={(v) =>
                          setModulo((m) => ({ ...m, [c.chiave]: v === NESSUNO ? "" : v }))
                        }
                      >
                        <SelectTrigger id={`raccordo-${c.chiave}`}>
                          <SelectValue placeholder="Scegli…" />
                        </SelectTrigger>
                        <SelectContent>
                          {!c.obbligatorio && <SelectItem value={NESSUNO}>(nessuno)</SelectItem>}
                          {elencoPerCampo(c).map((o) => (
                            <SelectItem key={o.valore} value={o.valore}>
                              {o.etichetta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <>
                        <Input
                          id={`raccordo-${c.chiave}`}
                          inputMode={c.tipo === "numero" ? "decimal" : undefined}
                          value={String(modulo[c.chiave] ?? "")}
                          disabled={fisseModulo.has(c.chiave)}
                          onChange={(e) => setModulo((m) => ({ ...m, [c.chiave]: e.target.value }))}
                        />
                        {fisseModulo.has(c.chiave) && (
                          <p className="text-xs text-muted-foreground">
                            Non si può più cambiare: è la chiave stabile usata dalle regole.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={salvataggio}
              onClick={() => setModifica(null)}
            >
              Annulla
            </Button>
            <Button type="button" disabled={salvataggio} onClick={salva}>
              {salvataggio ? "Salvataggio…" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={daCancellare !== null} onOpenChange={(o) => !o && setDaCancellare(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare il record?</AlertDialogTitle>
            <AlertDialogDescription>L'operazione non si può annullare.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={conferma}
            >
              Cancella
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
