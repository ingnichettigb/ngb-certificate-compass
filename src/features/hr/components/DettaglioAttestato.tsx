/*
 * File:          DettaglioAttestato.tsx
 * Percorso:      src/features/hr/components/DettaglioAttestato.tsx
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Creazione pannello dettaglio attestato HR con form e anteprima.
 *   - Rev 2 (2026-10-28 11:35): Collegamento dell'azione onScollegaLink per rimuovere link non validi.
 *   - Rev 3 (2026-10-28 11:22): Supporto codice corso per i filtri rapidi in CampiValidazione.
 *   - Rev 4 (2026-10-28 11:50): Popup «Approva in attesa di integrazione».
 *   - Rev 5 (2026-10-28 14:15): Collegamento azione onApprovaERinomina per rinomina e sostituzione link.
 */
import { ImageViewer } from "@/components/ImageViewer";
import { type Attestato, type TipoCorso } from "@/lib/api";
import { AnagraficaAttestato } from "./AnagraficaAttestato";
import { CampiValidazione } from "./CampiValidazione";
import { OpzioneEmail } from "./OpzioneEmail";
import { AzioniValidazione } from "./AzioniValidazione";
import { DialogIntegrazioneAselli } from "./DialogIntegrazioneAselli";
import { useDecisioneAttestato } from "../hooks/useDecisioneAttestato";

export function DettaglioAttestato({
  attestato,
  corsi,
  onChanged,
}: {
  attestato: Attestato;
  corsi: TipoCorso[];
  onChanged: () => void;
}) {
  const decisione = useDecisioneAttestato({ attestato, corsi, onChanged });
  const d = attestato.dipendenti;

  return (
    <section className="grid gap-5 rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] xl:grid-cols-2">
      <div className="space-y-5">
        <AnagraficaAttestato attestato={attestato} />
        <CampiValidazione
          corsi={corsi}
          tipoCorsoId={decisione.tipoCorsoId}
          setTipoCorsoId={decisione.setTipoCorsoId}
          dataCorso={decisione.dataCorso}
          setDataCorso={decisione.setDataCorso}
          ore={decisione.ore}
          setOre={decisione.setOre}
          mostraNote={decisione.mostraNote}
          note={decisione.note}
          setNote={decisione.setNote}
        />
        <OpzioneEmail
          email={d?.email}
          haEmail={decisione.haEmail}
          inviaEmail={decisione.inviaEmail}
          setInviaEmail={decisione.setInviaEmail}
          busy={decisione.busy}
        />
        <AzioniValidazione
          attestato={attestato}
          busy={decisione.busy}
          haEmail={decisione.haEmail}
          mostraNote={decisione.mostraNote}
          setMostraNote={decisione.setMostraNote}
          onDecidi={decisione.decidi}
          onApprovaERinomina={decisione.approvaERinomina}
          onScollegaLink={decisione.scollegaLink}
          onApriIntegrazione={() => decisione.setDialogIntegrazione(true)}
        />
      </div>

      <div>
        <ImageViewer fronte={attestato.url_foto_fronte} retro={attestato.url_foto_retro} />
      </div>

      {decisione.dialogIntegrazione && (
        <DialogIntegrazioneAselli
          open
          onOpenChange={decisione.setDialogIntegrazione}
          attestato={attestato}
          busy={decisione.busy}
          haEmail={decisione.haEmail}
          onConferma={decisione.confermaIntegrazione}
        />
      )}
    </section>
  );
}
