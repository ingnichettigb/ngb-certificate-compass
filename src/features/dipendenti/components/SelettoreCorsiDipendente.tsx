/*
 * File:          SelettoreCorsiDipendente.tsx
 * Percorso:      src/features/dipendenti/components/SelettoreCorsiDipendente.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 21:40): Menu a tendina con spunte per corsi del piano formativo,
 *     tasto per inserimento nuovo corso nel catalogo, bottoni attivi con verifica attestato e 
 *     sincronizzazione bidirezionale con la matrice generale.
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Search,
  Plus,
  Check,
  X,
  FileCheck,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  type Dipendente,
  type RuoloSicurezza,
  type AssegnazioneRuolo,
  type Attestato,
  type TipoCorso,
  getTipiCorso,
  aggiungiTipoCorso,
  aggiungiRuolo,
  impostaRuoloDipendente,
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";

export function SelettoreCorsiDipendente({
  corrente,
  ruoliCatalogo,
  assegnazioni,
  attestati,
}: {
  corrente: Dipendente;
  ruoliCatalogo: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  attestati: Attestato[];
}) {
  const qc = useQueryClient();
  const [aperto, setAperto] = useState(false);
  const [filtroRicerca, setFiltroRicerca] = useState("");
  const [salvandoCorsoId, setSalvandoCorsoId] = useState<string | null>(null);

  // Dialog nuovo corso
  const [dialogNuovoAperto, setDialogNuovoAperto] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoCodice, setNuovoCodice] = useState("");
  const [nuovaMacro, setNuovaMacro] = useState("Sicurezza Lavoratori");
  const [creazioneInCorso, setCreazioneInCorso] = useState(false);

  // Catalogo corsi dal database
  const { data: corsiDb = [], isLoading: caricandoCorsi } = useQuery<TipoCorso[]>({
    queryKey: ["tipi-corso"],
    queryFn: getTipiCorso,
  });

  const mappaRuoli = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    ruoliCatalogo.forEach((r) => map.set(r.nome.toLowerCase().trim(), r));
    return map;
  }, [ruoliCatalogo]);

  const haObbligoCorso = (corso: TipoCorso): boolean => {
    const ruolo = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
    if (!ruolo) return false;
    if (ruolo.obbligatorio_tutti) return true;
    return assegnazioni.some((a) => a.dipendente_id === corrente.id && a.ruolo_id === ruolo.id);
  };

  const haAttestatoCorso = (corso: TipoCorso): boolean => {
    const cNome = corso.nome_corso.toLowerCase();
    const cCod = (corso.codice || "").toLowerCase();
    return attestati.some((att) => {
      const nomeAtt = att.tipi_corso?.nome_corso;
      if (att.dipendente_id !== corrente.id || !nomeAtt) return false;
      const t = nomeAtt.toLowerCase();
      return (cCod && t.includes(cCod)) || t.includes(cNome);
    });
  };

  async function handleToggleCorso(corso: TipoCorso) {
    if (salvandoCorsoId === corso.id) return;
    setSalvandoCorsoId(corso.id);

    try {
      let ruolo = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
      if (!ruolo) {
        await aggiungiRuolo({
          nome: corso.nome_corso,
          macro_categoria: corso.macro_categoria || "Corsi",
          obbligatorio_tutti: false,
          ordine: ruoliCatalogo.length + 1,
        });
        await qc.invalidateQueries({ queryKey: CHIAVE_RUOLI });
        ruolo = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
      }

      if (!ruolo) {
        toast.error("Impossibile associare il ruolo del corso");
        return;
      }
      if (ruolo.obbligatorio_tutti) {
        toast.info("Corso obbligatorio per tutti i lavoratori");
        return;
      }

      const attivo = haObbligoCorso(corso);
      await impostaRuoloDipendente(corrente.id, ruolo.id, !attivo);
      await Promise.all([
        qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
        qc.invalidateQueries({ queryKey: CHIAVE_RUOLI }),
      ]);

      toast.success(
        !attivo
          ? `Corso aggiunto: ${corso.nome_corso}`
          : `Corso rimosso: ${corso.nome_corso}`,
      );
    } catch (err) {
      toast.error("Errore durante l'aggiornamento", { description: (err as Error).message });
    } finally {
      setSalvandoCorsoId(null);
    }
  }

  async function handleCreaNuovoCorso() {
    const nome = nuovoNome.trim();
    if (!nome) {
      toast.error("Inserisci il nome del corso");
      return;
    }

    setCreazioneInCorso(true);
    try {
      await aggiungiTipoCorso({
        nome_corso: nome,
        macro_categoria: nuovaMacro.trim() || "Altro",
        livello_specifico: "Base",
        ordine: corsiDb.length + 1,
      });

      await aggiungiRuolo({
        nome: nome,
        macro_categoria: nuovaMacro.trim() || "Corsi",
        obbligatorio_tutti: false,
        ordine: ruoliCatalogo.length + 1,
      });

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tipi-corso"] }),
        qc.invalidateQueries({ queryKey: CHIAVE_RUOLI }),
      ]);

      toast.success(`Nuovo corso "${nome}" inserito nel catalogo`);
      setNuovoNome("");
      setNuovoCodice("");
      setDialogNuovoAperto(false);
    } catch (err) {
      toast.error("Errore nella creazione", { description: (err as Error).message });
    } finally {
      setCreazioneInCorso(false);
    }
  }

  const corsiFiltrati = useMemo(() => {
    const q = filtroRicerca.trim().toLowerCase();
    if (!q) return corsiDb;
    return corsiDb.filter((c) => {
      const cod = (c.codice || "").toLowerCase();
      const n = (c.nome_corso || "").toLowerCase();
      const cat = (c.macro_categoria || "").toLowerCase();
      return cod.includes(q) || n.includes(q) || cat.includes(q);
    });
  }, [corsiDb, filtroRicerca]);

  const corsiAttivi = useMemo(() => {
    return corsiDb.filter((c) => haObbligoCorso(c));
  }, [corsiDb, mappaRuoli, assegnazioni, corrente.id]);

  return (
    <div className="space-y-3 rounded-xl border border-primary/40 bg-card p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Corsi e Fabbisogno Formativo</h3>
          <span className="rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {corsiAttivi.length} attivi
          </span>
        </div>

        {/* Menu a tendina di selezione */}
        <Popover open={aperto} onOpenChange={setAperto}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-primary bg-primary/10 hover:bg-primary/20 text-foreground font-medium"
            >
              <span>Seleziona corsi dal catalogo</span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2 sm:w-96" align="end">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={filtroRicerca}
                  onChange={(e) => setFiltroRicerca(e.target.value)}
                  placeholder="Cerca per codice o corso..."
                  className="pl-8 text-xs h-8"
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-border/40 rounded-md border border-border/60">
                {caricandoCorsi ? (
                  <div className="flex items-center justify-center p-4 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                    Caricamento corsi...
                  </div>
                ) : corsiFiltrati.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    Nessun corso corrispondente trovato.
                  </p>
                ) : (
                  corsiFiltrati.map((c) => {
                    const spuntato = haObbligoCorso(c);
                    const occupato = salvandoCorsoId === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleCorso(c)}
                        className={`flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/70 ${
                          spuntato ? "bg-primary/5 font-medium" : ""
                        }`}
                      >
                        {occupato ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        ) : (
                          <Checkbox
                            checked={spuntato}
                            onCheckedChange={() => handleToggleCorso(c)}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {c.codice && (
                              <span className="font-mono text-[10px] text-primary">
                                [{c.codice}]
                              </span>
                            )}
                            <span className="truncate">{c.nome_corso}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {c.macro_categoria}
                            {c.ore_minime_legge ? ` · ${c.ore_minime_legge}h` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tasto per inserire un nuovo corso */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAperto(false);
                  setDialogNuovoAperto(true);
                }}
                className="w-full border-primary/60 bg-primary/10 hover:bg-primary/20 text-xs font-medium"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Aggiungi nuovo corso al catalogo
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Riquadro Bottoni Attivi per il lavoratore */}
      {corsiAttivi.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {corsiAttivi.map((c) => {
            const haDoc = haAttestatoCorso(c);
            const inLavorazione = salvandoCorsoId === c.id;

            return (
              <div
                key={c.id}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs shadow-2xs transition-all ${
                  haDoc
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-amber-500/70 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                }`}
              >
                {haDoc ? (
                  <span title="Attestato in regola"><FileCheck className="h-3.5 w-3.5 text-primary shrink-0" /></span>
                ) : (
                  <span title="Da formare: attestato mancante"><AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" /></span>
                )}
                <span className="font-medium">
                  {c.codice ? `[${c.codice}] ` : ""}
                  {c.nome_corso}
                </span>
                <button
                  type="button"
                  disabled={inLavorazione}
                  onClick={() => handleToggleCorso(c)}
                  className="ml-1 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="Rimuovi corso per questo lavoratore"
                >
                  {inLavorazione ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Nessun corso specifico abilitato. Usa il menu a tendina per assegnare corsi o aggiornamenti.
        </p>
      )}

      {/* Finestra di dialogo per nuovo corso */}
      <Dialog open={dialogNuovoAperto} onOpenChange={setDialogNuovoAperto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo Corso nel Catalogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Nome del corso *</label>
              <Input
                value={nuovoNome}
                onChange={(e) => setNuovoNome(e.target.value)}
                placeholder="es. Antincendio Livello 2 - Rischio Medio"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Codice identificativo</label>
              <Input
                value={nuovoCodice}
                onChange={(e) => setNuovoCodice(e.target.value)}
                placeholder="es. ANT-MED-08"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Macro-categoria</label>
              <Input
                value={nuovaMacro}
                onChange={(e) => setNuovaMacro(e.target.value)}
                placeholder="es. Antincendio, Primo Soccorso, Preposto..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogNuovoAperto(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreaNuovoCorso}
              disabled={creazioneInCorso}
              className="border-primary bg-primary/20 hover:bg-primary/30 text-foreground border"
            >
              {creazioneInCorso && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva e Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
