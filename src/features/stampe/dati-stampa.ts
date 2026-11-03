// Nel tipo Modello:
export type Modello = "registro" | "gruppo" | "scadenze" | "scheda" | "reparto" | "lavoratori";

// Nei titoli modello:
export const TITOLI_MODELLO: Record<Modello, string> = {
  registro: "Registro integrale della formazione",
  gruppo: "Elenco incaricati per gruppo",
  scadenze: "Scadenzario corsi",
  scheda: "Scheda formativa individuale",
  reparto: "Report formazione per reparto",
  lavoratori: "Elenco lavoratori in servizio",
};

/** Converte l'anagrafica dei lavoratori filtrati in righe tabellari */
export function calcolaRigheLavoratori(
  dipendenti: Dipendente[],
  filtri: FiltriStampa,
  assegnazioni: AssegnazioneRuolo[] = [],
): RigaStampa[] {
  let elenco = dipendenti.filter(
    (d) => filtri.includiCessati || d.stato_lavoratore !== "cessato",
  );

  if (filtri.reparto !== TUTTI) elenco = elenco.filter((d) => d.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) elenco = elenco.filter((d) => d.sottoreparto === filtri.categoria);
  if (filtri.materia !== TUTTI) elenco = elenco.filter((d) => d.materia === filtri.materia);
  if (filtri.dipendenteId !== TUTTI) elenco = elenco.filter((d) => d.id === filtri.dipendenteId);

  if (filtri.ruoloId !== TUTTI) {
    const aventiRuolo = new Set(
      assegnazioni.filter((a) => a.ruolo_id === filtri.ruoloId).map((a) => a.dipendente_id),
    );
    elenco = elenco.filter((d) => aventiRuolo.has(d.id));
  }

  return elenco
    .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it"))
    .map((d) => ({
      id: d.id,
      dipendenteId: d.id,
      cognome: d.cognome ?? "",
      nome: d.nome ?? "",
      cf: d.codice_fiscale ?? "",
      reparto: d.reparto ?? "—",
      sottoreparto: d.sottoreparto ?? "",
      materia: d.materia ?? "",
      corso: "—",
      codice: "",
      gruppo: "",
      gruppoTitolo: "",
      ore: null,
      numero: "",
      dataCorso: d.data_inizio_rapporto ?? "",
      scadenza: null,
      stato: "senza_scadenza" as const,
      giorniAllaScadenza: null,
    }));
}
