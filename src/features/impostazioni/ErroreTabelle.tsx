/*
 * File:      ErroreTabelle.tsx
 * Percorso:  src/features/impostazioni/ErroreTabelle.tsx
 * Messaggio mostrato quando le tabelle delle impostazioni non sono leggibili.
 */


export function ErroreTabelle({ messaggio }: { messaggio: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <p className="font-medium">Impossibile leggere i dati</p>
      <p className="mt-1 text-xs">
        Se hai appena aggiornato l'app, esegui prima le migrazioni SQL (file{" "}
        <code>20260919120000_reparti_e_categorie_corso.sql</code> e{" "}
        <code>20260919140000_sottoreparti_classi_concorso.sql</code>). Dettaglio: {messaggio}
      </p>
    </div>
  );
}
