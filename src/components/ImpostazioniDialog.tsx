/*
 * File:      ImpostazioniDialog.tsx
 * Percorso:  src/components/ImpostazioniDialog.tsx
 * Finestra impostazioni modulo lavoratore e archivio locale.
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

/** Bottone "Impostazioni" + finestra per gestire reparti, sottoreparti, categorie e archivio locale. */
export function ImpostazioniDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings className="size-4" /> Impostazioni
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Impostazioni generali del programma</DialogTitle>
            <DialogDescription>
              Configura i reparti, le materie, le categorie dei corsi e la cartella locale per l'archiviazione e la ricerca degli attestati.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="reparti">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="reparti">Reparti</TabsTrigger>
              <TabsTrigger value="insegnamento">Classi e materie</TabsTrigger>
              <TabsTrigger value="categorie">Categorie corsi</TabsTrigger>
              <TabsTrigger value="ruoli">Ruoli</TabsTrigger>
              <TabsTrigger value="archivio">Archivio locale</TabsTrigger>
            </TabsList>
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
