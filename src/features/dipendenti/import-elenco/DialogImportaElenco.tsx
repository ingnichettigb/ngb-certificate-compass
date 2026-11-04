/*
 * File:      DialogImportaElenco.tsx
 * Percorso:  src/features/dipendenti/import-elenco/DialogImportaElenco.tsx
 * Creato:    03/11/2026
 * Finestra «Importa elenco Word/Excel»: legge il file, abbina per codice fiscale,
 * mostra l'anteprima con spunta per riga e applica cessazioni, classi di concorso,
 * profili ATA e nuovi ingressi. Non cancella nulla e non crea classi nuove.
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 * - Rev (2026-11-04 08:40): Colonna N° progressiva, intestazione fissa e scorrimento orizzontale.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { getDipendenti, getClassiConcorso, upsertDipendente, registraClasseEMateria } from "@/lib/api";
import { sb } from "@/lib/api/client";
import { VUOTO } from "../types";
import { analizzaRighe, dataFineServizioDefault, type Proposta } from "./analisi-elenco";
import { leggiElenco } from "./leggi-file";

const ETICHETTA: Record<Proposta["tipo"], string> = {
  cessazione: "Non più in servizio",
  docente: "Docente",
  ata: "ATA",
  da_verificare: "Da verificare",
};

export function DialogImportaElenco({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: dipendenti = [] } = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti, enabled: open });
  const { data: classi = [] } = useQuery({ queryKey: ["classi-concorso"], queryFn: getClassiConcorso, enabled: open });
  const codici = useMemo(() => classi.filter((c) => c.attivo).map((c) => c.codice), [classi]);

  const [nomeFile, setNomeFile] = useState("");
  const [proposte, setProposte] = useState<Proposta[]>([]);
  const [spunte, setSpunte] = useState<Record<string, boolean>>({});
  const [dataFine, setDataFine] = useState(dataFineServizioDefault());
  const [dataInizio, setDataInizio] = useState(`${new Date().getFullYear()}-09-01`);
  const [lavoro, setLavoro] = useState(false);

  const applicabile = (p: Proposta) =>
    !p.nota.startsWith("Codice fiscale") &&
    ((p.tipo === "cessazione" && !!p.dipendenteId) ||
      (p.tipo === "docente" && !!p.classe) ||
      (p.tipo === "ata" && !!p.sottorepartoAta));

  async function caricaFile(f: File | undefined) {
    if (!f) return;
    try {
      const righe = await leggiElenco(f);
      const pr = analizzaRighe(righe, dipendenti, codici);
      setNomeFile(f.name);
      setProposte(pr);
      setSpunte(Object.fromEntries(pr.map((p) => [p.cf, applicabile(p)])));
      if (pr.length === 0) toast.warning("Nessuna riga con codice fiscale trovata nel file");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function scegliClasse(cf: string, classe: string) {
    setProposte((ps) =>
      ps.map((p) =>
        p.cf === cf ? { ...p, tipo: classe ? "docente" : "da_verificare", classe: classe || null, materia: p.materia ?? (p.riga.funzione.trim() || null) } : p,
      ),
    );
    setSpunte((s) => ({ ...s, [cf]: !!classe }));
  }

  async function applica() {
    const scelte = proposte.filter((p) => spunte[p.cf] && applicabile(p));
    if (scelte.length === 0) return;
    setLavoro(true);
    let ok = 0;
    const errori: string[] = [];
    for (const p of scelte) {
      try {
        if (p.dipendenteId) {
          let upd: Record<string, unknown> = {};
          if (p.tipo === "cessazione") upd = { stato_lavoratore: "cessato", data_cessazione: dataFine };
          if (p.tipo === "docente") upd = { reparto: "Docente", classe_concorso: p.classe, ...(p.materia && { materia: p.materia }) };
          if (p.tipo === "ata") upd = { reparto: "ATA", sottoreparto: p.sottorepartoAta };
          const { error } = await sb.from("dipendenti").update(upd).eq("id", p.dipendenteId);
          if (error) throw error;
        } else {
          await upsertDipendente({
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
        }
        if (p.tipo === "docente") await registraClasseEMateria(p.classe, p.materia);
        ok++;
      } catch (e) {
        errori.push(`${p.cognome} ${p.nome}: ${(e as Error).message}`);
      }
    }
    setLavoro(false);
    await qc.invalidateQueries({ queryKey: ["dipendenti"] });
    if (errori.length) toast.error(`${errori.length} righe non aggiornate`, { description: errori.slice(0, 3).join("\n") });
    toast.success(`${ok} nominativi aggiornati`);
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
            Abbinamento tramite codice fiscale. Nulla viene cancellato; le classi non presenti nel catalogo vanno scelte a mano.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-sm">
            File (.docx, .xlsx, .xls, .csv)
            <Input type="file" accept=".docx,.xlsx,.xls,.xlsm,.csv" onChange={(e) => caricaFile(e.target.files?.[0])} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data fine servizio (cessati)
            <Input type="date" value={dataFine} onChange={(e) => setDataFine(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data inizio servizio (nuovi)
            <Input type="date" value={dataInizio} onChange={(e) => setDataInizio(e.target.value)} />
          </label>
        </div>

        {proposte.length > 0 && (
          <div className="max-h-[55vh] overflow-auto rounded-lg border border-border">
            <p className="px-3 py-2 text-xs text-muted-foreground">
              {nomeFile}: {proposte.length} righe, {proposte.filter((p) => !p.dipendenteId).length} nuovi ingressi
            </p>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-left">
                <tr>
                  <th className="p-2 w-10 text-center">N°</th>
                  <th className="p-2" />
                  <th className="p-2">Nominativo</th>
                  <th className="p-2">Codice fiscale</th>
                  <th className="p-2">Nel file</th>
                  <th className="p-2">Azione proposta</th>
                </tr>
              </thead>
              <tbody>
                {proposte.map((p, n) => (
                  <tr key={p.cf} className={`border-t border-border ${p.dipendenteId ? "" : "bg-amber-500/10"}`}>
                    <td className="p-2 text-center font-mono text-xs text-muted-foreground">{n + 1}</td>
                    <td className="p-2">
                      <Checkbox
                        checked={!!spunte[p.cf]}
                        disabled={!applicabile(p)}
                        onCheckedChange={(v) => setSpunte((s) => ({ ...s, [p.cf]: !!v }))}
                      />
                    </td>
                    <td className="p-2">
                      {p.cognome} {p.nome}
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs ${p.dipendenteId ? "bg-emerald-500/15" : "bg-amber-500/25"}`}>
                        {p.dipendenteId ? "in archivio" : "nuovo"}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-xs">{p.cf}</td>
                    <td className="p-2">{p.riga.funzione}</td>
                    <td className="p-2">
                      <span className="font-medium">{ETICHETTA[p.tipo]}</span>
                      {p.classe && <> · {p.classe}{p.materia ? ` – ${p.materia}` : ""}</>}
                      {p.sottorepartoAta && <> · {p.sottorepartoAta}</>}
                      {p.tipo === "cessazione" && !p.dipendenteId && (
                        <div className="text-xs text-destructive">Non presente in archivio: nulla da cessare</div>
                      )}
                      {(p.tipo === "da_verificare" || (p.tipo === "docente" && p.nota)) && (
                        <select
                          className="mt-1 block rounded border border-border bg-background px-2 py-1 text-xs"
                          value={p.classe ?? ""}
                          onChange={(e) => scegliClasse(p.cf, e.target.value)}
                        >
                          <option value="">— scegli classe —</option>
                          {codici.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                      {p.nota && <div className="text-xs text-amber-700">{p.nota}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button disabled={lavoro || nSel === 0} onClick={applica} className="gap-1.5">
            <FileUp className="size-4" /> Conferma e aggiorna {nSel} nominativi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
