/*
 * File:      SelezioneReparto.tsx
 * Percorso:  src/features/dipendenti/components/SelezioneReparto.tsx
 * Selezione del reparto del dipendente, del profilo/sottocategoria (es. ATA: AA, CS, AT, DSGA)
 * e della classe di concorso scelta dal catalogo esistente.
 * Revisioni:
 *   rev 1 — data originale — Selezione del reparto.
 *   rev 2 — 04/11/2026 07:45 — Aggiunti profilo/sottocategoria del reparto e classe di concorso
 *            modificabili, scelti solo tra i valori già censiti.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  aggiornaInsegnamentoDipendente,
  aggiornaSottorepartoDipendente,
  etichettaSottoreparto,
  getClassiConcorso,
  getReparti,
  getSottoreparti,
  repartoLeggibile,
  type Dipendente,
} from "@/lib/api";
import { NESSUNO } from "../types";

export function SelezioneReparto({
  corrente,
  repartiAttivi,
  onCambia,
}: {
  corrente: Dipendente;
  repartiAttivi: string[];
  onCambia: (valore: string) => void;
}) {
  const qc = useQueryClient();
  const { data: reparti = [] } = useQuery({ queryKey: ["reparti"], queryFn: getReparti });
  const { data: sottoreparti = [] } = useQuery({ queryKey: ["sottoreparti"], queryFn: getSottoreparti });
  const { data: classi = [] } = useQuery({ queryKey: ["classi_concorso"], queryFn: getClassiConcorso });

  const nomeReparto = (corrente.reparto ?? "").trim();
  const reparto = reparti.find((r) => r.nome.trim().toLowerCase() === nomeReparto.toLowerCase());
  const profili = reparto
    ? sottoreparti.filter((s) => s.reparto_id === reparto.id && s.attivo)
    : [];
  const valoreProfilo = (s: { codice: string | null; nome: string }) => s.codice || s.nome;
  const profiloCorrente = (corrente.sottoreparto ?? "").trim();
  const classeCorrente = (corrente.classe_concorso ?? "").trim().toUpperCase();
  const classiAttive = classi.filter((c) => c.attivo || c.codice === classeCorrente);

  const ricarica = () => qc.invalidateQueries({ queryKey: ["dipendenti"] });

  const cambiaProfilo = async (v: string) => {
    try {
      await aggiornaSottorepartoDipendente(corrente.id, v === NESSUNO ? null : v);
      toast.success("Profilo aggiornato");
      ricarica();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const cambiaClasse = async (v: string) => {
    try {
      await aggiornaInsegnamentoDipendente(
        corrente.id,
        v === NESSUNO ? null : v,
        corrente.materia ?? null,
      );
      toast.success("Classe di concorso aggiornata");
      ricarica();
      qc.invalidateQueries({ queryKey: ["classi_concorso"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <Label className="text-sm">Reparto</Label>
      <Select
        value={repartoLeggibile(corrente.reparto) ? corrente.reparto.trim() : NESSUNO}
        onValueChange={(v) => onCambia(v)}
      >
        <SelectTrigger className="w-[220px] bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NESSUNO}>Nessun reparto</SelectItem>
          {(repartoLeggibile(corrente.reparto) &&
          !repartiAttivi.includes(corrente.reparto.trim())
            ? [corrente.reparto.trim(), ...repartiAttivi]
            : repartiAttivi
          ).map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(profili.length > 0 || profiloCorrente) && (
        <>
          <Label className="text-sm">Profilo</Label>
          <Select value={profiloCorrente || NESSUNO} onValueChange={cambiaProfilo}>
            <SelectTrigger className="w-[260px] bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NESSUNO}>Nessun profilo</SelectItem>
              {profiloCorrente && !profili.some((s) => valoreProfilo(s) === profiloCorrente) && (
                <SelectItem value={profiloCorrente}>{profiloCorrente}</SelectItem>
              )}
              {profili.map((s) => (
                <SelectItem key={s.id} value={valoreProfilo(s)}>
                  {etichettaSottoreparto(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <Label className="text-sm">Classe di concorso</Label>
      <Select value={classeCorrente || NESSUNO} onValueChange={cambiaClasse}>
        <SelectTrigger className="w-[260px] bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NESSUNO}>Nessuna classe</SelectItem>
          {classeCorrente && !classiAttive.some((c) => c.codice === classeCorrente) && (
            <SelectItem value={classeCorrente}>{classeCorrente}</SelectItem>
          )}
          {classiAttive.map((c) => (
            <SelectItem key={c.id} value={c.codice}>
              {c.denominazione ? `${c.codice} — ${c.denominazione}` : c.codice}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
