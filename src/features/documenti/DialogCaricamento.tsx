/*
 * File:      DialogCaricamento.tsx
 * Percorso:  src/features/documenti/DialogCaricamento.tsx
 * Finestra «Aggiungi attestato PDF»: campi, trascinamento del file, anteprima e conferma.
 *
 * Revisioni:
 *   - Rev 1 (2026-10-20 10:00): Creazione dialog caricamento attestato PDF.
 *   - Rev 2 (2026-10-30 20:30): Salvataggio locale e gestione permessi cartelle.
 *   - Rev 3 (2026-11-04 08:00): Selezione corsi dal catalogo completo (inclusi Privacy e Covid),
 *            badge colorati per argomento, codice standard e ricalcolo automatico della scadenza.
 */
import { SceltaCartellaSalvataggio } from "./SceltaCartellaSalvataggio";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTipiCorso, type TipoCorso, type Dipendente } from "@/lib/api";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { useCaricamentoAttestato } from "./hooks/useCaricamentoAttestato";
import { AvvisoCartelle } from "@/features/cartelle/AvvisoCartelle";
import { useStatoCartelle } from "@/features/cartelle/useStatoCartelle";
import { autorizzaCartelle, collegaCartella } from "@/lib/api/stato-cartelle";
import { toast } from "sonner";

export function DialogCaricamento({
  dipendente,
  open,
  onOpenChange,
  onDone,
}: {
  dipendente: Dipendente;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    tipo, setTipo,
    altro, setAltro,
    dataCorso, setDataCorso,
    scadenza, setScadenza,
    file,
    anteprima,
    drag, setDrag,
    busy,
    anchLocale, setAnchLocale,
    cartellaDest, setCartellaDest,
    nomeFinale,
    accetta,
    conferma,
  } = useCaricamentoAttestato({ dipendente, open, onOpenChange, onDone });
  const { stato: statoCartelle, aggiorna: aggiornaStatoCartelle } = useStatoCartelle();

  const { data: corsi = [], isLoading: isLoadingCorsi } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  function ricalcolaScadenza(nomeCorso: string, dataRif: string) {
    const c = corsi.find((x) => x.nome_corso === nomeCorso);
    if (!c || !dataRif || !c.durata_validita_anni) return;
    const d = new Date(dataRif);
    if (isNaN(d.getTime())) return;
    d.setFullYear(d.getFullYear() + c.durata_validita_anni);
    setScadenza(d.toISOString().slice(0, 10));
  }

  function cambiaTipo(nuovoTipo: string) {
    setTipo(nuovoTipo);
    if (dataCorso && nuovoTipo !== "Altro") {
      ricalcolaScadenza(nuovoTipo, dataCorso);
    }
  }

  function cambiaDataCorso(nuovaData: string) {
    setDataCorso(nuovaData);
    if (nuovaData && tipo && tipo !== "Altro") {
      ricalcolaScadenza(tipo, nuovaData);
    }
  }

  async function autorizzaCartelleLocali() {
    await autorizzaCartelle("readwrite");
    await aggiornaStatoCartelle();
  }

  async function collegaCartellaLocale() {
    try {
      await collegaCartella();
    } catch (e) {
      toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
    }
    await aggiornaStatoCartelle();
  }

  const corsoSelezionato = corsi.find((c) => c.nome_corso === tipo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aggiungi attestato PDF</DialogTitle>
          <DialogDescription>
            {dipendente.cognome} {dipendente.nome} · {dipendente.codice_fiscale}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipo di attestato</Label>
              <Select value={tipo} onValueChange={cambiaTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona corso dal catalogo…">
                    {corsoSelezionato ? (
                      <span className="flex items-center gap-2 truncate">
                        {corsoSelezionato.codice && (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                            {corsoSelezionato.codice}
                          </span>
                        )}
                        <span className="truncate font-medium">{corsoSelezionato.nome_corso}</span>
                      </span>
                    ) : tipo === "Altro" ? (
                      <span className="font-medium">Altro (specifica sotto)</span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-80 w-[min(92vw,560px)]">
                  {isLoadingCorsi ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Caricamento corsi…
                    </div>
                  ) : (
                    <>
                      {corsi.map((c: TipoCorso) => {
                        const gruppo = assegnaGruppoArgomento(c);
                        return (
                          <SelectItem key={c.id} value={c.nome_corso} className="cursor-pointer py-2">
                            <div className="flex items-center gap-2">
                              {c.codice && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                                  {c.codice}
                                </span>
                              )}
                              <span className="font-medium text-foreground">{c.nome_corso}</span>
                              <span className={`ml-auto rounded px-1.5 py-0.5 text-xs font-medium ${gruppo.coloreSfondo} ${gruppo.coloreTesto}`}>
                                {gruppo.titolo}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="Altro" className="cursor-pointer border-t border-border py-2 font-semibold">
                        Altro (corso fuori catalogo)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data rilascio / emanazione</Label>
              <Input
                type="date"
                value={dataCorso}
                onChange={(e) => cambiaDataCorso(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                Anno/mese usati per il nome del file
              </span>
            </div>

            <div className="space-y-1.5">
              <Label>Data di scadenza</Label>
              <Input
                type="date"
                value={scadenza}
                onChange={(e) => setScadenza(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground">
                {corsoSelezionato?.durata_validita_anni
                  ? `Calcolata automaticamente (${corsoSelezionato.durata_validita_anni} anni)`
                  : "Per il calcolo dei rinnovi"}
              </span>
            </div>

            {tipo === "Altro" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Specifica il tipo</Label>
                <Input
                  value={altro}
                  onChange={(e) => setAltro(e.target.value)}
                  placeholder="Es. Lavori in quota, Carrello elevatore, ecc."
                />
              </div>
            )}
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              accetta(e.dataTransfer.files?.[0]);
            }}
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors ${
              drag ? "border-primary bg-accent/50" : "border-border bg-surface"
            }`}
          >
            <Upload className="size-6 text-primary" />
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <span className="text-muted-foreground">
                Trascina qui il PDF oppure clicca per sceglierlo
              </span>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => accetta(e.target.files?.[0])}
          />

          {nomeFinale && (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              Il file verrà salvato come{" "}
              <span className="font-medium break-all">{nomeFinale}</span>
            </p>
          )}

          {anteprima && (
            <object
              data={anteprima}
              type="application/pdf"
              className="h-80 w-full rounded-lg border border-border"
            >
              <p className="p-4 text-sm text-muted-foreground">
                Anteprima non disponibile in questo browser.
              </p>
            </object>
          )}

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={anchLocale}
              onChange={(e) => setAnchLocale(e.target.checked)}
              className="size-4 accent-[hsl(var(--primary))]"
            />
            Salva anche in locale (cartella "Archivio Attestati Sicurezza", solo
            Chrome/Edge da computer)
          </label>
          {anchLocale && (
            <SceltaCartellaSalvataggio valore={cartellaDest} onChange={setCartellaDest} />
          )}
          {anchLocale && (
            <AvvisoCartelle
              stato={statoCartelle}
              onAutorizza={() => void autorizzaCartelleLocali()}
              onCollega={() => void collegaCartellaLocale()}
              conseguenza="per salvare la copia locale"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Annulla
          </Button>
          <Button onClick={conferma} disabled={!nomeFinale || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Conferma e carica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
