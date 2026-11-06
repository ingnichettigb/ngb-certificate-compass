/*
 * File:      registra-nuovi.ts
 * Percorso:  src/features/dipendenti/import-elenco/registra-nuovi.ts
 * Creato:    05/11/2026
 * Registra nel database i lavoratori NUOVI di un elenco importato e riabilita
 * contestualmente i cessati selezionati dall'utente (riesumazione automatica in forza).
 * Restituisce l'esito dettagliato da mostrare a fine importazione.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 *   rev 2 — 06/11/2026 08:35 — Supporto riesumazione automatica dei già presenti cessati (idsDaRiesumare).
 */
import { getDipendenti, impostaRuoloDipendente, riabilitaDipendenti, upsertDipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { VUOTO } from "../types";
import { normalizzaCf, type RigaNuovo } from "./analisi-elenco";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";

export type VoceEsito = { id: string | null; cognome: string; nome: string; cf: string };

export type EsitoImportazione = {
  inseriti: VoceEsito[];
  presentiInForza: VoceEsito[];
  /** Con l'id, per poterli riabilitare o perché già riabilitati. */
  presentiCessati: VoceEsito[];
  riabilitatiSubito: VoceEsito[];
  nonValidi: VoceEsito[];
  doppioni: VoceEsito[];
  errori: string[];
};

const voce = (r: RigaNuovo, id: string | null = null): VoceEsito => ({ id, cognome: r.cognome, nome: r.nome, cf: r.cf });

export async function registraNuovi(opzioni: {
  righe: RigaNuovo[];
  dataInizio: string;
  ruoli: RuoloSicurezza[];
  /** ID dei lavoratori già presenti cessati da riesumare subito in servizio. */
  idsDaRiesumare?: string[];
}): Promise<EsitoImportazione> {
  const { righe, dataInizio, ruoli, idsDaRiesumare = [] } = opzioni;
  const setDaRiesumare = new Set(idsDaRiesumare);

  const esito: EsitoImportazione = {
    inseriti: [],
    presentiInForza: [],
    presentiCessati: [],
    riabilitatiSubito: [],
    nonValidi: [],
    doppioni: [],
    errori: [],
  };

  const freschi = await getDipendenti();
  const perCf = new Map(freschi.map((d) => [normalizzaCf(d.codice_fiscale), d]));
  const { ruoloBase, ruoloSpecificaMedio } = trovaRuoliNuoviIngressi(ruoli);

  // 1. Riesumazione automatica dei cessati selezionati
  if (idsDaRiesumare.length > 0) {
    try {
      await riabilitaDipendenti(idsDaRiesumare, dataInizio);
    } catch (e) {
      esito.errori.push(`Riesumazione cessati non riuscita: ${(e as Error).message}`);
    }
  }

  // 2. Elaborazione delle righe
  for (const r of righe) {
    if (r.categoria === "non_valido") {
      esito.nonValidi.push(voce(r));
      continue;
    }
    if (r.categoria === "doppione") {
      esito.doppioni.push(voce(r));
      continue;
    }

    const gia = perCf.get(r.cf);
    if (gia) {
      const v: VoceEsito = { id: gia.id, cognome: gia.cognome || r.cognome, nome: gia.nome || r.nome, cf: r.cf };
      if (gia.stato_lavoratore === "cessato") {
        if (setDaRiesumare.has(gia.id)) {
          esito.riabilitatiSubito.push(v);
        } else {
          esito.presentiCessati.push(v);
        }
      } else {
        esito.presentiInForza.push(v);
      }
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
        esito.errori.push(
          `${r.cognome} ${r.nome}: inserito, ma i corsi base/specifica non sono stati assegnati (${(e as Error).message})`,
        );
      }
    } catch (e) {
      esito.errori.push(`${r.cognome} ${r.nome}: ${(e as Error).message}`);
    }
  }

  return esito;
}
