/*
 * File:      RiquadroAtecoRischio.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAtecoRischio.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: attività, codici ATECO e livello di rischio. Nessun cambio di comportamento.
 *   rev 2 — 15/11/2026 11:56 — Selezione ATECO da catalogo Tabella 06 (ricerca istantanea, scorrimento, chiusura Esc).
 *   rev 3 — 15/11/2026 12:45 — Uso hook unico useCatalogoAteco (anti-collisione cache), rimozione mutazione prematura del rischio ditta, stella ATECO principale ed etichetta rischio calcolato vs forzato con tasto ripristina.
 */
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { ShieldAlert, Plus, Trash2, Search, BookOpen, Star, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { DittaRecord } from "@/lib/api/ditta";
import type { LivelloRischio } from "@/features/ditta/regole-ditta";
import {
  useCatalogoAteco,
  calcolaRischioMassimo,
  type VoceCatalogoAteco,
} from "@/features/ditta/catalogo-ateco";
import type { AggiornaCampo } from "./tipi-ditta-tab";
import type { StatoNuovoAteco } from "./useDittaTab";

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  nuovoAteco: StatoNuovoAteco;
  setNuovoAteco: Dispatch<SetStateAction<StatoNuovoAteco>>;
  aggiungiAteco: () => void;
  rimuoviAteco: (index: number) => void;
  impostaPrincipale: (index: number) => void;
}

export function RiquadroAtecoRischio({
  form,
  updateCampo,
  nuovoAteco,
  setNuovoAteco,
  aggiungiAteco,
  rimuoviAteco,
  impostaPrincipale,
}: Props) {
  const [filtroCatalogo, setFiltroCatalogo] = useState("");
  const [catalogoAperto, setCatalogoAperto] = useState(false);

  // Hook condiviso: nessuna collisione di cache
  const { data: catalogo = [] } = useCatalogoAteco();

  const vociFiltrate = useMemo(() => {
    const q = filtroCatalogo.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (v) => v.codice.toLowerCase().includes(q) || v.descrizione.toLowerCase().includes(q),
    );
  }, [catalogo, filtroCatalogo]);

  // Rischio teorico calcolato in base alla massima gravità dei codici ATECO associati
  const rischioCalcolato = useMemo(
    () => calcolaRischioMassimo(form.codici_ateco),
    [form.codici_ateco],
  );

  const eManuale =
    form.codici_ateco.length > 0 &&
    rischioCalcolato !== null &&
    form.rischio_ditta !== null &&
    form.rischio_ditta !== rischioCalcolato;

  function selezionaDaCatalogo(voce: VoceCatalogoAteco) {
    // Precompila il form di inserimento senza toccare prematuramente il rischio aziendale
    setNuovoAteco({
      codice: voce.codice,
      descrizione: voce.descrizione,
      rischio: voce.rischio,
    });
    setCatalogoAperto(false);
  }

  function ripristinaRischioCalcolato() {
    if (rischioCalcolato) {
      updateCampo("rischio_ditta", rischioCalcolato);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <ShieldAlert className="size-4 text-primary" /> Attività, Codici ATECO e Rischio Aziendale
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rischio_ditta">Grado di Rischio Aziendale</Label>
            {form.codici_ateco.length > 0 && rischioCalcolato && (
              <span className="text-[11px] text-muted-foreground">
                {eManuale ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Impostato manualmente
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Calcolato dai codici
                  </span>
                )}
              </span>
            )}
          </div>
          <select
            id="rischio_ditta"
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={form.rischio_ditta || "medio"}
            onChange={(e) =>
              updateCampo("rischio_ditta", e.target.value as LivelloRischio)
            }
          >
            <option value="basso">Basso (es. uffici, commercio)</option>
            <option value="medio">Medio (es. scuola, trasporti, agricoltura)</option>
            <option value="alto">Alto (es. industria, edilizia, sanità)</option>
          </select>

          {eManuale && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={ripristinaRischioCalcolato}
              className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            >
              <RefreshCw className="size-3" />
              Ripristina calcolato ({rischioCalcolato})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch
            id="e_scuola"
            checked={form.e_scuola}
            onCheckedChange={(val) => updateCampo("e_scuola", val)}
          />
          <Label htmlFor="e_scuola" className="text-xs cursor-pointer">
            È un Istituto scolastico / Scuola (Regole scuola D.P.R. 151/2011)
          </Label>
        </div>

        <div className="flex items-center gap-3 pt-6">
          <Switch
            id="reparti_rischio_differenziato"
            checked={form.reparti_rischio_differenziato}
            onCheckedChange={(val) => updateCampo("reparti_rischio_differenziato", val)}
          />
          <Label htmlFor="reparti_rischio_differenziato" className="text-xs cursor-pointer">
            Reparti con rischio differenziato
          </Label>
        </div>
      </div>

      {/* Gestione Codici ATECO */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Codici ATECO Associati</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCatalogoAperto((p) => !p)}
            className="h-7 text-xs gap-1 border-primary/50 text-primary hover:bg-primary/10"
          >
            <BookOpen className="size-3.5" />
            {catalogoAperto ? "Chiudi catalogo ATECO" : "Sfoglia catalogo Tabella 06"}
          </Button>
        </div>

        {/* Box ricerca ed elenco scorrevole Tabella 06 */}
        {catalogoAperto && (
          <div className="rounded-md border border-primary/30 bg-muted/40 p-3 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per numero (es. 85) o descrizione attività (es. istruzione, scuola)… [Esc per chiudere]"
                value={filtroCatalogo}
                onChange={(e) => setFiltroCatalogo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setCatalogoAperto(false);
                }}
                className="h-8 pl-8 text-xs bg-background"
                autoFocus
              />
            </div>
            <div className="max-h-56 overflow-y-auto divide-y rounded border bg-background text-xs">
              {vociFiltrate.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selezionaDaCatalogo(v)}
                  className="w-full text-left p-2 hover:bg-primary/10 flex items-center justify-between transition-colors"
                >
                  <span className="truncate pr-2">
                    <strong className="font-mono text-primary mr-2">{v.codice}</strong>
                    {v.descrizione}
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                    Rischio {v.rischio}
                  </Badge>
                </button>
              ))}
              {vociFiltrate.length === 0 && (
                <div className="p-3 text-center text-muted-foreground italic">
                  Nessun codice ATECO trovato con «{filtroCatalogo}».
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Codice ATECO (es. 85 o 85.31.00)"
            className="w-48 font-mono text-xs"
            value={nuovoAteco.codice}
            onChange={(e) => setNuovoAteco({ ...nuovoAteco, codice: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiAteco();
              }
            }}
          />
          <Input
            placeholder="Descrizione attività (es. Istruzione secondaria di secondo grado)"
            className="flex-1 text-xs"
            value={nuovoAteco.descrizione}
            onChange={(e) => setNuovoAteco({ ...nuovoAteco, descrizione: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                aggiungiAteco();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={aggiungiAteco}
            className="border-primary text-primary"
          >
            <Plus className="size-4 mr-1" /> Aggiungi
          </Button>
        </div>

        {form.codici_ateco.length > 0 ? (
          <ul className="divide-y rounded-md border text-xs bg-muted/20">
            {form.codici_ateco.map((ateco, idx) => (
              <li key={idx} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title={
                      ateco.principale
                        ? "Codice ATECO principale per i nuovi dipendenti"
                        : "Clicca per impostare come codice ATECO principale"
                    }
                    onClick={() => impostaPrincipale(idx)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <Star
                      className={`size-4 ${
                        ateco.principale
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                    />
                  </button>
                  <strong className="font-mono text-primary">{ateco.codice}</strong>
                  <span>{ateco.descrizione}</span>
                  {ateco.rischio && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      Rischio {ateco.rischio}
                    </Badge>
                  )}
                  {ateco.principale && (
                    <Badge variant="secondary" className="text-[10px]">
                      Principale
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => rimuoviAteco(idx)}
                  title="Rimuovi questo codice ATECO"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Nessun codice ATECO registrato. Scegli dal catalogo o inserisci il codice primario dell'attività.
          </p>
        )}
      </div>
    </div>
  );
}
