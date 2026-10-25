/*
 * File:      ModuloDati.tsx
 * Percorso:  src/features/operatore/components/ModuloDati.tsx
 * Modulo dei dati estratti dall'attestato (con mirino OCR) e pulsanti di salvataggio.
 * Revisioni:
 *   rev 2 — 25/10/2026 10:15 — Reparto scelto da menu (SelezioneRepartoModulo).
 */
import { Archive, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pulisciCF } from "@/lib/api";
import { nomeFileStandard } from "../nome-file";
import type { CampoOcr, Riga, TipoCorso } from "../types";
import { MirinoOcr } from "./MirinoOcr";
import { SelezioneRepartoModulo } from "./SelezioneRepartoModulo";

export function ModuloDati({
  form,
  set,
  tipi,
  campoOcr,
  setCampoOcr,
  haAnteprima,
  totPagine,
  pagine,
  setPagine,
  idInModifica,
  salvando,
  archiviando,
  onSvuota,
  onSalva,
}: {
  form: Omit<Riga, "id">;
  set: <K extends keyof Riga>(k: K, v: Riga[K]) => void;
  tipi: TipoCorso[];
  campoOcr: CampoOcr | null;
  setCampoOcr: (campo: CampoOcr | null) => void;
  haAnteprima: boolean;
  totPagine: number;
  pagine: string;
  setPagine: (valore: string) => void;
  idInModifica: string | null;
  salvando: boolean;
  archiviando: boolean;
  onSvuota: () => void;
  onSalva: (archiviaSubito: boolean) => void;
}) {
  const mirino = (campo: CampoOcr) => (
    <MirinoOcr campo={campo} campoAttivo={campoOcr} disabled={!haAnteprima} onToggle={setCampoOcr} />
  );

  return (
        <Card>
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="text-sm font-medium">Dati estratti e valutazione</CardTitle>
            <p className="text-xs text-muted-foreground">
              Clicca il mirino accanto a un campo, poi seleziona l'area sul documento per copiarne il testo pulito.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cog">Cognome{mirino("cognome")}</Label>
                <Input id="cog" value={form.cognome} onChange={(e) => set("cognome", e.target.value.toUpperCase())} />
              </div>
              <div>
                <Label htmlFor="nom">Nome{mirino("nome")}</Label>
                <Input id="nom" value={form.nome} onChange={(e) => set("nome", e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cf">Codice Fiscale{mirino("codice_fiscale")}</Label>
                <Input id="cf" value={form.codice_fiscale} onChange={(e) => set("codice_fiscale", pulisciCF(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="ateco">Codice ATECO{mirino("codice_ateco")}</Label>
                <Input id="ateco" value={form.codice_ateco} onChange={(e) => set("codice_ateco", e.target.value)} />
              </div>
            </div>

            {/* Campo Email lavoratore e Reparto nel modulo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email lavoratore{mirino("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="es. nome@azienda.it"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value.toLowerCase().trim())}
                />
              </div>
              <div>
                <Label htmlFor="rep">Reparto</Label>
                <SelezioneRepartoModulo value={form.reparto} onChange={(v) => set("reparto", v)} />
              </div>
            </div>

            <div>
              <Label>Corso identificato</Label>
              <Select
                value={form.tipo_corso_id ?? ""}
                onValueChange={(val) => {
                  const t = tipi.find((x) => x.id === val);
                  set("tipo_corso_id", val);
                  if (t) set("tipo_corso_nome", t.nome_corso);
                  set("tipo_corso_codice", t?.codice ?? null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona corso..." />
                </SelectTrigger>
                <SelectContent>
                  {[...tipi]
                    .sort((a, b) => (a.codice ?? "~").localeCompare(b.codice ?? "~"))
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="font-mono text-xs text-primary mr-2">{t.codice ?? "—"}</span>
                        {t.nome_corso}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({t.ore_minime_legge ?? "?"} ore)
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="dt">Data emanazione{mirino("data_corso")}</Label>
                <Input id="dt" type="date" value={form.data_corso} onChange={(e) => set("data_corso", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ore">Ore corso{mirino("ore")}</Label>
                <Input id="ore" type="number" value={form.ore ?? ""} onChange={(e) => set("ore", Number(e.target.value) || null)} />
              </div>
              <div>
                <Label htmlFor="esito">Esito</Label>
                <Select value={form.esito} onValueChange={(val: any) => set("esito", val)}>
                  <SelectTrigger id="esito">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Valido">Valido</SelectItem>
                    <SelectItem value="Valido con integrazione DVR">Valido con integrazione DVR</SelectItem>
                    <SelectItem value="Non valido">Non valido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="note">Note valutazione{mirino("note")}</Label>
              <Textarea id="note" rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
            </div>

            <div className="rounded-md border p-3 bg-muted/30 text-xs font-mono break-all">
              <span className="font-semibold text-muted-foreground block mb-1">Nome file archiviazione:</span>
              {nomeFileStandard({
                ...form,
                tipo_corso_codice: form.tipo_corso_codice ?? tipi.find((t) => t.id === form.tipo_corso_id)?.codice ?? null,
              })}
            </div>

            {totPagine > 1 && (
              <div>
                <Label htmlFor="pag">Pagine da salvare per questo corso (es. 1-2 oppure 3)</Label>
                <Input id="pag" placeholder={`Tutte (1-${totPagine})`} value={pagine} onChange={(e) => setPagine(e.target.value)} />
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onSvuota}><X className="size-4" /> Svuota</Button>
              <Button variant="outline" disabled={salvando || archiviando} onClick={() => onSalva(true)}>
                <Archive className="size-4" /> Archivia subito nel DB
              </Button>
              <Button disabled={salvando || archiviando} onClick={() => onSalva(false)}>
                {salvando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {idInModifica ? "Salva modifiche" : "Aggiungi alla coda"}
              </Button>
            </div>
          </CardContent>
        </Card>
  );
}
