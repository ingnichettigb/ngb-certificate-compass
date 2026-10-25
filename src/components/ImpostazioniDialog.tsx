/*
 * File:      ImpostazioniDialog.tsx
 * Percorso:  src/components/ImpostazioniDialog.tsx
 * Finestra unica "Impostazioni generali" del programma.
 * Revisioni:
 *   rev 2 — 25/10/2026 10:15 — Aggiunte schede Ditta e Corsi, titolo "Impostazioni generali".
 */
import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepartiTab } from "@/features/impostazioni/RepartiTab";
import { InsegnamentoTab } from "@/features/impostazioni/InsegnamentoTab";
import { CategorieTab } from "@/features/impostazioni/CategorieTab";
import { RuoliTab } from "@/features/impostazioni/RuoliTab";
import { ArchivioTab } from "@/features/impostazioni/ArchivioTab";
import { DatiAziendaDialog } from "@/components/DatiAziendaDialog";
import { TabellaTipiCorsoDialog } from "@/features/tipi-corso/TabellaTipiCorsoDialog";

/** Bottone "Impostazioni generali": raccoglie tutte le impostazioni del programma. */
export function ImpostazioniDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="size-4" /> Impostazioni generali
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Impostazioni generali del programma</DialogTitle>
            <DialogDescription>
              Dati ditta, corsi, reparti, materie, categorie, ruoli e cartella locale degli attestati.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="ditta">
            <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-7">
              <TabsTrigger value="ditta">Ditta</TabsTrigger>
              <TabsTrigger value="corsi">Corsi</TabsTrigger>
              <TabsTrigger value="reparti">Reparti</TabsTrigger>
              <TabsTrigger value="insegnamento">Materie</TabsTrigger>
              <TabsTrigger value="categorie">Categorie</TabsTrigger>
              <TabsTrigger value="ruoli">Ruoli</TabsTrigger>
              <TabsTrigger value="archivio">Archivio</TabsTrigger>
            </TabsList>
            <TabsContent value="ditta" className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Nome, email, indirizzo e mittente usati nelle email.</p>
              <DatiAziendaDialog />
            </TabsContent>
            <TabsContent value="corsi" className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">Codici, ore, validità ed esportazione Excel dei tipi di corso.</p>
              <TabellaTipiCorsoDialog />
            </TabsContent>
            <TabsContent value="reparti" className="mt-4">
              <RepartiTab />
            </TabsContent>
            <TabsContent value="insegnamento" className="mt-4">
              <InsegnamentoTab />
            </TabsContent>
            <TabsContent value="categorie" className="mt-4">
              <CategorieTab />
            </TabsContent>
            <TabsContent value="ruoli" className="mt-4">
              <RuoliTab />
            </TabsContent>
            <TabsContent value="archivio" className="mt-4">
              <ArchivioTab />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
