/*
 * File:      ImpostazioniDialog.tsx
 * Percorso:  src/components/ImpostazioniDialog.tsx
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Creazione iniziale modale impostazioni.
 *   rev 2 — 25/10/2026 10:15 — Aggiunte schede Ditta e Corsi.
 *   rev 3 — 26/10/2026 17:50 — Layout a schermo intero con createPortal e tasto Torna.
 *   rev 4 — 26/10/2026 17:58 — Chiusura Esc condizionata per non chiudere le impostazioni se è aperto un popup interno.
 *   rev 5 — 01/11/2026 12:00 — Integrazione DittaTab con anagrafica database e parametri D.Lgs. 81/08.
 *   rev 6 — 06/11/2026 — «Torna» ed Esc chiedono SEMPRE conferma con 3 scelte (Salva e chiudi / Esci senza salvare /
 *                        Annulla); la stessa conferma compare cambiando scheda se la Ditta ha modifiche non salvate.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings, ArrowLeft, Save, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DittaTab, type DittaTabHandle } from "@/features/impostazioni/DittaTab";
import { TabellaTipiCorsoDialog } from "@/features/tipi-corso/TabellaTipiCorsoDialog";
import { RepartiTab } from "@/features/impostazioni/RepartiTab";
import { InsegnamentoTab } from "@/features/impostazioni/InsegnamentoTab";
import { CategorieTab } from "@/features/impostazioni/CategorieTab";
import { RuoliTab } from "@/features/impostazioni/RuoliTab";
import { ArchivioTab } from "@/features/impostazioni/ArchivioTab";

/** Cosa fare dopo la scelta nel dialogo di conferma. */
type AzioneDopo = { tipo: "chiudi" } | { tipo: "scheda"; valore: string };

export function ImpostazioniDialog() {
  const [open, setOpen] = useState(false);
  const [scheda, setScheda] = useState("ditta");
  const [azione, setAzione] = useState<AzioneDopo | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const dittaRef = useRef<DittaTabHandle | null>(null);

  const modifichePendenti = () => dittaRef.current?.isDirty() ?? false;

  function eseguiAzione(a: AzioneDopo) {
    if (a.tipo === "chiudi") {
      setOpen(false);
      setScheda("ditta");
    } else {
      setScheda(a.valore);
    }
    setAzione(null);
  }

  function richiediChiusura() {
    setAzione({ tipo: "chiudi" }); // «Torna» chiede sempre conferma
  }

  function cambiaScheda(valore: string) {
    if (valore === scheda) return;
    if (scheda === "ditta" && modifichePendenti()) {
      setAzione({ tipo: "scheda", valore });
      return;
    }
    setScheda(valore);
  }

  async function salvaEProcedi() {
    if (!azione) return;
    setInCorso(true);
    try {
      // Se non ci sono modifiche (o la scheda Ditta non è aperta) non c'è nulla da salvare.
      const ok = modifichePendenti() ? await (dittaRef.current?.salva() ?? Promise.resolve(true)) : true;
      if (ok) eseguiAzione(azione);
    } finally {
      setInCorso(false);
    }
  }

  function esciSenzaSalvare() {
    if (!azione) return;
    dittaRef.current?.scarta();
    eseguiAzione(azione);
  }

  const annulla = () => setAzione(null);

  // Tasto Esc: con la conferma aperta equivale ad «Annulla»; altrimenti apre la conferma di uscita.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (azione) {
        if (!inCorso) setAzione(null);
        return;
      }
      // Se c'è un dialog Radix aperto sopra, lasciamo gestire la chiusura a lui
      const popupAperto = document.querySelector("[data-radix-portal] [role='dialog'], [role='alertdialog']");
      if (popupAperto) return;
      richiediChiusura();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, azione, inCorso]);

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

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[100] flex h-screen w-screen flex-col bg-background"
            >
              {/* Barra superiore a tutta larghezza con titolo e tasto Torna */}
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4 shadow-sm shrink-0">
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Settings className="size-5 text-primary" />
                    Impostazioni generali del programma
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dati ditta, corsi, reparti, materie, categorie, ruoli e cartella locale degli attestati.
                  </p>
                </div>

                <Button
                  onClick={richiediChiusura}
                  className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground transition-all font-semibold px-4"
                >
                  <ArrowLeft className="size-4 mr-2" /> Torna
                </Button>
              </header>

              {/* Area contenuti a tutto schermo con scroll indipendente */}
              <main className="flex-1 overflow-y-auto px-6 py-6 max-w-7xl w-full mx-auto">
                <Tabs value={scheda} onValueChange={cambiaScheda} className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-7 mb-6">
                    <TabsTrigger value="ditta">Ditta</TabsTrigger>
                    <TabsTrigger value="corsi">Corsi</TabsTrigger>
                    <TabsTrigger value="reparti">Reparti</TabsTrigger>
                    <TabsTrigger value="insegnamento">Materie</TabsTrigger>
                    <TabsTrigger value="categorie">Categorie</TabsTrigger>
                    <TabsTrigger value="ruoli">Ruoli</TabsTrigger>
                    <TabsTrigger value="archivio">Archivio</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ditta">
                    <DittaTab tabHandleRef={dittaRef} />
                  </TabsContent>

                  <TabsContent value="corsi" className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Codici ufficiali, ore minime, validità ed esportazione Excel dei tipi di corso.
                    </p>
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
              </main>

              {/* Conferma a 3 scelte (non usa Radix: così resta sopra la schermata a z-[100] e Esc è gestito qui) */}
              {azione ? (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="conferma-uscita-titolo"
                    className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-lg"
                  >
                    <div className="space-y-2">
                      <h2 id="conferma-uscita-titolo" className="flex items-center gap-2 text-lg font-semibold">
                        <AlertTriangle
                          className={`size-5 shrink-0 ${modifichePendenti() ? "text-destructive" : "text-primary"}`}
                        />
                        {azione.tipo === "chiudi" ? "Tornare indietro?" : "Cambiare scheda?"}
                      </h2>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {modifichePendenti()
                          ? "Hai modifiche ai dati della ditta (o ai codici ATECO) non ancora salvate nel database. Se esci senza salvare andranno perse."
                          : azione.tipo === "chiudi"
                            ? "Non ci sono modifiche in sospeso. Vuoi chiudere le Impostazioni generali?"
                            : "Non ci sono modifiche in sospeso."}
                      </p>
                    </div>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" onClick={annulla} disabled={inCorso} autoFocus>
                        Annulla
                      </Button>
                      <Button variant="destructive" onClick={esciSenzaSalvare} disabled={inCorso}>
                        Esci senza salvare
                      </Button>
                      <Button
                        onClick={() => void salvaEProcedi()}
                        disabled={inCorso}
                        className="border-2 border-primary bg-primary/15 font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {inCorso ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Save className="mr-1.5 size-4" />}
                        Salva e chiudi
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
