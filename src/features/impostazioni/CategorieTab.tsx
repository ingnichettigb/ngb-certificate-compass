/*
 * File:      CategorieTab.tsx
 * Percorso:  src/features/impostazioni/CategorieTab.tsx
 * Scheda Categorie corsi: quali categorie vede il lavoratore.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TabellaTipiCorsoDialog } from "@/features/tipi-corso/TabellaTipiCorsoDialog";
import { Switch } from "@/components/ui/switch";
import { getCategorieCorso, impostaCategoriaVisibile } from "@/lib/api";
import { ErroreTabelle } from "./ErroreTabelle";

export function CategorieTab() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const {
    data: categorie = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["categorie_corso"],
    queryFn: getCategorieCorso,
    retry: false,
  });

  async function cambia(nome: string, visibile: boolean) {
    setBusy(nome);
    try {
      await impostaCategoriaVisibile(nome, visibile);
      qc.invalidateQueries({ queryKey: ["categorie_corso"] });
      qc.invalidateQueries({ queryKey: ["categorie_nascoste"] });
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  if (error) return <ErroreTabelle messaggio={(error as Error).message} />;

  const visibili = categorie.filter((c) => c.visibile_lavoratore).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          Elenco di tutte le categorie di corso, uguale per tutti. Attiva quelle che il lavoratore
          può scegliere nel modulo: le altre restano comunque visibili in cruscotto risorse umane e nelle
          schede dei dipendenti.
        </p>
        <TabellaTipiCorsoDialog />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categorie.map((c) => (
              <li key={c.macro_categoria} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1">
                  <span
                    className={`font-medium ${c.visibile_lavoratore ? "" : "text-muted-foreground"}`}
                  >
                    {c.macro_categoria}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {c.corsi} {c.corsi === 1 ? "corso" : "corsi"}
                  </span>
                </span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  {c.visibile_lavoratore ? "Nel modulo" : "Nascosta"}
                  <Switch
                    checked={c.visibile_lavoratore}
                    disabled={busy === c.macro_categoria}
                    onCheckedChange={(v) => cambia(c.macro_categoria, v)}
                  />
                </label>
              </li>
            ))}
            {!categorie.length && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nessun corso in archivio.
              </li>
            )}
          </ul>
          {categorie.length > 0 && visibili === 0 && (
            <p className="text-xs text-destructive">
              Attenzione: con tutte le categorie nascoste il lavoratore non potrà scegliere nessun
              corso.
            </p>
          )}
        </>
      )}
    </div>
  );
}
