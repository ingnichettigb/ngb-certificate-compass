/*
 * File:      OperatorePage.tsx
 * Percorso:  src/features/operatore/OperatorePage.tsx
 * Postazione Operatore: compone i blocchi grafici con la logica degli hook.
 */
import { IntestazioneOperatore } from "./components/IntestazioneOperatore";
import { PannelloDocumento } from "./components/PannelloDocumento";
import { ModuloDati } from "./components/ModuloDati";
import { CodaLavoro } from "./components/CodaLavoro";
import { ModaleEmail } from "./components/ModaleEmail";
import { salvaLocale } from "./azioni-file";
import { useArchiviazione } from "./hooks/useArchiviazione";
import { useCodaLavoro } from "./hooks/useCodaLavoro";
import { useDocumento } from "./hooks/useDocumento";
import { useFormRiga } from "./hooks/useFormRiga";
import { useInvioEmail } from "./hooks/useInvioEmail";
import { useLetturaAi } from "./hooks/useLetturaAi";
import { useSalvataggioCoda } from "./hooks/useSalvataggioCoda";
import { useTipiCorso } from "./hooks/useTipiCorso";

export function OperatorePage() {
  const tipi = useTipiCorso();
  const formRiga = useFormRiga();
  const documento = useDocumento();
  const coda = useCodaLavoro();
  const { aiAttiva, lettura, scegliFile } = useLetturaAi({ tipi, formRiga, documento });
  const { archiviando, archivia } = useArchiviazione(coda.ricarica);

  /** Svuota modulo e documento. */
  function nuovo() {
    formRiga.resetForm();
    documento.resetDocumento();
  }

  const { salvando, salvaInCoda, modifica, duplica, cancella } = useSalvataggioCoda({
    formRiga,
    documento,
    righeCoda: coda.righeCoda,
    ricarica: coda.ricarica,
    archivia,
    nuovo,
  });
  const { modaleEmail, setModaleEmail, inviandoEmail, preparaInvioEmail, confermaEInviaEmail } = useInvioEmail(coda.ricarica);

  const { form, set, idInModifica, campoOcr, setCampoOcr, incollaOcr, copiaSoloAnagrafica } = formRiga;
  const { file, anteprima, anteprimaMime, totPagine, pagine, setPagine } = documento;
  const { righeCoda, selezionati, setSelezionati, toggleSel, selezione, daArchiviare } = coda;

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <IntestazioneOperatore onFile={scegliFile} />

      {/* Area di Lavoro Split Screen */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PannelloDocumento
          file={file}
          anteprima={anteprima}
          anteprimaMime={anteprimaMime}
          totPagine={totPagine}
          lettura={lettura}
          nomeAi={aiAttiva.name}
          campoOcr={campoOcr}
          onTesto={incollaOcr}
          onFile={scegliFile}
        />
        <ModuloDati
          form={form}
          set={set}
          tipi={tipi}
          campoOcr={campoOcr}
          setCampoOcr={setCampoOcr}
          haAnteprima={!!anteprima}
          totPagine={totPagine}
          pagine={pagine}
          setPagine={setPagine}
          idInModifica={idInModifica}
          salvando={salvando}
          archiviando={archiviando}
          onSvuota={nuovo}
          onSalva={salvaInCoda}
        />
      </div>

      <CodaLavoro
        righeCoda={righeCoda}
        selezionati={selezionati}
        selezione={selezione}
        daArchiviare={daArchiviare}
        archiviando={archiviando}
        inviandoEmail={inviandoEmail}
        onSelezionaTutti={(v) => setSelezionati(v ? new Set(righeCoda.map((r) => r.id)) : new Set())}
        onToggle={toggleSel}
        onArchivia={archivia}
        onEmail={preparaInvioEmail}
        onCopiaAnagrafica={copiaSoloAnagrafica}
        onModifica={modifica}
        onDuplica={duplica}
        onSalvaLocale={salvaLocale}
        onCancella={cancella}
      />

      <ModaleEmail
        stato={modaleEmail}
        setStato={setModaleEmail}
        inviando={inviandoEmail}
        onConferma={confermaEInviaEmail}
      />
    </div>
  );
}
