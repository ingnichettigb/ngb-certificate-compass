/*
 * File:          MatriceAbilitazioniRuoli.tsx
 * Percorso:      src/features/dipendenti/matrice/MatriceAbilitazioniRuoli.tsx
 * Data creazione: 2026-10-28
 * Revisioni:
 *   - Rev 1 (2026-10-28 20:35): Creazione matrice globale abilitazioni e ruoli con intestazione fissa,
 *     scroll orizzontale ancorato a fondo schermo, riga attiva evidenziata e 9 colonne di sicurezza.
 */
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileCheck, Loader2, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  type Dipendente,
  type RuoloSicurezza,
  type AssegnazioneRuolo,
  type Attestato,
  impostaRuoloDipendente,
  aggiungiRuolo,
} from "@/lib/api";

export interface ColonnaAbilitazione {
  id: string;
  titolo: string;
  ruoloNome: string;
  chiaveCorso: string;
  descrizioneBreve?: string;
}

export const COLONNE_ABILITAZIONI: ColonnaAbilitazione[] = [
  { id: "gen", titolo: "Formazione Generale", ruoloNome: "Lavoratore", chiaveCorso: "Generale" },
  { id: "spe", titolo: "Formazione Specifica", ruoloNome: "Formazione Specifica", chiaveCorso: "Specifica" },
  { id: "ant", titolo: "Antincendio", ruoloNome: "Addetto Antincendio", chiaveCorso: "Antincendio" },
  { id: "pso", titolo: "Primo Soccorso", ruoloNome: "Addetto Primo Soccorso", chiaveCorso: "Primo Soccorso" },
  { id: "pre", titolo: "Preposti", ruoloNome: "Preposto", chiaveCorso: "Preposto" },
  { id: "eva", titolo: "Evacuazione", ruoloNome: "Addetto Evacuazione", chiaveCorso: "Evacuazione" },
  { id: "bls", titolo: "Defibrillatore", ruoloNome: "Addetto BLSD / Defibrillatore", chiaveCorso: "Defibrillatore" },
  { id: "rls", titolo: "RLS", ruoloNome: "RLS", chiaveCorso: "RLS" },
  { id: "asp", titolo: "ASPP", ruoloNome: "ASPP", chiaveCorso: "ASPP" },
];

export function MatriceAbilitazioniRuoli({
  open,
  onChiudi,
  dipendenti,
  ruoliCatalogo,
  assegnazioni,
  attestati,
}: {
  open: boolean;
  onChiudi: () => void;
  dipendenti: Dipendente[];
  ruoliCatalogo: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  attestati: Attestato[];
}) {
  const qc = useQueryClient();
  const [ricerca, setRicerca] = useState("");
  const [rigaSelezionata, setRigaSelezionata] = useState<string | null>(null);
  const [inSalvataggio, setInSalvataggio] = useState<string | null>(null);

  // Mappa ruoloNome -> RuoloSicurezza per lookup immediato
  const mappaRuoli = useMemo(() => {
    const map = new Map<string, RuoloSicurezza>();
    ruoliCatalogo.forEach((r) => {
      map.set(r.nome.toLowerCase().trim(), r);
    });
    return map;
  }, [ruoliCatalogo]);

  // Filtro rapido lavoratori
  const listaFiltrata = useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    if (!q) return dipendenti;
    return dipendenti.filter((d) => {
      const nomeCompleto = `${d.cognome || ""} ${d.nome || ""}`.toLowerCase();
      const funzione = `${d.reparto || ""} ${d.sottoreparto || ""} ${d.materia || ""}`.toLowerCase();
      return nomeCompleto.includes(q) || funzione.includes(q);
    });
  }, [dipendenti, ricerca]);

  // Controlla se il lavoratore ha il ruolo assegnato
  const haRuolo = (dipendenteId: string, colonna: ColonnaAbilitazione): boolean => {
    const ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
    if (!ruoloTrovato) return false;
    if (ruoloTrovato.obbligatorio_tutti) return true;
    return assegnazioni.some((a) => a.dipendente_id === dipendenteId && a.ruolo_id === ruoloTrovato.id);
  };

  // Controlla se il lavoratore ha già un attestato valido per quel corso
  const haAttestatoValido = (dipendenteId: string, colonna: ColonnaAbilitazione): boolean => {
    return attestati.some(
      (att) =>
        att.dipendente_id === dipendenteId &&
        att.tipo &&
        att.tipo.toLowerCase().includes(colonna.chiaveCorso.toLowerCase()),
    );
  };

  // Toggle abilitazione
  async function toggleAbilitazione(dipendente: Dipendente, colonna: ColonnaAbilitazione, e: React.MouseEvent) {
    e.stopPropagation();
    const chiaveOp = `${dipendente.id}-${colonna.id}`;
    if (inSalvataggio === chiaveOp) return;

    let ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());

    // Se il ruolo non esiste ancora nel DB, lo creiamo al volo
    if (!ruoloTrovato) {
      try {
        setInSalvataggio(chiaveOp);
        await aggiungiRuolo({
          nome: colonna.ruoloNome,
          macro_categoria: colonna.titolo,
          obbligatorio_tutti: false,
          ordine: ruoliCatalogo.length + 1,
        });
        await qc.invalidateQueries({ queryKey: ["ruoli-sicurezza"] });
        ruoloTrovato = mappaRuoli.get(colonna.ruoloNome.toLowerCase().trim());
      } catch (err) {
        toast.error("Impossibile inizializzare il ruolo", { description: (err as Error).message });
        setInSalvataggio(null);
        return;
      }
    }

    if (!ruoloTrovato) {
      setInSalvataggio(null);
      return;
    }

    if (ruoloTrovato.obbligatorio_tutti) {
      toast.info(`"${colonna.titolo}" è obbligatorio per tutti i lavoratori.`);
      setInSalvataggio(null);
      return;
    }

    const giaAssegnato = haRuolo(dipendente.id, colonna);
    setInSalvataggio(chiaveOp);
    try {
      await impostaRuoloDipendente(dipendente.id, ruoloTrovato.id, !giaAssegnato);
      await qc.invalidateQueries({ queryKey: ["dipendenti-ruoli"] });
      toast.success(
        !giaAssegnato
          ? `Abilitato: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`
          : `Disabilitato: ${colonna.titolo} per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (err) {
      toast.error("Errore salvataggio", { description: (err as Error).message });
    } finally {
      setInSalvataggio(null);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-background text-foreground">
      {/* 1. Barra superiore comandi e ricerca */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onChiudi} className="gap-1.5">
            <ArrowLeft className="size-4" /> Torna
          </Button>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Users className="size-4" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight">Matrice Abilitazioni e Ruoli Sicurezza</h1>
              <p className="text-xs text-muted-foreground">
                {listaFiltrata.length} di {dipendenti.length} lavoratori visibili
              </p>
            </div>
          </div>
        </div>

        {/* Ricerca immediata */}
        <div className="flex items-center gap-2">
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cerca cognome, nome, reparto..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="pl-9 pr-8"
            />
            {ricerca && (
              <button
                type="button"
                onClick={() => setRicerca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Area Tabella con altezza bloccata e scrollbar orizzontale SEMPRE a fondo schermo */}
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
          {/* Intestazione fissa sticky in alto */}
          <thead className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm">
            <tr className="divide-x divide-border">
              {/* Colonne identificative fisse a sinistra */}
              <th className="sticky left-0 z-30 min-w-[220px] bg-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                Cognome e Nome
              </th>
              <th className="min-w-[170px] bg-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Funzione / Reparto
              </th>
              <th className="min-w-[160px] bg-surface px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Ruolo Aziendale
              </th>

              {/* 9 Colonne Abilitazioni */}
              {COLONNE_ABILITAZIONI.map((col) => {
                const totaliAbilitati = dipendenti.filter((d) => haRuolo(d.id, col)).length;
                return (
                  <th
                    key={col.id}
                    className="min-w-[110px] bg-surface px-2 py-3 text-center text-xs font-bold tracking-tight text-foreground"
                  >
                    <div className="truncate font-semibold">{col.titolo}</div>
                    <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                      {totaliAbilitati} abilitati
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Righe Lavoratori */}
          <tbody className="divide-y divide-border">
            {listaFiltrata.length === 0 ? (
              <tr>
                <td colSpan={3 + COLONNE_ABILITAZIONI.length} className="p-12 text-center text-muted-foreground">
                  Nessun lavoratore corrisponde ai criteri di ricerca.
                </td>
              </tr>
            ) : (
              listaFiltrata.map((dip) => {
                const isAttiva = rigaSelezionata === dip.id;
                const funzione = [dip.reparto, dip.sottoreparto, dip.materia].filter(Boolean).join(" - ") || "—";
                const ruoloAziendale = dip.classe_concorso || "Lavoratore";

                return (
                  <tr
                    key={dip.id}
                    onClick={() => setRigaSelezionata(dip.id)}
                    className={`cursor-pointer divide-x divide-border transition-colors ${
                      isAttiva
                        ? "bg-emerald-500/15 ring-2 ring-inset ring-emerald-500/60"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {/* Cognome e Nome bloccato a sinistra */}
                    <td
                      className={`sticky left-0 z-10 px-4 py-2.5 font-semibold text-foreground shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${
                        isAttiva ? "bg-emerald-500/20" : "bg-surface"
                      }`}
                    >
                      <div className="truncate">
                        {dip.cognome} {dip.nome}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{dip.codice_fiscale}</div>
                    </td>

                    {/* Funzione */}
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="truncate max-w-[200px]" title={funzione}>
                        {funzione}
                      </div>
                    </td>

                    {/* Ruolo */}
                    <td className="px-4 py-2.5 text-xs">
                      <span className="inline-flex items-center rounded-md border border-border bg-muted/60 px-2 py-0.5 font-medium">
                        {ruoloAziendale}
                      </span>
                    </td>

                    {/* 9 Colonne Caselle di Spunta */}
                    {COLONNE_ABILITAZIONI.map((col) => {
                      const attivo = haRuolo(dip.id, col);
                      const haAttestato = haAttestatoValido(dip.id, col);
                      const chiaveOp = `${dip.id}-${col.id}`;
                      const isBusy = inSalvataggio === chiaveOp;

                      return (
                        <td
                          key={col.id}
                          className="px-2 py-2 text-center"
                          onClick={(e) => toggleAbilitazione(dip, col, e)}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isBusy ? (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={attivo}
                                onChange={() => {}}
                                className="size-4 cursor-pointer rounded accent-emerald-600"
                              />
                            )}

                            {/* Badge visivo se l'attestato è già presente a sistema */}
                            {haAttestato && (
                              <span title="Attestato già registrato nel sistema">
                                <FileCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Didascalia informativa in basso */}
      <footer className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-6 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-emerald-600 bg-emerald-600" /> Abilitato / Incaricato
          </span>
          <span className="flex items-center gap-1.5">
            <FileCheck className="size-3.5 text-emerald-600" /> Attestato già presente in archivio
          </span>
          <span>Clicca su qualsiasi riga per evidenziarla</span>
        </div>
        <div>
          Totale dipendenti: <strong>{dipendenti.length}</strong>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
