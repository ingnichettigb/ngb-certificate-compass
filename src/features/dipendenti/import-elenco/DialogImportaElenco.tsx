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
 *   rev 7 — 07/11/2026 — Diviso in file per responsabilità (applica-aggiornamento, ControlliElenco, BarreAggiornamento, TabellaProposte). Nessun cambio di comportamento.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getDipendenti,
  getClassiConcorso,
  getRuoliSicurezza,
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";
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
import { PannelloSoloNuovi } from "./PannelloSoloNuovi";
import { EsitoImportazioneElenco } from "./EsitoImportazione";
import { applicaProposte } from "./applica-aggiornamento";
import { BarraConfigurazione, SelettoreModalita } from "./ControlliElenco";
import { BarraSelezioneRapida, BarraTipoPersonale } from "./BarreAggiornamento";
import { TabellaProposte } from "./TabellaProposte";
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
  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
    enabled: open,
  });
  const { data: classi = [] } = useQuery({
    queryKey: ["classi-concorso"],
    queryFn: getClassiConcorso,
    enabled: open,
  });
  const { data: ruoli = [] } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
    enabled: open,
  });

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
  const [profiloAtaGlobale, setProfiloAtaGlobale] = useState<ProfiloAta>(
    "Collaboratore scolastico",
  );
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
          return {
            ...p,
            tipo: "ata",
            sottorepartoAta: p.sottorepartoAta || profiloAtaGlobale,
            nota: "",
          };
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
          return {
            ...p,
            tipo: "ata",
            sottorepartoAta: p.sottorepartoAta || profiloAtaGlobale,
            nota: "",
          };
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
  const selezionaNessunoAgg = () =>
    setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, false])));
  const selezionaSoloNuoviAgg = () =>
    setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, !p.dipendenteId])));
  const selezionaSoloArchivioAgg = () =>
    setSpunte(Object.fromEntries(proposte.map((p) => [p.cf, !!p.dipendenteId])));

  async function applica() {
    const scelte = proposte.filter((p) => spunte[p.cf] && applicabile(p));
    if (scelte.length === 0) return;
    setLavoro(true);

    const { ok, errori } = await applicaProposte({ scelte, ruoli, dataFine, dataInizio });

    setLavoro(false);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["dipendenti"] }),
      qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
    ]);

    if (errori.length) {
      toast.error(`${errori.length} righe non aggiornate`, {
        description: errori.slice(0, 3).join("\n"),
      });
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
            Abbinamento per codice fiscale. I nuovi ingressi hanno di default spuntati i corsi base
            e specifica rischio medio 8h.
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
            <SelettoreModalita modalita={modalita} onCambia={cambiaModalita} />

            {/* Barra configurazione generale */}
            <BarraConfigurazione
              modalita={modalita}
              dataFine={dataFine}
              setDataFine={setDataFine}
              dataInizio={dataInizio}
              setDataInizio={setDataInizio}
              onFile={caricaFile}
            />

            {modalita === "nuovi" && (
              <PannelloSoloNuovi
                key={nomeFile}
                righe={righe}
                nomeFile={nomeFile}
                dataInizio={dataInizio}
                dipendenti={dipendenti}
                ruoli={ruoli}
                codiciClasse={codiciClasse}
                repartoIniziale={tipoPredefinito === "docente" ? "Docente" : "ATA"}
                onEsito={setEsito}
                onAnnulla={onClose}
              />
            )}

            {modalita === "aggiorna" && (
              <>
                {proposte.length > 0 && (
                  <BarraTipoPersonale
                    tipoPredefinito={tipoPredefinito}
                    profiloAtaGlobale={profiloAtaGlobale}
                    onTipo={cambiaTipoGlobale}
                    onProfilo={applicaProfiloAtaATutti}
                  />
                )}

                {/* Selezione rapida */}
                {proposte.length > 0 && (
                  <BarraSelezioneRapida
                    proposte={proposte}
                    onTutti={selezionaTuttiAgg}
                    onSoloNuovi={selezionaSoloNuoviAgg}
                    onSoloArchivio={selezionaSoloArchivioAgg}
                    onNessuno={selezionaNessunoAgg}
                  />
                )}

                {proposte.length > 0 && (
                  <TabellaProposte
                    proposte={proposte}
                    nomeFile={nomeFile}
                    nSel={nSel}
                    spunte={spunte}
                    setSpunte={setSpunte}
                    codiciClasse={codiciClasse}
                    dataFine={dataFine}
                    onTipoRiga={cambiaTipoRiga}
                    onProfiloAta={scegliProfiloAta}
                    onClasse={scegliClasse}
                  />
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
