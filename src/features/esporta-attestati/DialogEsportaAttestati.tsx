/**
 * @file DialogEsportaAttestati.tsx
 * @path src/features/esporta-attestati/DialogEsportaAttestati.tsx
 * @created 2026-10-27
 * @revision 2026-10-28 20:20 - rev 2 - Conversione bottoni d'azione al componente Button unificato
 * @description Bottone «Esporta dati in Excel» e finestra con ambito, spunte corsi e contatore.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getAttestati, getTipiCorso } from "@/lib/api";
import { GRUPPI_ARGOMENTO, assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { csvElencoAttestati, filtraAttestati, nomeFileElenco, type Ambito } from "./elenco-csv";

export function DialogEsportaAttestati() {
  const [aperto, setAperto] = useState(false);
  const [tipo, setTipo] = useState<Ambito["tipo"]>("tutto");
  const [categoria, setCategoria] = useState(GRUPPI_ARGOMENTO[0]!.chiave);
  const [scelti, setScelti] = useState<Set<string>>(new Set());
  const [conPercorso, setConPercorso] = useState(false);

  const att = useQuery({ queryKey: ["export-attestati"], queryFn: () => getAttestati("Approvato"), enabled: aperto });
  const tc = useQuery({ queryKey: ["tipi-corso"], queryFn: getTipiCorso, enabled: aperto });
  const corsi = useMemo(
    () => [...(tc.data ?? [])].sort((a, b) => assegnaGruppoArgomento(a).ordine - assegnaGruppoArgomento(b).ordine || (a.codice ?? "").localeCompare(b.codice ?? "")),
    [tc.data],
  );
  const ambito: Ambito = tipo === "tutto" ? { tipo } : tipo === "categoria" ? { tipo, chiave: categoria } : { tipo, ids: scelti };
  const selezionati = useMemo(() => filtraAttestati(att.data ?? [], corsi, ambito), [att.data, corsi, tipo, categoria, scelti]); // eslint-disable-line react-hooks/exhaustive-deps

  function scarica() {
    const blob = new Blob([csvElencoAttestati(selezionati, corsi, conPercorso)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeFileElenco();
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selezionati.length} attestati esportati`);
  }
  const toggle = (id: string) => setScelti((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const caricamento = att.isLoading || tc.isLoading;

  return (
    <>
      <Button type="button" onClick={() => setAperto(true)}>
        <FileSpreadsheet className="size-4" /> Esporta dati in Excel
      </Button>
      <Dialog open={aperto} onOpenChange={setAperto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Esporta elenco attestati in Excel</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {([["tutto", "Tutto l'archivio"], ["categoria", "Per categoria"], ["corsi", "Per attestato"]] as const).map(([v, l]) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  onClick={() => setTipo(v)}
                  className={tipo === v ? "bg-emerald-600 text-white border-emerald-700 shadow-md" : ""}
                >
                  {l}
                </Button>
              ))}
            </div>
            {tipo === "categoria" && (
              <select className="w-full rounded-md border border-input bg-background px-3 py-2" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {GRUPPI_ARGOMENTO.map((g) => <option key={g.chiave} value={g.chiave}>{g.ordine}. {g.titolo}</option>)}
              </select>
            )}
            {tipo === "corsi" && (
              <div className="rounded-md border border-border">
                <div className="flex gap-2 border-b border-border p-2">
                  <Button size="sm" variant="outline" onClick={() => setScelti(new Set(corsi.map((c) => c.id)))}>Seleziona tutti</Button>
                  <Button size="sm" variant="outline" onClick={() => setScelti(new Set())}>Cancella tutte le spunte</Button>
                </div>
                <div className="max-h-64 overflow-auto">
                  {corsi.map((c) => {
                    const g = assegnaGruppoArgomento(c);
                    return (
                      <label key={c.id} className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 ${g.coloreSfondo}`}>
                        <Checkbox checked={scelti.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                        <span className="font-mono text-xs font-semibold">{c.codice ?? "—"}</span>
                        <span>— {c.nome_corso}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox checked={conPercorso} onCheckedChange={(v) => setConPercorso(v === true)} />
              Includi colonna percorso e nome file nel PC
            </label>
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 font-medium text-emerald-950 dark:text-emerald-200">
              {caricamento ? "Caricamento…" : selezionati.length ? `${selezionati.length} attestati selezionati per l'esportazione` : "Nessun attestato trovato con i criteri selezionati"}
            </div>
            <div className="flex justify-end">
              <Button onClick={scarica} disabled={caricamento || !selezionati.length}>
                {caricamento ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <FileSpreadsheet className="mr-1.5 size-4" />} Scarica Excel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
