/*
 * File:      TabellaReparti.tsx
 * Percorso:  src/components/tabella-reparti/TabellaReparti.tsx
 * Tabella dei reparti in modifica diretta (contenuto della finestra "Tabella reparti").
 */
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RigaNuovoReparto } from "./RigaNuovoReparto";
import { RigaRepartoModificabile } from "./RigaRepartoModificabile";
import { useTabellaReparti } from "./useTabellaReparti";

export function TabellaReparti() {
  const t = useTabellaReparti();

  if (t.error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-medium">Impossibile leggere la tabella</p>
        <p className="mt-1 text-xs">{(t.error as Error).message}</p>
      </div>
    );
  }

  if (t.isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Caricamento…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Nome</TableHead>
              <TableHead className="w-20">Ordine</TableHead>
              <TableHead className="w-28 text-center">Nel modulo</TableHead>
              <TableHead className="w-36 text-center">Classe/materia</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.reparti.map((r) => (
              <RigaRepartoModificabile
                key={r.id}
                reparto={r}
                occupato={t.busy === r.id}
                onSalva={(campo, valore) => t.salvaCampo(r, campo, valore)}
                onRimuovi={() => t.rimuovi(r)}
              />
            ))}
            {!t.reparti.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Nessun reparto in tabella.
                </TableCell>
              </TableRow>
            )}

            <RigaNuovoReparto
              nome={t.nuova.nome}
              ordine={t.nuova.ordine}
              onNome={(v) => t.setNuova((n) => ({ ...n, nome: v }))}
              onOrdine={(v) => t.setNuova((n) => ({ ...n, ordine: v }))}
              onInserisci={t.inserisci}
              occupato={t.busy === "nuova"}
            />
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        "Nel modulo" nasconde/mostra il reparto al lavoratore. "Classe/materia" chiede classe di
        concorso e materia a chi sceglie questo reparto (di solito solo Docente).
      </p>
    </div>
  );
}
