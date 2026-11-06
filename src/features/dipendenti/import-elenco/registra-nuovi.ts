/*
 * File:      registra-nuovi.ts
 * Percorso:  src/features/dipendenti/import-elenco/registra-nuovi.ts
 * Creato:    05/11/2026
 * Registra nel database i soli lavoratori NUOVI di un elenco importato. Prima di scrivere rilegge
 * l'archivio e riconfronta ogni codice fiscale: chi risulta già presente (in forza o cessato)
 * non viene mai toccato. Restituisce l'esito da mostrare a fine importazione.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import { getDipendenti, impostaRuoloDipendente, upsertDipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { VUOTO } from "../types";
import { normalizzaCf, type RigaNuovo } from "./analisi-elenco";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";

export type VoceEsito = { id: string | null; cognome: string; nome: string; cf: string };

export type EsitoImportazione = {
  inseriti: VoceEsito[];
  presentiInForza: VoceEsito[];
  /** Con l'id, per poterli riabilitare. */
  presentiCessati: VoceEsito[];
  nonValidi: VoceEsito[];
  doppioni: VoceEsito[];
  errori: string[];
};

const voce = (r: RigaNuovo, id: string | null = null): VoceEsito => ({ id, cognome: r.cognome, nome: r.nome, cf: r.cf });

export async function registraNuovi(opzioni: {
  righe: RigaNuovo[];
  dataInizio: string;
  ruoli: RuoloSicurezza[];
}): Promise<EsitoImportazione> {
  const { righe, dataInizio, ruoli } = opzioni;
  const esito: EsitoImportazione = {
    inseriti: [], presentiInForza: [], presentiCessati: [], nonValidi: [], doppioni: [], errori: [],
  };
  const freschi = await getDipendenti();
  const perCf = new Map(freschi.map((d) => [normalizzaCf(d.codice_fiscale), d]));
  const { ruoloBase, ruoloSpecificaMedio } = trovaRuoliNuoviIngressi(ruoli);

  for (const r of righe) {
    if (r.categoria === "non_valido") { esito.nonValidi.push(voce(r)); continue; }
    if (r.categoria === "doppione") { esito.doppioni.push(voce(r)); continue; }

    const gia = perCf.get(r.cf);
    if (gia) {
      const v: VoceEsito = { id: gia.id, cognome: gia.cognome || r.cognome, nome: gia.nome || r.nome, cf: r.cf };
      (gia.stato_lavoratore === "cessato" ? esito.presentiCessati : esito.presentiInForza).push(v);
      continue;
    }

    try {
      const nuovo = await upsertDipendente({
        ...VUOTO,
        codice_fiscale: r.cf,
        cognome: r.cognome,
        nome: r.nome,
        luogo_nascita: r.luogoNascita,
        data_nascita: r.dataNascita,
        reparto: r.reparto,
        tipo_contratto: "determinato",
        data_assunzione: dataInizio,
      });
      esito.inseriti.push(voce(r, nuovo.id));
      try {
        if (ruoloBase?.id) await impostaRuoloDipendente(nuovo.id, ruoloBase.id, true);
        if (ruoloSpecificaMedio?.id) await impostaRuoloDipendente(nuovo.id, ruoloSpecificaMedio.id, true);
      } catch (e) {
        esito.errori.push(`${r.cognome} ${r.nome}: inserito, ma i corsi base/specifica non sono stati assegnati (${(e as Error).message})`);
      }
    } catch (e) {
      esito.errori.push(`${r.cognome} ${r.nome}: ${(e as Error).message}`);
    }
  }
  return esito;
}
