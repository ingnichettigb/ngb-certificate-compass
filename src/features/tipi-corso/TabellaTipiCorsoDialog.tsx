/*
 * File:      TabellaTipiCorsoDialog.tsx
 * Percorso:  src/features/tipi-corso/TabellaTipiCorsoDialog.tsx
 * Bottone «Tabella corsi» e finestra che contiene la tabella.
 */
import { useState } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TabellaTipiCorso } from "./TabellaTipiCorso";

/**
 * Bottone che apre la tabella completa dei tipi di corso: codice ufficiale,
 * ore, validità e corso di aggiornamento collegato. Ogni cella si modifica
 * sul posto, le righe si trascinano per cambiare ordine (o si spostano con
 * le frecce), si può cancellare o aggiungerne una nuova, e ogni corso ha un
 * interruttore per farlo vedere o no a chi carica gli attestati.
 */
export function TabellaTipiCorsoDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ListChecks className="size-4" /> Tabella corsi
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Tabella tipi di corso</DialogTitle>
            <DialogDescription>
              Codici ufficiali Stato-Regioni: ore, validità e corso di aggiornamento collegato.
              Trascina una riga dal simbolo a sinistra per cambiarne l'ordine, modifica una cella
              scrivendoci sopra, elimina con il cestino o aggiungine una in fondo.
            </DialogDescription>
          </DialogHeader>
          <TabellaTipiCorso />
        </DialogContent>
      </Dialog>
    </>
  );
}
