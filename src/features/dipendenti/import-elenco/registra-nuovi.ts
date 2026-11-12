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
 *   rev 3 — 06/11/2026 — Ai nuovi lavoratori viene assegnato l'ATECO primario della ditta.
 *   rev 4 — 11/11/2026 — Salva profilo ATA / classe di concorso dalla colonna unica e assegna i ruoli segnati con la X
 *            (Preposto, Antincendio, Primo soccorso, Defibrillatore, Addetto all'evacuazione, Privacy), anche ai già presenti
 *            in forza e ai cessati riesumati selezionati: solo aggiunta, mai rimozione. I ruoli mancanti nel catalogo si creano.
 */
import { getDitta } from "@/lib/api/ditta";
import { getDipendenti, impostaRuoloDipendente, riabilitaDipendenti, upsertDipendente } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import { VUOTO } from "../types";
import { normalizzaCf, type RigaNuovo } from "./analisi-elenco";
import { trovaRuoliNuoviIngressi } from "./ruoli-nuovi-ingressi";
import { assicuraRuoliFunzioni, chiaviSegnate, trovaRuoloFunzione, type ChiaveFunzione } from "./funzioni-sicurezza";

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
  /** Ruoli creati nel catalogo perché mancavano (es. «Referente Privacy»). */
  ruoliCreati: string[];
  /** Ruoli (X) assegnati a lavoratori già presenti in archivio. */
  ruoliAggiuntiAPresenti: number;
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
    ruoliCreati: [],
    ruoliAggiuntiAPresenti: 0,
  };

  const freschi = await getDipendenti();
  const perCf = new Map(freschi.map((d) => [normalizzaCf(d.codice_fiscale), d]));
  const { ruoloBase, ruoloSpecificaMedio } = trovaRuoliNuoviIngressi(ruoli);

  // Ruoli delle funzioni segnate con la X: si creano nel catalogo quelli che mancano.
  const richieste = new Set<ChiaveFunzione>();
  for (const r of righe) {
    if (r.categoria === "non_valido" || r.categoria === "doppione") continue;
    chiaviSegnate(r.funzioni).forEach((c) => richieste.add(c));
  }
  let catalogoFunzioni = ruoli;
  if (richieste.size > 0) {
    try {
      const agg = await assicuraRuoliFunzioni(ruoli, [...richieste]);
      catalogoFunzioni = agg.ruoli;
      esito.ruoliCreati = agg.creati;
    } catch (e) {
      esito.errori.push(`Ruoli delle funzioni non creati nel catalogo: ${(e as Error).message}`);
    }
  }

  /** Assegna al lavoratore i ruoli segnati con la X. Restituisce quanti ne ha assegnati. */
  const assegnaFunzioni = async (idDip: string, r: RigaNuovo): Promise<number> => {
    let n = 0;
    for (const chiave of chiaviSegnate(r.funzioni)) {
      const ruolo = trovaRuoloFunzione(catalogoFunzioni, chiave);
      if (!ruolo) {
        esito.errori.push(`${r.cognome} ${r.nome}: ruolo per «${chiave}» non trovato nel catalogo`);
        continue;
      }
      await impostaRuoloDipendente(idDip, ruolo.id, true);
      n++;
    }
    return n;
  };

  // ATECO primario della ditta (se la lettura fallisce si procede senza: l'importazione non si blocca).
  let atecoDitta = "";
  try {
    atecoDitta = (await getDitta()).codici_ateco?.[0]?.codice ?? "";
  } catch {
    atecoDitta = "";
  }

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
      let assegna = false;
      if (gia.stato_lavoratore === "cessato") {
        if (setDaRiesumare.has(gia.id)) {
          esito.riabilitatiSubito.push(v);
          assegna = true;
        } else {
          esito.presentiCessati.push(v);
        }
      } else {
        esito.presentiInForza.push(v);
        assegna = true;
      }
      // Funzioni con la X: solo aggiunta di ruoli (mai rimozione); il resto della scheda non viene toccato.
      if (assegna) {
        try {
          esito.ruoliAggiuntiAPresenti += await assegnaFunzioni(gia.id, r);
        } catch (e) {
          esito.errori.push(`${v.cognome} ${v.nome}: ruoli non assegnati (${(e as Error).message})`);
        }
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
        sottoreparto: r.sottorepartoAta ?? "",
        classe_concorso: r.classe ?? "",
        materia: r.materia ?? "",
        codice_ateco: atecoDitta,
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
      try {
        await assegnaFunzioni(nuovo.id, r);
      } catch (e) {
        esito.errori.push(`${r.cognome} ${r.nome}: inserito, ma i ruoli segnati con la X non sono stati assegnati (${(e as Error).message})`);
      }
    } catch (e) {
      esito.errori.push(`${r.cognome} ${r.nome}: ${(e as Error).message}`);
    }
  }

  return esito;
}
