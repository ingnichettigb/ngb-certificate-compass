/*
 * File:      DettaglioAttestato.tsx
 * Percorso:  src/features/hr/components/DettaglioAttestato.tsx
 * Dettaglio di un attestato da validare: dati, correzioni, opzione email, azioni e immagini.
 */
import { ImageViewer } from "@/components/ImageViewer";
import { type Attestato } from "@/lib/api";
import { AnagraficaAttestato } from "./AnagraficaAttestato";
import { CampiValidazione } from "./CampiValidazione";
import { OpzioneEmail } from "./OpzioneEmail";
import { AzioniValidazione } from "./AzioniValidazione";
import { useDecisioneAttestato } from "../hooks/useDecisioneAttestato";

export function DettaglioAttestato({
  attestato,
  corsi,
  onChanged,
}: {
  attestato: Attestato;
  corsi: { id: string; nome_corso: string; macro_categoria: string }[];
  onChanged: () => void;
}) {
  const decisione = useDecisioneAttestato({ attestato, onChanged });
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
        />
      </div>

      <div>
        <ImageViewer fronte={attestato.url_foto_fronte} retro={attestato.url_foto_retro} />
      </div>
    </section>
  );
}
