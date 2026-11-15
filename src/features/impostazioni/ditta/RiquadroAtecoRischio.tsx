/*
 * File:      RiquadroAtecoRischio.tsx
 * Percorso:  src/features/impostazioni/ditta/RiquadroAtecoRischio.tsx
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DittaTab.tsx: attività, codici ATECO e livello di rischio. Nessun cambio di comportamento.
 *   rev 2 — 15/11/2026 11:56 — Selezione ATECO da catalogo Tabella 06 (ricerca istantanea, scorrimento completo, chiusura Esc), propagazione rischio e allineamento per gravità con notifica.
 */
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldAlert, Plus, Trash2, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { DittaRecord } from "@/lib/api/ditta";
import { leggiTutto, sb } from "@/lib/api/client";
import type { LivelloRischio } from "@/features/ditta/regole-ditta";
import type { AggiornaCampo } from "./tipi-ditta-tab";
import type { StatoNuovoAteco } from "./useDittaTab";

type VoceCatalogoAteco = {
  id: string;
  codice: string;
  descrizione: string;
  rischio: LivelloRischio;
};

const GRAVITA_RISCHIO: Record<LivelloRischio, number> = {
  basso: 1,
  medio: 2,
  alto: 3,
};

interface Props {
  form: DittaRecord;
  updateCampo: AggiornaCampo;
  nuovoAteco: StatoNuovoAteco;
  setNuovoAteco: Dispatch<SetStateAction<StatoNuovoAteco>>;
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
  const [filtroCatalogo, setFiltroCatalogo] = useState("");
  const [catalogoAperto, setCatalogoAperto] = useState(false);

  // Caricamento catalogo completo Tabella 06 (rischio_ateco)
  const { data: catalogo = [] } = useQuery({
    queryKey: ["raccordo", "ateco"],
    queryFn: () =>
      leggiTutto<VoceCatalogoAteco>(() =>
        sb
          .from("rischio_ateco")
          .select("id, codice, descrizione, rischio")
          .order("codice", { ascending: true }),
      ),
  });

  const vociFiltrate = useMemo(() => {
    const q = filtroCatalogo.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (v) => v.codice.toLowerCase().includes(q) || v.descrizione.toLowerCase().includes(q),
    );
  }, [catalogo, filtroCatalogo]);

  function selezionaDaCatalogo(voce: VoceCatalogoAteco) {
    setNuovoAteco({
      codice: voce.codice,
      descrizione: voce.descrizione,
      rischio: voce.rischio,
    });

    // Allineamento rischio ditta per principio di massima gravità (D.Lgs. 81/08)
    const rischioAttuale = form.rischio_ditta ?? null;
    const gAttuale = rischioAttuale ? GRAVITA_RISCHIO[rischioAttuale] ?? 0 : 0;
    const gNuovo = GRAVITA_RISCHIO[voce.rischio] ?? 0;

    if (!rischioAttuale || gNuovo > gAttuale || form.codici_ateco.length === 0) {
      updateCampo("rischio_ditta", voce.rischio);
      toast.info(
        `Grado di rischio aziendale proposto aggiornato a «${voce.rischio.toUpperCase()}» (da ATECO ${voce.codice})`,
      );
    }
    setCatalogoAperto(false);
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
              updateCampo("rischio_ditta", e.target.value as LivelloRischio)
            }
          >
            <option value="basso">Basso (es. uffici, commercio)</option>
            <option value="medio">Medio (es. scuola, trasporti, agricoltura)</option>
            <option value="alto">Alto (es. industria, edilizia, sanità)</option>
          </select>
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
                <span className="flex items-center gap-2">
                  <strong className="font-mono text-primary">{ateco.codice}</strong>
                  <span>{ateco.descrizione}</span>
                  {ateco.rischio && (
                    <Badge variant="outline" className="text-[10px] capitalize">
                      Rischio {ateco.rischio}
                    </Badge>
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
            Nessun codice ATECO registrato. Scegli dal catalogo o inserisci il codice primario dell'attività.
          </p>
        )}
      </div>
    </div>
  );
}
