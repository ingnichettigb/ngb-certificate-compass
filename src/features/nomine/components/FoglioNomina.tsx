/*
 * File:      FoglioNomina.tsx
 * Percorso:  src/features/nomine/components/FoglioNomina.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Anteprima della lettera di nomina su foglio A4: stessi blocchi e stessa intestazione del PDF.
 */
import type { DittaRecord } from "@/lib/api/ditta";
import { logoDitta, nomeDitta } from "@/lib/identita-ditta";
import type { Blocco } from "../documento";
import { righeIntestazione } from "../intestazione";

export function FoglioNomina({
  ditta,
  blocchi,
}: {
  ditta: Partial<DittaRecord> | undefined;
  blocchi: Blocco[];
}) {
  const logo = logoDitta(ditta);
  return (
    <article
      className="mx-auto w-full max-w-[794px] bg-white p-10 text-[13px] leading-snug text-black shadow-md"
      data-testid="foglio-nomina"
    >
      <header className="flex items-center gap-4 border border-neutral-400 p-3">
        {logo && (
          <img
            src={logo}
            alt={`Logo ${nomeDitta(ditta)}`}
            className="h-14 max-w-24 object-contain"
          />
        )}
        <div className="flex-1 text-center">
          {righeIntestazione(ditta).map((r, i) => (
            <p key={i} className={r.grassetto ? "text-sm font-bold" : "text-[11px]"}>
              {r.testo}
            </p>
          ))}
        </div>
      </header>
      <div className="mt-6 space-y-2">
        {blocchi.map((b, i) => (
          <Riga key={i} b={b} />
        ))}
      </div>
    </article>
  );
}

function Riga({ b }: { b: Blocco }) {
  switch (b.t) {
    case "titolo":
      return <h2 className="pb-2 text-center text-[13px] font-bold">{b.testo}</h2>;
    case "protocollo":
      return (
        <p className="flex justify-between text-[11px]">
          <span>prot. N° {b.protocollo}</span>
          <span>{b.anno}</span>
        </p>
      );
    case "destinatario":
      return (
        <p className="pb-4 pl-[58%]">
          Spett.le
          <br />
          <strong>{b.nome}</strong>
        </p>
      );
    case "oggetto":
      return (
        <p className="pb-2 text-sm font-bold">
          {b.testo.startsWith("Oggetto") ? b.testo : `Oggetto: ${b.testo}`}
        </p>
      );
    case "paragrafo":
      return <p>{b.testo}</p>;
    case "sottotitolo":
      return <p className="pl-4 font-bold">{b.testo}</p>;
    case "voce":
      return (
        <p className="flex gap-2">
          <span className="w-5 shrink-0">{b.numero}.</span>
          <span>{b.testo}</span>
        </p>
      );
    case "puntato":
      return <p className="pl-6">- {b.testo}</p>;
    case "rientrato":
      return <p className="pl-5">{b.testo}</p>;
    case "firma-dirigente":
      return (
        <div className="flex justify-between pt-4">
          <p>
            {b.luogo}
            <span className="ml-6">{b.data}</span>
          </p>
          <div className="w-1/2 text-center">
            <p>{b.qualifica}</p>
            {b.nome && <p>{b.nome}</p>}
            {b.note.map((n, i) => (
              <p key={i} className="text-[10px]">
                {n}
              </p>
            ))}
          </div>
        </div>
      );
    case "formazione":
      return (
        <div className="space-y-1 pt-3 text-[12px]">
          <p className="font-bold">Il sottoscritto dichiara:</p>
          <p>
            [ ] di non aver ricevuto nessuna formazione per quanto riguarda la figura di {b.figura}.
          </p>
          <p>
            [ ] di aver ricevuto adeguata formazione per quanto riguarda la figura di {b.figura} e
            produrrà regolare certificazione
          </p>
          <p>
            [ ] di aver ricevuto adeguata formazione per quanto riguarda la figura di {b.figura} ma
            di non essere aggiornato
          </p>
        </div>
      );
    case "presa-visione":
      return (
        <div className="pt-4">
          <p className="pb-2 font-bold">{b.etichetta}</p>
          <div className="grid grid-cols-[1fr_1fr_2fr] gap-4 text-[11px]">
            <span>Nome Cognome</span>
            <span>data</span>
            <span>Firma</span>
            <strong className="text-[13px]">{b.nome}</strong>
            <span className="border-b border-neutral-500" />
            <span className="border-b border-neutral-500" />
          </div>
        </div>
      );
  }
}
