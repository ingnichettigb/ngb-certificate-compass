/*
 * File:      DialogImportaElenco.tsx
 * Percorso:  src/features/dipendenti/import-elenco/DialogImportaElenco.tsx
 * Creato:    03/11/2026
 * Finestra «Importa elenco Word/Excel»: modalità «Solo nuovi» (con spunte libere,
 * selezione rapida e riesumazione cessati) e «Aggiornamento elenco» (con caselle libere).
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 *   rev 2 — 04/11/2026 08:40 — Colonna N° progressiva, intestazione fissa e scroll orizzontale.
 *   rev 3 — 04/11/2026 10:55 — Selettore ATA/Docenti in testa, tendina profili ATA e assegnazione corsi base/medio.
 *   rev 4 — 05/11/2026 21:30 — Due modalità: «Solo nuovi» ed «Aggiornamento elenco».
 *   rev 5 — 06/11/2026 08:20 — Collegamento esito a finestra «Da completare».
 *   rev 6 — 06/11/2026 08:35 — Caselle sbloccate in entrambe le modalità e pulsanti rapidi (Tutti/Nessuno/Nuovi/Archivio).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckSquare, FileUp, GraduationCap, Square, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getDipendenti,
  getClassiConcorso,
  getRuoliSicurezza,
  upsertDipendente,
  impostaRuoloDipendente,
  registraClasseEMateria,
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";
import { sb } from "@/lib/api/client";
import { VUOTO } from "../types";
import { inCodaDaCompletare, inizioAnnoScolastico } from "@/features/da-completare/regola-coda";
import {
  analizzaRighe,
  dataFineServizioDefault,
  PROFILI_ATA,
  type Proposta,
  type ProfiloAta,
  type RigaGrezza,
} from "./analisi-elenco";
import { leggiElenco } from "./leggi-file";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";
import { PannelloSoloNuovi } from "./PannelloSoloNuovi";
import { EsitoImportazioneElenco } from "./EsitoImportazione";
import type { EsitoImportazione } from "./registra-nuovi";

export function DialogImportaElenco({
  open,
  onClose,
  onCompleta,
}: {
  open: boolean;
  onClose: () => void;
  /** Apre la finestra «Da completare» (uno alla volta) dopo l'importazione. */
  onCompleta?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const { data: dipendenti = [] } = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti, enabled: open });
  const { data: classi = [] } = useQuery({ queryKey: ["classi-concorso"], queryFn: getClassiConcorso, enabled: open });
  const { data: ruoli = [] } = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza, enabled: open });

  const codiciClasse = useMemo(() => classi.filter((c) => c.attivo).map((c) => c.codice), [classi]);

  const [nomeFile, setNomeFile] = useState("");
  const [proposte, setProposte] = useState<Proposta[]>([]);
  const [spunte, setSpunte] = useState<Record<string, boolean>>({});
  const [dataFine, setDataFine] = useState(dataFineServizioDefault());
  const [dataInizio, setDataInizio] = useState(inizioAnnoScolastico());
  const [modalita, setModalita] = useState<"nuovi" | "aggiorna">("nuovi");
  const [righe, setRighe] = useState<RigaGrezza[]>([]);
  const [esito, setEsito] = useState<EsitoImportazione | null>(null);
  const [tipoPredefinito, setTipoPredefinito] = useState<"ata" | "docente">("ata");
  const [profiloAtaGlobale, setProfiloAtaGlobale] = useState<ProfiloAta>("Collaboratore scolastico");
  const [lavoro, setLavoro] = useState(false);

  // All'apertura della finestra si azzerano file ed esito precedenti
  useEffect(() => {
    if (!open) {
      setNomeFile("");
      setProposte([]);
      setSpunte({});
      setRighe([]);
      setEsito(null);
    }
  }, [open]);

  const applicabile = (p: Proposta) => !p.nota.startsWith("Codice fiscale non valido");

  function elaboraAggiornamento(r: RigaGrezza[], tipo: "ata" | "docente") {
    const pr = analizzaRighe(r, dipendenti, codiciClasse, tipo, profiloAtaGlobale);
    setProposte(pr);
    setSpunte(Object.fromEntries(pr.map((p) => [p.cf, applicabile(p)])));
  }

  async function caricaFile(f: File | undefined) {
    if (!f) return;
    try {
      const r = await leggiElenco(f);
      setRighe(r);
      setNomeFile(f.name);
      setEsito(null);

      const nomeMin = f.name.toLowerCase();
      const tipoDefault: "ata" | "docente" = nomeMin.includes("docent") ? "docente" : "ata";
      setTipoPredefinito(tipoDefault);

      if (modalita === "aggiorna") {
        elaboraAggiornamento(r, tipoDefault);
      }
      if (r.length === 0) toast.warning("Nessuna riga con codice fiscale trovata nel file");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function cambiaModalita(m: "nuovi" | "aggiorna") {
    setModalita(m);
    if (m === "aggiorna" && righe.length > 0) elaboraAggiornamento(righe, tipoPredefinito);
  }

  function cambiaTipoGlobale(nuovoTipo: "ata" | "docente") {
    setTipoPredefinito(nuovoTipo);
    setProposte((ps) =>
      ps.map((p) => {
        if (p.tipo === "cessazione") return p;
        if (nuovoTipo === "ata") {
          return { ...p, tipo: "ata", sottorepartoAta: p.sottorepartoAta || profiloAtaGlobale, nota: "" };
        }
        return { ...p, tipo: "docente", nota: p.classe ? "" : "Scegli la classe di concorso" };
      }),
    );
  }

  function applicaProfiloAtaATutti(nuovoProfilo: ProfiloAta) {
    setProfiloAtaGlobale(nuovoProfilo);
    setProposte((ps) =>
      ps.map((p) => (p.tipo === "ata" ? { ...p, sottorepartoAta: nuovoProfilo, nota: "" } : p)),
    );
  }

  function cambiaTipoRiga(cf: string, nuovoTipo: "ata" | "docente" | "cessazione") {
    setProposte((ps) =>
      ps.map((p) => {
        if (p.cf !== cf) return p;
        if (nuovoTipo === "ata") {
          return { ...p, tipo: "ata", sottorepartoAta: p.sottorepartoAta || profiloAtaGlobale, nota: "" };
        }
        if (nuovoTipo === "docente") {
          return { ...p, tipo: "docente", nota: p.classe ? "" : "Scegli la classe" };
        }
        return { ...p, tipo: "cessazione", nota: p.dipendenteId ? "" : "Non presente in archivio" };
      }),
    );
  }

  function scegliProfiloAta(cf: string, profilo: string) {
    setProposte((ps) =>
      ps.map((p) => (p.cf === cf ? { ...p, sottorepartoAta: profilo || null, nota: "" } : p)),
    );
  }

  function scegliClasse(cf: string, classe: string) {
    setProposte((ps) =>
      ps.map((p) =>
        p.cf === cf
          ? {
              ...p,
              classe: classe || null,
              materia: p.materia ?? (p.riga.funzione.trim() || null),
              nota: classe ? "" : "Scegli la classe",
            }
          : p,
      ),
    );
  }

  // Selettori rapidi per modalità aggiornamento
  const selezionaTuttiAgg = () => setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, true])));
  const selezionaNessunoAgg = () => setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, false])));
  const selezionaSoloNuoviAgg = () =>
    setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, !p.dipendenteId])));
  const selezionaSoloArchivioAgg = () =>
    setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, !!p.dipendenteId])));

  async function applica() {
    const scelte = proposte.filter((p) => spunte[p.cf] && applicabile(p));
    if (scelte.length === 0) return;
    setLavoro(true);
    let ok = 0;
    const errori: string[] = [];

    const { ruoloBase, ruoloSpecificaMedio } = trovaRuoliNuoviIngressi(ruoli);

    for (const p of scelte) {
      try {
        if (p.dipendenteId) {
          let upd: Record<string, unknown> = {};
          if (p.tipo === "cessazione") upd = { stato_lavoratore: "cessato", data_cessazione: dataFine };
          if (p.tipo === "docente") {
            upd = {
              reparto: "Docente",
              classe_concorso: p.classe,
              ...(p.materia && { materia: p.materia }),
            };
          }
          if (p.tipo === "ata") {
            upd = {
              reparto: "ATA",
              sottoreparto: p.sottorepartoAta,
            };
          }
          const { error } = await sb.from("dipendenti").update(upd).eq("id", p.dipendenteId);
          if (error) throw error;
        } else {
          const nuovo = await upsertDipendente({
            ...VUOTO,
            codice_fiscale: p.cf,
            cognome: p.cognome,
            nome: p.nome,
            reparto: p.tipo === "ata" ? "ATA" : "Docente",
            sottoreparto: p.sottorepartoAta ?? "",
            classe_concorso: p.classe ?? "",
            materia: p.materia ?? "",
            tipo_contratto: "determinato",
            data_assunzione: dataInizio,
          });

          if (ruoloBase?.id) await impostaRuoloDipendente(nuovo.id, ruoloBase.id, true);
          if (ruoloSpecificaMedio?.id) await impostaRuoloDipendente(nuovo.id, ruoloSpecificaMedio.id, true);
        }

        if (p.tipo === "docente") await registraClasseEMateria(p.classe, p.materia);
        ok++;
      } catch (e) {
        errori.push(`${p.cognome} ${p.nome}: ${(e as Error).message}`);
      }
    }

    setLavoro(false);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["dipendenti"] }),
      qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
    ]);

    if (errori.length) {
      toast.error(`${errori.length} righe non aggiornate`, { description: errori.slice(0, 3).join("\n") });
    }
    toast.success(`${ok} nominativi aggiornati con fabbisogno base e rischio medio attivo`);
    setProposte([]);
    setNomeFile("");
    onClose();
  }

  const nSel = proposte.filter((p) => spunte[p.cf] && applicabile(p)).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importa elenco da Word o Excel</DialogTitle>
          <DialogDescription>
            Abbinamento per codice fiscale. I nuovi ingressi hanno di default spuntati i corsi base e specifica rischio medio 8h.
          </DialogDescription>
        </DialogHeader>

        {esito ? (
          <EsitoImportazioneElenco
            esito={esito}
            dataInizio={dataInizio}
            onChiudi={onClose}
            nDaCompletare={dipendenti.filter((d) => inCodaDaCompletare(d)).length}
            onCompleta={
              onCompleta &&
              (() => {
                onClose();
                onCompleta();
              })
            }
          />
        ) : (
          <>
            {/* Modalità: solo nuovi oppure aggiornamento dell'elenco */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Modalità:</span>
              <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                <Button type="button" size="sm" variant={modalita === "nuovi" ? "default" : "ghost"} className="h-8 px-3 text-xs" onClick={() => cambiaModalita("nuovi")}>
                  Solo nuovi
                </Button>
                <Button type="button" size="sm" variant={modalita === "aggiorna" ? "default" : "ghost"} className="h-8 px-3 text-xs" onClick={() => cambiaModalita("aggiorna")}>
                  Aggiornamento elenco
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {modalita === "nuovi"
                  ? "Inserisce i nuovi e riabilita i cessati selezionati portandoli in «Da completare»."
                  : "Registra cessazioni e cambi di profilo o classe sui lavoratori già in archivio."}
              </span>
            </div>

            {/* Barra configurazione generale */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">File (.docx, .xlsx, .csv)</span>
                <Input type="file" accept=".docx,.xlsx,.xls,.xlsm,.csv" onChange={(e) => caricaFile(e.target.files?.[0])} />
              </label>
              {modalita === "aggiorna" && (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-foreground">Data fine servizio (cessati)</span>
                  <Input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-foreground">Data inizio servizio (nuovi)</span>
                <Input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
              </label>
            </div>

            {modalita === "nuovi" && (
              <PannelloSoloNuovi
                key={nomeFile}
                righe={righe}
                nomeFile={nomeFile}
                dataInizio={dataInizio}
                dipendenti={dipendenti}
                ruoli={ruoli}
                repartoIniziale={tipoPredefinito === "docente" ? "Docente" : "ATA"}
                onEsito={setEsito}
                onAnnulla={onClose}
              />
            )}

            {modalita === "aggiorna" && (
              <>
                {proposte.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Tipo personale per questo elenco:</span>
                      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant={tipoPredefinito === "ata" ? "default" : "ghost"}
                          className="h-8 gap-1.5 px-3 text-xs"
                          onClick={() => cambiaTipoGlobale("ata")}
                        >
                          <Users className="size-3.5" /> ATA
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={tipoPredefinito === "docente" ? "default" : "ghost"}
                          className="h-8 gap-1.5 px-3 text-xs"
                          onClick={() => cambiaTipoGlobale("docente")}
                        >
                          <GraduationCap className="size-3.5" /> Docenti
                        </Button>
                      </div>
                    </div>

                    {tipoPredefinito === "ata" && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground font-medium">Mansione ATA predefinita:</span>
                        <select
                          className="h-8 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium"
                          value={profiloAtaGlobale}
                          onChange={(e) => applicaProfiloAtaATutti(e.target.value as ProfiloAta)}
                        >
                          {PROFILI_ATA.map((p) => (
                            <option key={p.codice} value={p.nome}>
                              {p.nome} ({p.codice})
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => applicaProfiloAtaATutti(profiloAtaGlobale)}
                        >
                          Applica a tutti gli ATA
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selezione rapida */}
                {proposte.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium text-muted-foreground">Selezione rapida:</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaTuttiAgg}>
                      <CheckSquare className="size-3 mr-1" /> Tutti ({proposte.length})
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaSoloNuoviAgg}>
                      Solo nuovi ({proposte.filter((p) => !p.dipendenteId).length})
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={selezionaSoloArchivioAgg}>
                      Solo già in archivio ({proposte.filter((p) => !!p.dipendenteId).length})
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={selezionaNessunoAgg}>
                      <Square className="size-3 mr-1" /> Nessuno
                    </Button>
                  </div>
                )}

                {/* Tabella anteprima nominativi */}
                {proposte.length > 0 && (
                  <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
                    <div className="flex items-center justify-between px-3 py-2 bg-muted/60 text-xs text-muted-foreground border-b border-border">
                      <span>
                        <strong>{nomeFile}</strong>: {proposte.length} righe ({proposte.filter((p) => !p.dipendenteId).length} nuovi ingressi)
                      </span>
                      <span>{nSel} pronti da aggiornare</span>
                    </div>

                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-muted text-left">
                        <tr>
                          <th className="p-2 w-10 text-center">N°</th>
                          <th className="p-2 w-10" />
                          <th className="p-2">Nominativo</th>
                          <th className="p-2">Codice fiscale</th>
                          <th className="p-2 w-32">Tipo</th>
                          <th className="p-2">Mansione / Classe proposta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposte.map((p, n) => (
                          <tr key={p.cf} className={`border-t border-border ${p.dipendenteId ? "" : "bg-amber-500/10"}`}>
                            <td className="p-2 text-center font-mono text-xs text-muted-foreground">{n + 1}</td>
                            <td className="p-2 text-center">
                              <Checkbox
                                checked={!!spunte[p.cf]}
                                onCheckedChange={(v) => setSpunte((s) => ({ ...s, [p.cf]: !!v }))}
                              />
                            </td>
                            <td className="p-2">
                              <span className="font-medium">{p.cognome} {p.nome}</span>
                              <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-semibold ${p.dipendenteId ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/25 text-amber-800"}`}>
                                {p.dipendenteId ? "in archivio" : "nuovo"}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-xs text-muted-foreground">{p.cf}</td>

                            <td className="p-2">
                              <select
                                className="rounded border border-border bg-background px-2 py-1 text-xs font-medium"
                                value={p.tipo}
                                onChange={(e) => cambiaTipoRiga(p.cf, e.target.value as "ata" | "docente" | "cessazione")}
                              >
                                <option value="ata">ATA</option>
                                <option value="docente">Docente</option>
                                <option value="cessazione">Cessato</option>
                              </select>
                            </td>

                            <td className="p-2">
                              {p.tipo === "ata" && (
                                <div className="flex items-center gap-2">
                                  <select
                                    className="block rounded border border-border bg-background px-2 py-1 text-xs font-medium"
                                    value={p.sottorepartoAta ?? ""}
                                    onChange={(e) => scegliProfiloAta(p.cf, e.target.value)}
                                  >
                                    <option value="">— scegli mansione ATA —</option>
                                    {PROFILI_ATA.map((pr) => (
                                      <option key={pr.codice} value={pr.nome}>
                                        {pr.nome} ({pr.codice})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {p.tipo === "docente" && (
                                <div className="flex items-center gap-2">
                                  <select
                                    className="block rounded border border-border bg-background px-2 py-1 text-xs"
                                    value={p.classe ?? ""}
                                    onChange={(e) => scegliClasse(p.cf, e.target.value)}
                                  >
                                    <option value="">— scegli classe —</option>
                                    {codiciClasse.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                  {p.materia && <span className="text-xs text-muted-foreground">({p.materia})</span>}
                                </div>
                              )}

                              {p.tipo === "cessazione" && (
                                <span className="text-xs text-muted-foreground">
                                  {p.dipendenteId ? `Data fine servizio: ${dataFine}` : "Non presente in archivio"}
                                </span>
                              )}

                              {p.nota && <div className="text-[11px] text-amber-700 font-medium mt-0.5">{p.nota}</div>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" onClick={onClose}>
                    Annulla
                  </Button>
                  <Button disabled={lavoro || nSel === 0} onClick={applica} className="gap-1.5">
                    <FileUp className="size-4" /> Conferma e registra {nSel} nominativi
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
