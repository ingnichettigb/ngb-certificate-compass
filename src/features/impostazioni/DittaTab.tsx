/*
 * File:      DittaTab.tsx
 * Percorso:  src/features/impostazioni/DittaTab.tsx
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Scheda Ditta con anagrafica, figure sicurezza, ATECO, rischio e presenze.
 *   rev 2 — 01/11/2026 12:15 — Evidenziazione gialla e avviso rosso se il dato inserito differisce dal D.Lgs. 81/08.
 */
import {
  Building2,
  Save,
  ShieldAlert,
  Users,
  Plus,
  Trash2,
  Loader2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDittaTab } from "./ditta/useDittaTab";
import { calcolaSoglia } from "@/lib/api/ditta";

export function DittaTab() {
  const {
    form,
    soglie,
    isLoading,
    isSaving,
    nuovoAteco,
    setNuovoAteco,
    updateCampo,
    aggiungiAteco,
    rimuoviAteco,
    handleSubmit,
  } = useDittaTab();

  if (isLoading || !form) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground justify-center">
        <Loader2 className="size-5 animate-spin" /> Caricamento dati ditta dal database…
      </div>
    );
  }

  // Calcolo delle deduzioni automatiche in base alle soglie D.Lgs. 81/08
  const esitoRls = calcolaSoglia(soglie, "rls", form.n_lavoratori_dichiarato);
  const esitoPs = calcolaSoglia(soglie, "primo_soccorso", form.n_lavoratori_dichiarato);
  const esitoAntincendio = calcolaSoglia(
    soglie,
    "antincendio_presenze",
    form.presenze_contemporanee_max
  );
  const esitoIdoneita = calcolaSoglia(
    soglie,
    "idoneita_tecnica_presenze",
    form.presenze_contemporanee_max
  );

  // Verifica se il livello antincendio attribuito differisce da quello proposto dalla legge per le presenze inserite
  const livelloPropostoNum = esitoAntincendio
    ? esitoAntincendio.esito.includes("1")
      ? 1
      : esitoAntincendio.esito.includes("2")
        ? 2
        : esitoAntincendio.esito.includes("3")
          ? 3
          : null
    : null;

  const antincendioDifferisce =
    livelloPropostoNum !== null &&
    form.livello_antincendio !== null &&
    form.livello_antincendio !== undefined &&
    form.livello_antincendio !== livelloPropostoNum;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="size-5 text-primary" /> Anagrafica Ditta & Parametri di Sicurezza
          </h2>
          <p className="text-xs text-muted-foreground">
            I dati sono salvati nel database centralizzato e guidano la determinazione dei fabbisogni formativi.
          </p>
        </div>
        <Button
          type="submit"
          disabled={isSaving}
          className="border-2 border-primary bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground font-semibold gap-2"
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salva modifiche DB
        </Button>
      </div>

      {/* Riquadro 1: Dati Anagrafici e Contatti */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Building2 className="size-4 text-primary" /> Anagrafica e Recapiti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="ragione_sociale">Ragione Sociale / Denominazione *</Label>
            <Input
              id="ragione_sociale"
              value={form.ragione_sociale}
              onChange={(e) => updateCampo("ragione_sociale", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="referente">Referente aziendale</Label>
            <Input
              id="referente"
              value={form.referente || ""}
              onChange={(e) => updateCampo("referente", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
            <Input
              id="codice_fiscale"
              className="uppercase font-mono"
              value={form.codice_fiscale || ""}
              onChange={(e) => updateCampo("codice_fiscale", e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="partita_iva">Partita IVA</Label>
            <Input
              id="partita_iva"
              className="font-mono"
              value={form.partita_iva || ""}
              onChange={(e) => updateCampo("partita_iva", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              value={form.telefono || ""}
              onChange={(e) => updateCampo("telefono", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="indirizzo">Indirizzo e civico</Label>
            <Input
              id="indirizzo"
              value={form.indirizzo || ""}
              onChange={(e) => updateCampo("indirizzo", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="comune">Comune</Label>
            <Input
              id="comune"
              value={form.comune || ""}
              onChange={(e) => updateCampo("comune", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="cap">CAP</Label>
              <Input
                id="cap"
                value={form.cap || ""}
                onChange={(e) => updateCampo("cap", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="provincia">Prov.</Label>
              <Input
                id="provincia"
                maxLength={2}
                className="uppercase text-center"
                value={form.provincia || ""}
                onChange={(e) => updateCampo("provincia", e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <Label htmlFor="email">Email per risposte (Reply-To)</Label>
            <Input
              id="email"
              type="email"
              value={form.email || ""}
              onChange={(e) => updateCampo("email", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pec">PEC</Label>
            <Input
              id="pec"
              type="email"
              value={form.pec || ""}
              onChange={(e) => updateCampo("pec", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email_mittente_resend">Mittente Resend (From)</Label>
            <Input
              id="email_mittente_resend"
              className="font-mono text-xs"
              value={form.email_mittente_resend || ""}
              onChange={(e) => updateCampo("email_mittente_resend", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Riquadro 2: Figure della Sicurezza D.Lgs. 81/08 */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <ShieldAlert className="size-4 text-primary" /> Figure della Sicurezza (D.Lgs. 81/08)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="datore_di_lavoro">Datore di Lavoro</Label>
            <Input
              id="datore_di_lavoro"
              placeholder="Nome e cognome"
              value={form.datore_di_lavoro || ""}
              onChange={(e) => updateCampo("datore_di_lavoro", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rspp">RSPP</Label>
            <Input
              id="rspp"
              placeholder="Nome e cognome"
              value={form.rspp || ""}
              onChange={(e) => updateCampo("rspp", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="medico_competente">Medico Competente</Label>
            <Input
              id="medico_competente"
              placeholder="Dott. / Dott.ssa"
              value={form.medico_competente || ""}
              onChange={(e) => updateCampo("medico_competente", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Riquadro 3: Attività, ATECO e Livello di Rischio */}
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
              onChange={(e) => updateCampo("rischio_ditta", e.target.value as "basso" | "medio" | "alto")}
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
          <Label className="text-xs font-semibold">Codici ATECO Associati</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Codice ATECO (es. 85.31.00)"
              className="w-48 font-mono text-xs"
              value={nuovoAteco.codice}
              onChange={(e) => setNuovoAteco({ ...nuovoAteco, codice: e.target.value })}
            />
            <Input
              placeholder="Descrizione attività (es. Istruzione secondaria di secondo grado)"
              className="flex-1 text-xs"
              value={nuovoAteco.descrizione}
              onChange={(e) => setNuovoAteco({ ...nuovoAteco, descrizione: e.target.value })}
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
              Nessun codice ATECO registrato. Aggiungi il codice primario dell'attività.
            </p>
          )}
        </div>
      </div>

      {/* Riquadro 4: Organico, Presenze e Sintesi Fabbisogni Normativi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input dati organico */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Users className="size-4 text-primary" /> Organico e Presenze
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="n_lavoratori_dichiarato">N. Lavoratori dichiarato</Label>
              <Input
                id="n_lavoratori_dichiarato"
                type="number"
                min={0}
                placeholder="Es. 127"
                value={form.n_lavoratori_dichiarato ?? ""}
                onChange={(e) =>
                  updateCampo("n_lavoratori_dichiarato", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="n_lavoratori_data">Data agg. lavoratori</Label>
              <Input
                id="n_lavoratori_data"
                type="date"
                value={form.n_lavoratori_data_aggiornamento || ""}
                onChange={(e) => updateCampo("n_lavoratori_data_aggiornamento", e.target.value || null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="presenze_max">Presenze contemporanee max</Label>
              <Input
                id="presenze_max"
                type="number"
                min={0}
                placeholder="Es. 950"
                value={form.presenze_contemporanee_max ?? ""}
                onChange={(e) =>
                  updateCampo("presenze_contemporanee_max", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="presenze_data">Data agg. presenze</Label>
              <Input
                id="presenze_data"
                type="date"
                value={form.presenze_data_aggiornamento || ""}
                onChange={(e) => updateCampo("presenze_data_aggiornamento", e.target.value || null)}
              />
            </div>
          </div>

          {/* Campo Livello Antincendio attribuito con verifica e allerta gialla/rossa */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="livello_antincendio">Livello Antincendio attribuito</Label>
              {antincendioDifferisce && (
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  Valore personalizzato
                </span>
              )}
            </div>
            <select
              id="livello_antincendio"
              className={`w-full h-9 rounded-md text-sm shadow-sm transition-colors ${
                antincendioDifferisce
                  ? "border-2 border-amber-400 bg-amber-50 text-amber-950 font-medium focus:ring-amber-400 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-200"
                  : "border border-input bg-background text-foreground"
              } px-3 py-1`}
              value={form.livello_antincendio || 2}
              onChange={(e) => updateCampo("livello_antincendio", Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value={1}>Livello 1 (Rischio basso / Fino a 100 presenti)</option>
              <option value={2}>Livello 2 (Rischio medio / Da 101 a 1.000 presenti / Scuole)</option>
              <option value={3}>Livello 3 (Rischio elevato / Oltre 1.000 presenti)</option>
            </select>

            {/* Informativa in ROSSO se differisce da quanto proposto dal D.Lgs. 81/08 */}
            {antincendioDifferisce && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                  <span>Differisce dal D.Lgs. 81/08: sei sicuro?</span>
                </div>
                <p className="text-[11px] text-destructive/90 leading-relaxed">
                  In base alle presenze massime dichiarate (
                  <strong>{form.presenze_contemporanee_max}</strong>), la normativa propone{" "}
                  <strong>{esitoAntincendio?.esito}</strong>, mentre è stato attribuito{" "}
                  <strong>Livello {form.livello_antincendio}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sintesi deduzioni automatiche (in basso a destra) */}
        <div className="rounded-lg border bg-muted/15 p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Info className="size-4 text-primary" /> Fabbisogni Normativi Dedotti (D.Lgs. 81/08)
          </h3>
          <p className="text-xs text-muted-foreground">
            Questi valori sono calcolati automaticamente in base alle soglie di legge registrate nel DB:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-card border">
              <span>Numero RLS previsti:</span>
              <strong className="text-primary font-semibold">
                {esitoRls ? esitoRls.esito : "Non determinato"}
              </strong>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-card border">
              <span>Gruppo Primo Soccorso:</span>
              <strong className="text-primary font-semibold">
                {esitoPs ? esitoPs.esito : "Non determinato"}
              </strong>
            </div>

            {/* Riquadro Antincendio: diventa GIALLO con avviso ROSSO se differisce */}
            <div
              className={`p-2 rounded border transition-colors ${
                antincendioDifferisce
                  ? "border-2 border-amber-400 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-200"
                  : "bg-card border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Antincendio per presenze:</span>
                <strong
                  className={
                    antincendioDifferisce
                      ? "text-amber-900 dark:text-amber-300 font-bold"
                      : "text-primary font-semibold"
                  }
                >
                  {esitoAntincendio ? esitoAntincendio.esito : "Non determinato"}
                </strong>
              </div>
              {antincendioDifferisce && (
                <div className="pt-1 mt-1 border-t border-amber-300 dark:border-amber-700/50 flex items-center gap-1 text-[11px] font-semibold text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>Differisce dal Livello {form.livello_antincendio} attribuito!</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-card border">
              <span>Idoneità Tecnica VV.F. (Esame):</span>
              <strong className="text-primary font-semibold">
                {esitoIdoneita ? esitoIdoneita.esito : "Non determinata"}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-2">
            Nota: I dati guidano il piano di formazione e possono essere rettificati in qualsiasi momento.
          </p>
        </div>
      </div>
    </form>
  );
}
