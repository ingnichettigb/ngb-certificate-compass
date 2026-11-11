# Stampa globale — fascicolo completo in PDF a blocchi (rev 11/11/2026)

Nuova funzione sotto **Stampe → Stampe predefinite → «Fascicolo completo»** (rotta `/stampe/globale`).

## Cosa produce
File `NN-AAMMGGhh-STAMPA GLOBALE-DITTA-DA X a Y.pdf`, uno per blocco. Esempio: `01-26111114-STAMPA GLOBALE-ROSSI SRL-DA A a D.pdf`.

Dentro ogni file:
1. **Copertina grande** (logo, ditta, «BLOCCO 01 DI 03», intervallo lettere, n. lavoratori, indicazioni modificabili) — su ogni blocco.
2. **Solo blocco 01:** pagina 2 = **organigramma A3** (stesso PDF della carta 01).
3. Per ogni lavoratore, in ordine alfabetico: **scheda** (cognome nome, dati anagrafici, funzioni a cui è incaricato, attestati per funzione e per data di emissione, dal più recente) **+ PDF degli attestati** (fronte e retro).
4. **Pagina finale:** indice (lavoratore → pagina) e controllo degli allegati mancanti/non convertibili.
5. Piè di pagina «Blocco N di M · Pagina X di Y» su ogni pagina.

## Divisione in blocchi
- Limite per file modificabile (predefinito 100 MB). Stima = somma delle dimensioni dei file letti dalle intestazioni HTTP (senza scaricarli) + pesi fissi.
- Blocchi consecutivi in ordine alfabetico; **un lavoratore non è mai spezzato**. Se uno da solo supera il limite, ha un blocco suo ed è segnalato.
- L'intervallo («DA A a D») nasce dal contenuto reale, non da lettere fisse.

## Conversione allegati
PDF → copiati. JPG/PNG → pagina A4. WebP/GIF → via canvas del browser. **Word/altri formati: non convertiti**, segnalati in rosso nella scheda e nella pagina finale.

## File
NUOVI
- `src/features/stampe/globale/piano-blocchi.ts` (+ `.test.ts`) — ordine, blocchi, nome file
- `src/features/stampe/globale/ordine-attestati.ts` (+ `.test.ts`) — funzione (ordine INCARICHI) poi data
- `src/features/stampe/globale/allegati.ts` (+ `.test.ts`) — lettura e inserimento PDF/immagini
- `src/features/stampe/globale/pagine-fisse.ts` (+ `.test.ts`) — copertina, scheda, pagina finale, piè di pagina
- `src/features/stampe/globale/genera.ts` — stima e generazione blocco per blocco
- `src/features/stampe/components/StampaGlobalePage.tsx`
- `src/routes/stampe.globale.tsx`

MODIFICATI
- `src/features/stampe/components/ElencoStampePredefinite.tsx` rev 6 — riquadro «Stampa globale» (non numerato: la numerazione 01–18 non cambia)
- `src/routeTree.gen.ts` — registrata la rotta (identica a quanto genererebbe il plugin)

## Verifiche fatte
`tsc` senza errori sui file nuovi, `eslint` pulito, `vitest`: 21 test passati (nuovi + numerazione carte). Controllato a vista il PDF di prova (copertina e scheda).

## Limiti noti
- Caratteri fuori dal set standard del PDF (es. «Ł») diventano «?» (limite già presente in `testoPdf`).
- Niente segnalibri cliccabili: c'è l'indice stampato nella pagina finale.
- Generazione nel browser, un blocco alla volta; con file molto pesanti tenere il limite più basso (50–80 MB).
- Il browser può chiedere di consentire più download di seguito.
- Non provato con i tuoi dati reali: serve una prova su Supabase.

## Push
    cd ngb-certificate-compass
    unzip -o ../ngb-stampa-globale-rev1.zip
    bun run lint && bunx tsc --noEmit && bunx vitest run
    git checkout -b stampa-globale
    git add -A && git commit -m "Stampa globale: fascicolo PDF a blocchi"
    git push -u origin stampa-globale
