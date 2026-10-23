/*
 * File:      TabellaRepartiDialog.tsx
 * Percorso:  src/components/TabellaRepartiDialog.tsx
 * Bottone che apre la tabella "reparti" in visione e modifica diretta: ogni cella si modifica sul
 * posto, si può inserire una riga nuova o cancellarne una. Pensato per chi vuole vedere/correggere
 * tutto insieme invece di passare dalla scheda a interruttori del tab "Reparti".
 * La tabella vera è in src/components/tabella-reparti/.
 */
import { useState } from "react";
import { Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TabellaReparti } from "./tabella-reparti/TabellaReparti";

export function TabellaRepartiDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Table2 className="size-4" /> Tabella reparti
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tabella reparti</DialogTitle>
            <DialogDescription>
              Visione e modifica diretta di tutti i reparti: cambia un campo e si salva da solo,
              elimina una riga con il cestino o aggiungine una nuova in fondo.
            </DialogDescription>
          </DialogHeader>
          <TabellaReparti />
        </DialogContent>
      </Dialog>
    </>
  );
}
