/*
 * File:      DialogNuovaAi.tsx
 * Percorso:  src/features/ai/components/DialogNuovaAi.tsx
 * Finestra «Aggiungi nuova AI».
 */
import { ExternalLink, Eye, EyeOff, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMPLATE_RAPIDI } from "../template-rapidi";
import { useNuovaAi } from "../hooks/useNuovaAi";

export function DialogNuovaAi({ n }: { n: ReturnType<typeof useNuovaAi> }) {
  const {
    openNuova,
    setOpenNuova,
    nuovoNome,
    setNuovoNome,
    nuovaBaseUrl,
    setNuovaBaseUrl,
    nuovoModello,
    setNuovoModello,
    nuovaChiave,
    setNuovaChiave,
    linkChiaveAttuale,
    mostraNuovaChiave,
    setMostraNuovaChiave,
    applicaTemplate,
    aggiungiNuovaAi,
  } = n;

  return (
    <Dialog open={openNuova} onOpenChange={setOpenNuova}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" /> Aggiungi nuova AI
          </DialogTitle>
          <DialogDescription>
            Scegli una precompilazione rapida o inserisci manualmente i dati.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <HelpCircle className="size-4 text-primary" />
            <span>Precompila in 1 clic:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_RAPIDI.map((t) => (
              <Button
                key={t.nome}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background"
                onClick={() => applicaTemplate(t)}
              >
                {t.etichetta}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1">
            💡 <strong>Importante:</strong> il modello scelto deve avere il supporto <em>Vision</em> per leggere testo e date dagli attestati.
          </p>
        </div>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="nuovo-nome">Nome visualizzato *</Label>
            <Input
              id="nuovo-nome"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
              placeholder="es. Google AI Studio – Gemini 2.0 Flash"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="nuova-url">Base URL API *</Label>
            <Input
              id="nuova-url"
              value={nuovaBaseUrl}
              onChange={(e) => setNuovaBaseUrl(e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
            />
            <p className="text-[11px] text-muted-foreground">
              L'indirizzo compatibile OpenAI (termina tipicamente con <code>/v1</code> o <code>/openai</code>)
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="nuovo-modello">Nome Modello esatto *</Label>
            <Input
              id="nuovo-modello"
              value={nuovoModello}
              onChange={(e) => setNuovoModello(e.target.value)}
              placeholder="es. gemini-2.0-flash"
            />
            <p className="text-[11px] text-muted-foreground">
              Il codice del modello con visione (es. <code>gemini-2.0-flash</code>, <code>pixtral-12b-2409</code>)
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="nuova-chiave">Chiave API (opzionale subito)</Label>
              {linkChiaveAttuale && (
                <a
                  href={linkChiaveAttuale}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Crea chiave gratis <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                id="nuova-chiave"
                type={mostraNuovaChiave ? "text" : "password"}
                value={nuovaChiave}
                onChange={(e) => setNuovaChiave(e.target.value)}
                placeholder="Incolla qui la chiave"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setMostraNuovaChiave(!mostraNuovaChiave)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Mostra o nascondi chiave"
              >
                {mostraNuovaChiave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpenNuova(false)}>
            Annulla
          </Button>
          <Button onClick={aggiungiNuovaAi}>Salva AI</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
