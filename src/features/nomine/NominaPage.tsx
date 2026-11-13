/*
 * File:      NominaPage.tsx
 * Percorso:  src/features/nomine/NominaPage.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Una nomina: indice dei nominati a fianco, anteprima della lettera, modifica del testo, PDF (di uno o di tutti i selezionati).
 */
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileDown, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdentitaDitta } from "@/components/IdentitaDitta";
import { nomeFileEsportazione } from "@/features/stampe/esporta-file";
import {
  CHIAVE_MODELLI_NOMINA,
  ripristinaModelloNomina,
  salvaModelloNomina,
} from "@/lib/api/modelli-nomina";
import { annoScolastico, costruisciDocumento, dataItaliana } from "./documento";
import { generaPdfNomine } from "./genera-pdf";
import { useDatiNomine } from "./hooks/useDatiNomine";
import { candidatiManuali, nomeLettera, nominatiDaOrganigramma, type Nominato } from "./nominativi";
import { modelloDefault } from "./modelli-default";
import { voceElenco, type ModelloNomina } from "./tipi";
import { EditorModello } from "./components/EditorModello";
import { FoglioNomina } from "./components/FoglioNomina";
import { IndiceNominati } from "./components/IndiceNominati";

function scaricaBlob(bytes: Uint8Array, nome: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function NominaPage({ tipo }: { tipo: string }) {
  const voce = voceElenco(tipo);
  const qc = useQueryClient();
  const { ditta, organigramma, modelli, caricamento, errore } = useDatiNomine();

  const [bozza, setBozza] = useState<ModelloNomina | null>(null);
  const [protocollo, setProtocollo] = useState("");
  /** Numero della prima lettera (es. 167): le altre proseguono 168, 169… Vuoto = nessun numero sulla lettera. */
  const [numeroIniziale, setNumeroIniziale] = useState("");
  const [senzaTitolo, setSenzaTitolo] = useState(false);
  const [anno, setAnno] = useState(() => annoScolastico());
  const [data, setData] = useState(() => dataItaliana());
  const [extra, setExtra] = useState<Nominato[]>([]);
  const [esclusi, setEsclusi] = useState<Set<string>>(new Set());
  const [attivoId, setAttivoId] = useState<string | null>(null);
  const [occupato, setOccupato] = useState(false);

  const salvato = modelli && voce ? modelli[voce.tipo] : undefined;
  useEffect(() => {
    if (salvato) setBozza(salvato);
  }, [salvato]);

  const daOrganigramma = useMemo(
    () => (voce ? nominatiDaOrganigramma(voce, organigramma) : []),
    [voce, organigramma],
  );
  const nominati = useMemo(() => [...daOrganigramma, ...extra], [daOrganigramma, extra]);
  const candidati = useMemo(
    () => candidatiManuali(organigramma.dipendenti, nominati),
    [organigramma.dipendenti, nominati],
  );
  const selezionati = useMemo(
    () => new Set(nominati.filter((n) => !esclusi.has(n.id)).map((n) => n.id)),
    [nominati, esclusi],
  );
  const attivo = nominati.find((n) => n.id === attivoId) ?? nominati[0] ?? null;
  const numeroDi = (id: string | undefined): string | undefined => {
    const base = Number.parseInt(numeroIniziale, 10);
    if (!Number.isFinite(base) || base < 0 || !id) return undefined;
    const pos = nominati.filter((n) => selezionati.has(n.id)).findIndex((n) => n.id === id);
    return String(base + Math.max(0, pos));
  };

  if (!voce) {
    return (
      <main className="p-6">
        <p>Nomina non trovata.</p>
        <Link to="/nomine" className="text-primary underline">
          Torna alle nomine
        </Link>
      </main>
    );
  }

  const modificato =
    !!bozza &&
    !!salvato &&
    JSON.stringify({ ...bozza, updated_at: null }) !==
      JSON.stringify({ ...salvato, updated_at: null });
  const blocchi = bozza
    ? costruisciDocumento(bozza, ditta, {
        nome: attivo ? nomeLettera(attivo, !senzaTitolo) : "Cognome Nome",
        ...(numeroDi(attivo?.id) ? { numero: numeroDi(attivo?.id)! } : {}),
        protocollo,
        anno,
        data,
      })
    : [];

  const salva = async () => {
    if (!bozza) return;
    try {
      await salvaModelloNomina(bozza);
      await qc.invalidateQueries({ queryKey: CHIAVE_MODELLI_NOMINA });
      toast.success("Testo della nomina salvato");
    } catch (e) {
      toast.error(
        `Salvataggio non riuscito: ${e instanceof Error ? e.message : "errore del database"}. Se la tabella non esiste, applica la migration 0010.`,
      );
    }
  };
  const ripristina = async () => {
    try {
      await ripristinaModelloNomina(voce.tipo);
    } catch {
      /* riga assente o tabella non creata: si torna comunque al testo di partenza */
    }
    setBozza(modelloDefault(voce.tipo));
    await qc.invalidateQueries({ queryKey: CHIAVE_MODELLI_NOMINA });
    toast.success("Ripristinato il testo di partenza");
  };
  const pdf = async (elenco: Nominato[]) => {
    if (!bozza || !elenco.length) return;
    setOccupato(true);
    try {
      const bytes = await generaPdfNomine(
        bozza,
        ditta,
        elenco.map((n) => ({
          nome: nomeLettera(n, !senzaTitolo),
          protocollo,
          ...(numeroDi(n.id) ? { numero: numeroDi(n.id)! } : {}),
        })),
        { anno, data },
      );
      scaricaBlob(
        bytes,
        nomeFileEsportazione(
          `Nomina_${voce.tipo}${elenco.length === 1 ? "_" + elenco[0]?.nome.replace(/\s+/g, "_") : ""}`,
          "pdf",
        ),
      );
    } catch (e) {
      toast.error(`PDF non generato: ${e instanceof Error ? e.message : "errore"}`);
    } finally {
      setOccupato(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/nomine"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Torna alle nomine"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <h1 className="text-lg font-semibold">Nomina — {voce.label}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IdentitaDitta compatta />
            <Button
              variant="outline"
              onClick={() => attivo && pdf([attivo])}
              disabled={!attivo || !bozza || occupato}
            >
              <FileDown className="size-4" /> PDF di {attivo ? "questo nominato" : "—"}
            </Button>
            <Button
              onClick={() => pdf(nominati.filter((n) => selezionati.has(n.id)))}
              disabled={!selezionati.size || !bozza || occupato}
            >
              <FileDown className="size-4" /> PDF dei selezionati ({selezionati.size})
            </Button>
          </div>
        </div>
      </header>

      {errore && (
        <p className="mx-auto max-w-[1500px] px-5 pt-3 text-sm text-destructive">
          Dati non caricati: {errore instanceof Error ? errore.message : "errore"}
        </p>
      )}

      <main className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <section className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-3">
            <div className="space-y-1">
              <Label htmlFor="n-prot" className="text-xs">
                Protocollo
              </Label>
              <Input
                id="n-prot"
                value={protocollo}
                onChange={(e) => setProtocollo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="n-anno" className="text-xs">
                Anno
              </Label>
              <Input id="n-anno" value={anno} onChange={(e) => setAnno(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="n-data" className="text-xs">
                Data
              </Label>
              <Input id="n-data" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="n-num" className="text-xs">
                N° prima lettera
              </Label>
              <Input
                id="n-num"
                inputMode="numeric"
                placeholder="es. 167"
                value={numeroIniziale}
                onChange={(e) => setNumeroIniziale(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <label className="col-span-2 flex items-end gap-2 pb-2 text-xs">
              <input
                type="checkbox"
                checked={senzaTitolo}
                onChange={(e) => setSenzaTitolo(e.target.checked)}
              />
              Senza «Prof.» / «Prof.ssa» davanti al nome
            </label>
          </section>
          <IndiceNominati
            nominati={nominati}
            selezionati={selezionati}
            attivo={attivo?.id ?? null}
            candidati={candidati}
            onAttivo={setAttivoId}
            onSpunta={(id, v) =>
              setEsclusi((prev) => {
                const s = new Set(prev);
                if (v) s.delete(id);
                else s.add(id);
                return s;
              })
            }
            onTutti={(v) => setEsclusi(v ? new Set() : new Set(nominati.map((n) => n.id)))}
            onAggiungi={(n) => {
              setExtra((prev) => [...prev, n]);
              setAttivoId(n.id);
            }}
          />
        </div>

        <section className="min-w-0">
          {caricamento || !bozza ? (
            <p className="p-6 text-sm text-muted-foreground">Caricamento…</p>
          ) : (
            <Tabs defaultValue="anteprima">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="anteprima">Anteprima</TabsTrigger>
                  <TabsTrigger value="testo">Modifica testo{modificato ? " •" : ""}</TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={ripristina}>
                    <RotateCcw className="size-4" /> Testo di partenza
                  </Button>
                  <Button size="sm" onClick={salva} disabled={!modificato}>
                    <Save className="size-4" /> Salva testo
                  </Button>
                </div>
              </div>
              <TabsContent value="anteprima" className="rounded-lg bg-muted p-4">
                <FoglioNomina ditta={ditta} blocchi={blocchi} />
              </TabsContent>
              <TabsContent value="testo" className="rounded-lg border border-border bg-card p-4">
                <EditorModello modello={bozza} onCambia={setBozza} />
              </TabsContent>
            </Tabs>
          )}
        </section>
      </main>
    </div>
  );
}
