/*
 * File:      RiquadroSedi.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroSedi.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Sedi e plessi (stessa Ditta, stesso RSPP) in Impostazioni › Ditta.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHIAVE_SEDI, aggiungiSede, eliminaSede, getSedi } from "@/lib/api/sedi";
import { CHIAVE_ASSEGNAZIONI_RUOLI } from "@/lib/api/ruoli";

export function RiquadroSedi() {
  const qc = useQueryClient();
  const { data: sedi = [], isLoading } = useQuery({ queryKey: CHIAVE_SEDI, queryFn: getSedi });
  const [nome, setNome] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("");
  const [saving, setSaving] = useState(false);

  const aggiungi = async () => {
    if (!nome.trim()) {
      toast.error("Inserisci il nome del plesso o della sede secondaria");
      return;
    }
    setSaving(true);
    try {
      await aggiungiSede({ nome, indirizzo, cap, comune, provincia, ordine: sedi.length + 1 });
      setNome("");
      setIndirizzo("");
      setCap("");
      setComune("");
      setProvincia("");
      await qc.invalidateQueries({ queryKey: CHIAVE_SEDI });
      toast.success("Sede secondaria aggiunta");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
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
          {sedi.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
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
          ))}
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
        <Button type="button" onClick={aggiungi} disabled={saving} className="col-span-2 md:col-span-1">
          <Plus className="mr-1 size-4" /> Aggiungi plesso
        </Button>
      </div>
    </div>
  );
}
