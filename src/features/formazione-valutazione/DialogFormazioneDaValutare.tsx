/*
 * File:          DialogFormazioneDaValutare.tsx
 * Percorso:      src/features/formazione-valutazione/DialogFormazioneDaValutare.tsx
 * Data creazione: 2026-11-21
 * Finestra «Formazione da valutare»: i lavoratori con una formazione specifica DIVERSA da quella attesa per il grado di rischio della
 * ditta. L'operatore decide se accettarla come equivalente, se serve un'integrazione o se non è valida (nota obbligatoria); le decisioni
 * prese si vedono nella scheda «Decise» e si possono annullare. Se la ditta cambia grado di rischio le decisioni decadono.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 5).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTipiCorso } from "@/lib/api/tipi-corso";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { RischioDitta } from "@/features/dipendenti/matrice/condizioni-regole";
import { RigaDaValutare } from "./RigaDaValutare";
import { useFormazioneDaValutare } from "./useFormazioneDaValutare";

export function DialogFormazioneDaValutare({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { elenco, rischioDitta } = useFormazioneDaValutare();
  const { data: corsi = [] } = useQuery({ queryKey: ["tipi_corso"], queryFn: getTipiCorso, enabled: open });
  const nomiCorsi = useMemo(() => new Map(corsi.map((c) => [normalizzaCodice(c.codice), c.nome_corso] as const)), [corsi]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formazione da valutare</DialogTitle>
          <DialogDescription>
            Lavoratori con una formazione specifica diversa da quella attesa per il grado di rischio della ditta. Una formazione diversa non si
            accetta da sola: decidi tu. Se la ditta cambia grado di rischio, le decisioni prese decadono e si rivalutano.
          </DialogDescription>
        </DialogHeader>

        {elenco.rischioNonImpostato ? (
          <p className="rounded-lg border border-border bg-muted p-3 text-sm">
            Il grado di rischio della ditta non è impostato: senza, non si può dire quale formazione specifica sia attesa. Impostalo nella scheda Ditta.
          </p>
        ) : (
          <Tabs defaultValue="da-valutare">
            <TabsList>
              <TabsTrigger value="da-valutare">Da valutare ({elenco.pendenti.length})</TabsTrigger>
              <TabsTrigger value="decise">Decise ({elenco.decise.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="da-valutare">
              {elenco.pendenti.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nessuna formazione da valutare.</p>
              ) : (
                <ul className="space-y-3">
                  {elenco.pendenti.map((v) => (
                    <RigaDaValutare key={v.attestato.id} voce={v} rischioDitta={rischioDitta as RischioDitta} nomiCorsi={nomiCorsi} />
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="decise">
              {elenco.decise.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nessuna decisione presa.</p>
              ) : (
                <ul className="space-y-3">
                  {elenco.decise.map((v) => (
                    <RigaDaValutare key={v.attestato.id} voce={v} rischioDitta={rischioDitta as RischioDitta} nomiCorsi={nomiCorsi} />
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
