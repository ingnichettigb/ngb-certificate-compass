/*
 * File:      obblighi-matrice.ts
 * Percorso:  src/features/scadenze/obblighi-matrice.ts
 * Revisione: 1 — 28/11/2026 10:01
 * Data creazione: 28/11/2026 10:01
 * Valutatore degli obblighi formativi usato dalla pagina Scadenze (vista «Da formare / Mancanti»).
 * Risponde alle stesse tre domande della matrice «Piano Fabbisogno Formativo e Ruoli» con le stesse funzioni di base
 * (isCorsoObbligatorioPerDipendente, mappaValiditaRspp, valutaFormazioneDelDipendente): la matrice resta l'unica fonte di verità
 * e qui non c'è nessuna regola nuova. Funzioni pure, senza accesso al database.
 *   - haObbligoCorso: il corso è dovuto al lavoratore (casella «!», verde o grigia della matrice);
 *   - motivoEsenzione: il corso non è dovuto perché l'RSPP è valido (casella «E»);
 *   - motivoInAttesa: il corso è dovuto ma in attesa della formazione Lavoratore (casella grigia «…»).
 * Revisioni:
 * - Rev 1 (28/11/2026 10:01): Prima stesura.
 */
import type { AssegnazioneRuolo, Attestato, RuoloSicurezza, TipoCorso } from "@/lib/api";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import type { ContestoRegole } from "@/features/dipendenti/matrice/condizioni-regole";
import {
  isCorsoObbligatorioPerDipendente,
  trovaRuoloPerCorso,
} from "@/features/dipendenti/matrice/mappatura-ruoli-corsi";
import {
  motivoInAttesaFormazione,
  valutaFormazioneDelDipendente,
  type EsitoFormazioneLavoratore,
} from "@/features/dipendenti/formazione-lavoratore";
import { eAggiornamentoPreposto, mappaValiditaRspp, motivoEsenzioneRspp, oggiIso } from "./esenzioni-rspp";

export interface ParametriObblighi {
  attestati: Attestato[];
  assegnazioni: AssegnazioneRuolo[];
  ruoli: RuoloSicurezza[];
  /** Tabella 02 (undefined = non ancora caricata: vale il riconoscimento di prima, come nella matrice). */
  regole: RegolaRuoloCorso[] | undefined;
  contesto: ContestoRegole;
  oggi?: Date;
}

export interface ValutatoreObblighi {
  haObbligoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  motivoEsenzione: (dipendenteId: string, corso: TipoCorso) => string | null;
  motivoInAttesa: (dipendenteId: string, corso: TipoCorso) => string | null;
}

export function creaValutatoreObblighi({
  attestati,
  assegnazioni,
  ruoli,
  regole,
  contesto,
  oggi = new Date(),
}: ParametriObblighi): ValutatoreObblighi {
  const mappaAssegnazioni = new Set<string>();
  for (const a of assegnazioni) mappaAssegnazioni.add(`${a.dipendente_id}_${a.ruolo_id}`);

  // Lavoratori con RSPP valido: non devono fare l'aggiornamento Preposto (il corso base resta obbligatorio)
  const rsppValidi = mappaValiditaRspp(attestati, oggiIso(oggi));

  // Formazione Lavoratore di ogni lavoratore, calcolata solo quando serve e una volta sola
  const formazione = new Map<string, EsitoFormazioneLavoratore>();

  return {
    haObbligoCorso(dipendenteId, corso) {
      return isCorsoObbligatorioPerDipendente(
        dipendenteId,
        corso,
        ruoli,
        mappaAssegnazioni,
        rsppValidi.get(dipendenteId) ?? null,
        regole,
        contesto,
      );
    },
    motivoEsenzione(dipendenteId, corso) {
      const v = rsppValidi.get(dipendenteId);
      return v && eAggiornamentoPreposto(corso) ? motivoEsenzioneRspp(v) : null;
    },
    motivoInAttesa(dipendenteId, corso) {
      if (!regole || regole.length === 0) return null;
      const ruolo = trovaRuoloPerCorso(corso, ruoli, regole);
      if (!ruolo?.richiede) return null;
      let esito = formazione.get(dipendenteId);
      if (!esito) {
        esito = valutaFormazioneDelDipendente({ attestati, dipendenteId, regole, contesto });
        formazione.set(dipendenteId, esito);
      }
      return motivoInAttesaFormazione(ruolo, esito);
    },
  };
}
