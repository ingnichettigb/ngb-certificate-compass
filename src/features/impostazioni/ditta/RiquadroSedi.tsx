/*
 * File:      RiquadroSedi.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroSedi.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Sedi e plessi (stessa Ditta, stesso RSPP) in Impostazioni › Ditta.
 *   rev 2 — 15/11/2026 — Massimo numero di presenti per ogni sede (obbligatorio, > 0), avviso sulla Sede Centrale e barra «Totale presenze».
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHIAVE_SEDI, aggiornaSede, aggiungiSede, eliminaSede, getSedi } from "@/lib/api/sedi";
import { CHIAVE_ASSEGNAZIONI_RUOLI } from "@/lib/api/ruoli";
import { riepilogaPresenze } from "@/features/ditta/presenze-sedi";

/** Dicitura unica richiesta per ogni sede e plesso. */
export const DICITURA_PERSONE_MAX =
  "Massimo numero di presenti nel plesso (tutti compresi i lavoratori, studenti, ospiti e utenza)";

export function RiquadroSedi() {
  const qc = useQueryClient();
  const { data: sedi = [], isLoading } = useQuery({ queryKey: CHIAVE_SEDI, queryFn: getSedi });
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("");
  const [personeMax, setPersoneMax] = useState("");
  const [bozze, setBozze] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const riepilogo = riepilogaPresenze(sedi);

  const aggiungi = async () => {
    if (!nome.trim()) {
      toast.error("Inserisci il nome del plesso o della sede secondaria");
      return;
    }
    const n = Number(personeMax);
    if (personeMax.trim() === "" || !Number.isInteger(n) || n <= 0) {
      toast.error("Indica il massimo numero di presenti nel plesso", {
        description: "Campo obbligatorio: intero maggiore di zero, tutti compresi (lavoratori, studenti, ospiti e utenza).",
      });
      return;
    }
    setSaving(true);
    try {
      await aggiungiSede({ nome, indirizzo, cap, comune, provincia, ordine: sedi.length + 1, persone_max: n });
      setNome("");
      setIndirizzo("");
      setCap("");
      setComune("");
      setProvincia("");
      setPersoneMax("");
      await qc.invalidateQueries({ queryKey: CHIAVE_SEDI });
      toast.success("Sede secondaria aggiunta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** Salva il massimo di presenti di una sede già esistente (all'uscita dal campo). */
  const salvaPersone = async (id: string, nomeSede: string, attuale: number | null) => {
    const testo = bozze[id];
    if (testo === undefined) return;
    const n = Number(testo);
    const scarta = () =>
      setBozze((b) => {
        const { [id]: _scartata, ...resto } = b;
        return resto;
      });
    if (testo.trim() === "" || !Number.isInteger(n) || n <= 0) {
      toast.error(`«${nomeSede}»: il massimo di presenti deve essere un intero maggiore di zero`);
      scarta();
      return;
    }
    if (n === attuale) {
      scarta();
      return;
    }
    try {
      await aggiornaSede(id, { persone_max: n });
      await qc.invalidateQueries({ queryKey: CHIAVE_SEDI });
      scarta();
      toast.success(`Presenze di «${nomeSede}» aggiornate`);
    } catch (e) {
      toast.error((e as Error).message);
      scarta();
    }
  };

  const elimina = async (id: string, nomeSede: string) => {
    if (!window.confirm(`Rimuovere la sede «${nomeSede}»?\nI lavoratori passano alla sede principale; gli incarichi assegnati a questa sede vengono tolti.`)) return;
    try {
      await eliminaSede(id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: CHIAVE_SEDI }),
        qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
        qc.invalidateQueries({ queryKey: ["dipendenti"] }),
      ]);
      toast.success(`Sede «${nomeSede}» rimossa`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // Questo riquadro sta dentro il modulo Ditta: Invio non deve salvare la Ditta
  const invio = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void aggiungi();
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building className="size-4 text-primary" /> Sedi e plessi (unità locali)
        </h3>
        <span className="text-xs text-muted-foreground">
          Stessa Ditta e stesso RSPP: la formazione è unica, le squadre di emergenza si organizzano per sede.
        </span>
      </div>

      {!isLoading && (
        <div className="divide-y rounded-md border">
          {sedi.map((s) => {
            const mancante = s.persone_max === null || s.persone_max === undefined;
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-[14rem] flex-1">
                  <span className="font-medium">{s.nome}</span>
                  {s.is_principale && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Sede principale</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {s.is_principale
                      ? "Indirizzo: quello dell'anagrafica Ditta. Tutti i lavoratori e gli incarichi sono qui, salvo diversa assegnazione."
                      : [s.indirizzo, [s.cap, s.comune].filter(Boolean).join(" "), s.provincia && `(${s.provincia})`].filter(Boolean).join(" — ") || "Indirizzo non indicato"}
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-1 md:w-80">
                  <Label htmlFor={`persone-${s.id}`} className="text-[11px] leading-tight">
                    {DICITURA_PERSONE_MAX}
                    <span className="text-destructive"> *</span>
                  </Label>
                  <Input
                    id={`persone-${s.id}`}
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Es. 450"
                    aria-invalid={mancante}
                    className={mancante ? "border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30" : ""}
                    value={bozze[s.id] ?? (s.persone_max ?? "")}
                    onChange={(e) => setBozze((b) => ({ ...b, [s.id]: e.target.value }))}
                    onBlur={() => void salvaPersone(s.id, s.nome, s.persone_max ?? null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                  />
                  {mancante && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {s.is_principale
                        ? "Compilazione obbligatoria per la Sede Centrale"
                        : "Da compilare: obbligatorio per ogni plesso"}
                    </p>
                  )}
                </div>
                {!s.is_principale && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => elimina(s.id, s.nome)}
                    title="Elimina sede"
                    aria-label={`Elimina sede ${s.nome}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && sedi.length > 0 && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            riepilogo.completo
              ? "border-primary/30 bg-primary/5"
              : "border-2 border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
          }`}
          data-testid="totale-presenze"
        >
          <strong>Totale presenze:</strong> Sede Centrale ({riepilogo.sedeCentrale ?? "—"}) + Plessi ({riepilogo.plessi}) ={" "}
          <strong>{riepilogo.totale}</strong>
          {riepilogo.completo ? (
            <span className="ml-2 text-xs text-muted-foreground">
              Questo totale diventa «Presenze contemporanee max» in Organico e Presenze.
            </span>
          ) : (
            <p className="mt-1 text-xs">
              Totale incompleto: mancano {riepilogo.mancanti.join(", ")}. Finché non sono tutte compilate «Presenze contemporanee max» resta il valore inserito a mano.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 items-end gap-2 pt-1 md:grid-cols-6">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="nuova-sede-nome">Nome sede / plesso</Label>
          <Input id="nuova-sede-nome" placeholder="Es. Succursale Via Roma" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={invio} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="nuova-sede-ind">Indirizzo</Label>
          <Input id="nuova-sede-ind" value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} onKeyDown={invio} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nuova-sede-cap">CAP</Label>
          <Input id="nuova-sede-cap" value={cap} onChange={(e) => setCap(e.target.value)} onKeyDown={invio} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nuova-sede-comune">Comune</Label>
          <Input id="nuova-sede-comune" value={comune} onChange={(e) => setComune(e.target.value)} onKeyDown={invio} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nuova-sede-prov">Prov.</Label>
          <Input id="nuova-sede-prov" maxLength={2} value={provincia} onChange={(e) => setProvincia(e.target.value)} onKeyDown={invio} />
        </div>
        <div className="col-span-2 space-y-1 md:col-span-4">
          <Label htmlFor="nuova-sede-persone" className="text-[11px] leading-tight">
            {DICITURA_PERSONE_MAX}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id="nuova-sede-persone"
            type="number"
            min={1}
            step={1}
            required
            placeholder="Persone max presenti (compresi lavoratori)"
            value={personeMax}
            onChange={(e) => setPersoneMax(e.target.value)}
            onKeyDown={invio}
          />
        </div>
        <Button type="button" onClick={aggiungi} disabled={saving} className="col-span-2">
          <Plus className="mr-1 size-4" /> Crea plesso
        </Button>
      </div>
    </div>
  );
}
