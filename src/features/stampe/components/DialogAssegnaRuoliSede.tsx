/*
 * File:      DialogAssegnaRuoliSede.tsx
 * Percorso:  src/features/stampe/components/DialogAssegnaRuoliSede.tsx
 * Data creaz: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 — Finestra per assegnare i lavoratori alle squadre di emergenza distinguendo la sede (plesso).
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckSquare, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Dipendente } from "@/lib/api";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  impostaRuoloDipendente,
  type AssegnazioneRuolo,
  type RuoloSicurezza,
} from "@/lib/api/ruoli";
import { CHIAVE_SEDI, getSedi } from "@/lib/api/sedi";

interface Props {
  aperto: boolean;
  onChiudi: () => void;
  dipendenti: Dipendente[];
  ruoli: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  /** Sede preselezionata all'apertura (di norma quella mostrata nella tavola). */
  sedeIniziale?: string | undefined;
}

export function DialogAssegnaRuoliSede({ aperto, onChiudi, dipendenti, ruoli, assegnazioni, sedeIniziale }: Props) {
  const qc = useQueryClient();
  const { data: sedi = [] } = useQuery({ queryKey: CHIAVE_SEDI, queryFn: getSedi });
  const ruoliSquadra = useMemo(() => ruoli.filter((r) => r.attivo && !r.obbligatorio_tutti), [ruoli]);

  const [sedeScelta, setSedeScelta] = useState("");
  const [ruoloScelto, setRuoloScelto] = useState("");
  const [filtroNome, setFiltroNome] = useState("");

  // A ogni apertura riparte dalla sede della tavola
  useEffect(() => {
    if (aperto && sedeIniziale) setSedeScelta(sedeIniziale);
  }, [aperto, sedeIniziale]);

  const sedeAttiva = sedeScelta || sedi.find((s) => s.is_principale)?.id || sedi[0]?.id || "";
  const ruoloAttivo = ruoloScelto || ruoliSquadra[0]?.id || "";

  const lavoratori = dipendenti
    .filter((d) => d.stato_lavoratore !== "cessato")
    .filter((d) => `${d.cognome} ${d.nome ?? ""}`.toLowerCase().includes(filtroNome.trim().toLowerCase()))
    .sort((a, b) => a.cognome.localeCompare(b.cognome, "it"));

  const handleToggle = async (dipendenteId: string, checked: boolean) => {
    if (!sedeAttiva || !ruoloAttivo) return;
    try {
      await impostaRuoloDipendente(dipendenteId, ruoloAttivo, checked, sedeAttiva);
      await qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI });
    } catch (e) {
      toast.error(`Errore assegnazione: ${(e as Error).message}`);
    }
  };

  return (
    <Dialog open={aperto} onOpenChange={(o) => !o && onChiudi()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" /> Squadre di emergenza per sede
          </DialogTitle>
          <DialogDescription>
            Scegli sede e ruolo, poi spunta i lavoratori incaricati in quella sede. Un lavoratore può avere lo stesso incarico in più sedi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Building2 className="size-3.5" /> Sede / plesso
            </Label>
            <Select value={sedeAttiva} onValueChange={setSedeScelta}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli sede…" />
              </SelectTrigger>
              <SelectContent>
                {sedi.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}{s.is_principale ? " (principale)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <CheckSquare className="size-3.5" /> Ruolo / squadra
            </Label>
            <Select value={ruoloAttivo} onValueChange={setRuoloScelto}>
              <SelectTrigger>
                <SelectValue placeholder="Scegli ruolo…" />
              </SelectTrigger>
              <SelectContent>
                {ruoliSquadra.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Input
          placeholder="Cerca lavoratore per cognome o nome…"
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
          className="mb-2"
        />

        <div className="flex-1 divide-y overflow-y-auto rounded-md border">
          {lavoratori.map((d) => {
            const qui = assegnazioni.some((a) => a.dipendente_id === d.id && a.ruolo_id === ruoloAttivo && a.sede_id === sedeAttiva);
            const altreSedi = assegnazioni
              .filter((a) => a.dipendente_id === d.id && a.ruolo_id === ruoloAttivo && a.sede_id !== sedeAttiva)
              .map((a) => sedi.find((s) => s.id === a.sede_id)?.nome)
              .filter(Boolean);
            return (
              <label key={d.id} className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-muted/50">
                <div className="flex items-center gap-2.5">
                  <Checkbox checked={qui} onCheckedChange={(v) => handleToggle(d.id, v === true)} />
                  <span className="font-medium">
                    {d.cognome} {d.nome}
                  </span>
                  {d.reparto && <span className="text-xs text-muted-foreground">({d.reparto})</span>}
                </div>
                {altreSedi.length > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">Anche in: {altreSedi.join(", ")}</span>
                )}
              </label>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
