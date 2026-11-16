/*
 * File:      RiquadroAtecoRischio.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAtecoRischio.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: attività, codici ATECO e livello di rischio. Nessun cambio di comportamento.
 *   rev 2 — 15/11/2026 11:45 — Catalogo ATECO dalla Tabella 06 con ricerca per numero o descrizione (compila codice e descrizione;
 *            «Aggiungi» resta il gesto che salva il codice), rischio di ogni codice dal catalogo e rischio aziendale suggerito
 *            con pulsante «Applica» (mai cambiato in automatico).
 */
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { DittaRecord } from "@/lib/api/ditta";
import { leggiTutto, sb } from "@/lib/api/client";
import { rischioDaCatalogo, rischioSuggeritoDitta } from "@/features/ditta/regole-ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";

type NuovoAteco = { codice: string; descrizione: string };
type VoceCatalogo = {
  id: string;
  codice: string;
  descrizione: string | null;
  rischio: string | null;
};

const MAX_VOCI = 30;

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  nuovoAteco: NuovoAteco;
  setNuovoAteco: Dispatch<SetStateAction<NuovoAteco>>;
  aggiungiAteco: () => void;
  rimuoviAteco: (index: number) => void;
}

export function RiquadroAtecoRischio({
  form,
  updateCampo,
  nuovoAteco,
  setNuovoAteco,
  aggiungiAteco,
  rimuoviAteco,
}: Props) {
  const [catalogoAperto, setCatalogoAperto] = useState(false);
  const [ricerca, setRicerca] = useState("");

  // Catalogo della Tabella 06. Chiave propria: la tabella di raccordo salva righe con altri campi sotto ["raccordo", "ateco"].
  const { data: catalogo = [] } = useQuery({
    queryKey: ["ateco-catalogo"],
    queryFn: () =>
      leggiTutto<VoceCatalogo>(() =>
        sb
          .from("rischio_ateco")
          .select("id, codice, descrizione, rischio")
          .order("codice", { ascending: true }),
      ),
  });

  const trovate = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (v) => v.codice.toLowerCase().includes(q) || (v.descrizione ?? "").toLowerCase().includes(q),
    );
  }, [catalogo, ricerca]);

  const rischioSuggerito = rischioSuggeritoDitta(form.codici_ateco, catalogo);
  const rischioAttuale = form.rischio_ditta || "medio";

  function scegli(v: VoceCatalogo) {
    setNuovoAteco({ codice: v.codice, descrizione: v.descrizione ?? "" });
    setCatalogoAperto(false);
    setRicerca("");
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <ShieldAlert className="size-4 text-primary" /> Attività, Codici ATECO e Rischio Aziendale
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="space-y-1">
          <Label htmlFor="rischio_ditta">Grado di Rischio Aziendale</Label>
          <select
            id="rischio_ditta"
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            value={form.rischio_ditta || "medio"}
            onChange={(e) =>
              updateCampo("rischio_ditta", e.target.value as "basso" | "medio" | "alto")
            }
          >
            <option value="basso">Basso (es. uffici, commercio)</option>
            <option value="medio">Medio (es. scuola, trasporti, agricoltura)</option>
            <option value="alto">Alto (es. industria, edilizia, sanità)</option>
          </select>
          {rischioSuggerito && rischioSuggerito !== rischioAttuale && (
            <p className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              I codici ATECO indicano rischio {rischioSuggerito} (Tabella 06).
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => updateCampo("rischio_ditta", rischioSuggerito)}
              >
                Applica
              </Button>
            </p>
          )}
          {rischioSuggerito && rischioSuggerito === rischioAttuale && (
            <p className="text-[11px] text-muted-foreground">In linea con la Tabella 06.</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Switch
            id="e_scuola"
            checked={form.e_scuola}
            onCheckedChange={(val) => updateCampo("e_scuola", val)}
          />
          <Label htmlFor="e_scuola" className="text-xs cursor-pointer">
            È un Istituto scolastico / Scuola (Regole scuola D.P.R. 151/2011)
          </Label>
        </div>

        <div className="flex items-center gap-3 pt-4">
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
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">Codici ATECO Associati</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            aria-expanded={catalogoAperto}
            onClick={() => setCatalogoAperto((a) => !a)}
          >
            <BookOpen className="size-3.5" />{" "}
            {catalogoAperto ? "Chiudi catalogo" : "Scegli dal catalogo"}
          </Button>
        </div>

        {catalogoAperto && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                aria-label="Cerca nel catalogo ATECO"
                placeholder="Cerca per numero (es. 85) o per attività (es. istruzione)…"
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <ul className="max-h-48 divide-y overflow-y-auto rounded border bg-background text-xs">
              {trovate.slice(0, MAX_VOCI).map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => scegli(v)}
                    className="flex w-full items-center justify-between gap-2 p-2 text-left hover:bg-primary/10"
                  >
                    <span>
                      <strong className="mr-2 font-mono text-primary">{v.codice}</strong>
                      {v.descrizione}
                    </span>
                    {v.rischio && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        rischio {v.rischio}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {trovate.length === 0 && (
                <li className="p-3 text-center italic text-muted-foreground">
                  {catalogo.length === 0
                    ? "Catalogo vuoto o non disponibile (Tabella 06)."
                    : `Nessun codice trovato per «${ricerca.trim()}».`}
                </li>
              )}
            </ul>
            {trovate.length > MAX_VOCI && (
              <p className="text-[11px] text-muted-foreground">
                Mostrati {MAX_VOCI} di {trovate.length}: restringi la ricerca.
              </p>
            )}
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
                <span>
                  <strong className="font-mono text-primary mr-2">{ateco.codice}</strong>
                  {ateco.descrizione}
                  {(ateco.rischio ?? rischioDaCatalogo(ateco.codice, catalogo)) && (
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      rischio {ateco.rischio ?? rischioDaCatalogo(ateco.codice, catalogo)}
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => rimuoviAteco(idx)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">
            Nessun codice ATECO registrato. Scegli dal catalogo o aggiungi il codice primario
            dell'attività.
          </p>
        )}
      </div>
    </div>
  );
}
