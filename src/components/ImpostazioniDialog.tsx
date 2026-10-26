/*
 * File:      ImpostazioniDialog.tsx
 * Percorso:  src/components/ImpostazioniDialog.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Creazione iniziale modale impostazioni.
 *   rev 2 — 25/10/2026 10:15 — Aggiunte schede Ditta e Corsi.
 *   rev 3 — 26/10/2026 17:45 — Schermata a piena pagina con pulsante "Torna" e stile verde uniforme.
 */
import { useState } from "react";
import { Settings, ArrowLeft } from "lucide-react";
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

export function ImpostazioniDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-medium"
      >
        <Settings className="size-4 mr-1.5" /> Impostazioni generali
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed inset-0 z-50 max-w-none w-screen h-screen m-0 p-0 rounded-none border-0 flex flex-col bg-background sm:max-w-none">
          {/* Barra superiore con titolo e tasto Torna */}
          <div className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between gap-4">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Settings className="size-5 text-primary" />
                Impostazioni generali del programma
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Dati ditta, corsi, reparti, materie, categorie, ruoli e cartella locale degli attestati.
              </DialogDescription>
            </DialogHeader>

            <Button
              onClick={() => setOpen(false)}
              className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-semibold px-4"
            >
              <ArrowLeft className="size-4 mr-2" /> Torna
            </Button>
          </div>

          {/* Area centrale a tutta pagina con le 7 schede */}
          <div className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
            <Tabs defaultValue="ditta" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-7 mb-6">
                <TabsTrigger value="ditta">Ditta</TabsTrigger>
                <TabsTrigger value="corsi">Corsi</TabsTrigger>
                <TabsTrigger value="reparti">Reparti</TabsTrigger>
                <TabsTrigger value="insegnamento">Materie</TabsTrigger>
                <TabsTrigger value="categorie">Categorie</TabsTrigger>
                <TabsTrigger value="ruoli">Ruoli</TabsTrigger>
                <TabsTrigger value="archivio">Archivio</TabsTrigger>
              </TabsList>

              <TabsContent value="ditta" className="space-y-4">
                <p className="text-sm text-muted-foreground">Nome, email, indirizzo e mittente usati nelle comunicazioni.</p>
                <DatiAziendaDialog />
              </TabsContent>

              <TabsContent value="corsi" className="space-y-4">
                <p className="text-sm text-muted-foreground">Codici ufficiali, ore minime, validità ed esportazione Excel dei tipi di corso.</p>
                <TabellaTipiCorsoDialog />
              </TabsContent>

              <TabsContent value="reparti">
                <RepartiTab />
              </TabsContent>

              <TabsContent value="insegnamento">
                <InsegnamentoTab />
              </TabsContent>

              <TabsContent value="categorie">
                <CategorieTab />
              </TabsContent>

              <TabsContent value="ruoli">
                <RuoliTab />
              </TabsContent>

              <TabsContent value="archivio">
                <ArchivioTab />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
