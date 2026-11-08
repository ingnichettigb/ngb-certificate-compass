/*
 * File:      applica-aggiornamento.ts
 * Percorso:  src/features/dipendenti/import-elenco/applica-aggiornamento.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da DialogImportaElenco.tsx: scrittura sul database delle proposte selezionate (aggiornamento, cessazione, nuovo ingresso con ruoli base). Nessun cambio di comportamento.
 */
import { sb } from "@/lib/api/client";
import { upsertDipendente, impostaRuoloDipendente, registraClasseEMateria } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { VUOTO } from "../types";
import type { Proposta } from "./analisi-elenco";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";

export interface EsitoApplicazione {
  ok: number;
  errori: string[];
}

/** Applica una per una le proposte scelte e restituisce quante sono riuscite e gli errori. */
export async function applicaProposte(p: {
  scelte: Proposta[];
  ruoli: RuoloSicurezza[];
  dataFine: string;
  dataInizio: string;
}): Promise<EsitoApplicazione> {
  const { scelte, ruoli, dataFine, dataInizio } = p;
  let ok = 0;
  const errori: string[] = [];

  const { ruoloBase, ruoloSpecificaMedio } = trovaRuoliNuoviIngressi(ruoli);

  for (const p of scelte) {
    try {
      if (p.dipendenteId) {
        let upd: Record<string, unknown> = {};
        if (p.tipo === "cessazione")
          upd = { stato_lavoratore: "cessato", data_cessazione: dataFine };
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
        if (ruoloSpecificaMedio?.id)
          await impostaRuoloDipendente(nuovo.id, ruoloSpecificaMedio.id, true);
      }

      if (p.tipo === "docente") await registraClasseEMateria(p.classe, p.materia);
      ok++;
    } catch (e) {
      errori.push(`${p.cognome} ${p.nome}: ${(e as Error).message}`);
    }
  }

  return { ok, errori };
}
