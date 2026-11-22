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
 *   - Rev 4 (2026-11-22): Elenco corsi con pulsanti delle categorie (dal database), ricerca, ultimo scelto per primo,
 *            corsi e poi aggiornamenti (SelettoreCorso). Badge per argomento, «Altro» e ricalcolo scadenza invariati.
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
import { getTipiCorso, type TipoCorso, type Dipendente } from "@/lib/api";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { useCaricamentoAttestato } from "./hooks/useCaricamentoAttestato";
import { SelettoreCorso } from "@/features/selezione-corso/SelettoreCorso";
import { useLegamiCorsi } from "@/features/selezione-corso/useLegamiCorsi";
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
  const legami = useLegamiCorsi(open);

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
              <SelettoreCorso
                corsi={corsi}
                legami={legami}
                valore={tipo}
                valoreDi={(c: TipoCorso) => c.nome_corso}
                onScegli={(c: TipoCorso) => cambiaTipo(c.nome_corso)}
                segnaposto="Seleziona corso dal catalogo…"
                caricamento={isLoadingCorsi}
                badge={(c: TipoCorso) => {
                  const gruppo = assegnaGruppoArgomento(c);
                  return { testo: gruppo.titolo, classe: `${gruppo.coloreSfondo} ${gruppo.coloreTesto}` };
                }}
                extra={{ valore: "Altro", etichetta: "Altro (corso fuori catalogo)", etichettaScelta: "Altro (specifica sotto)" }}
                onScegliExtra={cambiaTipo}
              />
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
