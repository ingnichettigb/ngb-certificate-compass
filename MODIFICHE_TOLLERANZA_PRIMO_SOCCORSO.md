# Scadenze: calcolo centrale per corso e tolleranza di 4 mesi sul Primo Soccorso

## Regola (come l'hai descritta)
- Un corso di partenza (Base) è «scaduto» solo se, per il suo gruppo (lavoratore + macro-categoria), non c'è un aggiornamento valido: se c'è, il Base non compare tra gli scaduti.
- **Solo Primo Soccorso**: l'aggiornamento fatto entro 4 mesi dalla scadenza sana il ciclo; oltre 4 mesi non sana nulla, decade tutto e si rifà il corso base. Negli altri corsi resta la sanatoria illimitata.
- Aggiornamento tardivo ma entro 4 mesi (scelta A): sana il ciclo scaduto e la scadenza successiva resta ancorata al Base (es. Base 10/01/2020, agg. 10/04/2023 → prossima scadenza 10/01/2026, non 2029).

## Dove si applica (un solo calcolo: `scadenze/calcolo-ciclo.ts`, lo stesso della pagina Scadenze)
| Schermata | Prima | Ora |
|---|---|---|
| Scheda lavoratore, incarichi (`lib/api/incarichi.ts`) | ogni livello con la propria data; «peggiore vince» | stato del ciclo del gruppo; Base rinnovato = «Superato»; «Da rifare corso base» |
| Home: Scaduti / In scadenza 6 mesi | un conteggio per ogni attestato | un conteggio per lavoratore + corso, solo approvati e non cessati |
| Matrice / scelta corsi (`stato-fabbisogno.ts`) | data dell'ultimo Base | data del ciclo; «da rifare dopo MM-AA» |
| Stampa globale (schede) | data di ogni attestato | data del ciclo; Base rinnovati «Superato» |
| Organigramma A3 | un attestato valido qualsiasi | ciclo del gruppo in regola |
| Scadenze, Stampe | già sul motore | + tolleranza e «limite di recupero» |

## File
Nuovi: `scadenze/regole-corso.ts` (+ test), `drizzle/migrations/0009_tipi_corso_tolleranza_ritardo.sql`.
Modificati: `calcolo-ciclo.ts` (rev 6), `raggruppa.ts` (rev 5), `preposti.ts` (rev 3), `types.ts`, `lib/api/incarichi.ts`, `stato-fabbisogno.ts`, `useStatisticheHome.ts`, `organigramma-a3.ts`, `stampe/globale/genera.ts` e `pagine-fisse.ts`, `BloccoIncarichi.tsx`, `RigaScadenza.tsx`, `LineaCicloFormativo.tsx`, test `calcolo-ciclo.test.ts`, `api.test.ts`.

## Database
La tolleranza si legge da `tipi_corso.tolleranza_ritardo_mesi` (NULL = nessun limite). Finché la colonna non c'è, il programma usa la regola predefinita (Primo Soccorso = 4 mesi): funziona anche prima di eseguire la migrazione. Prompt per Lovable a parte.

## Da sapere
- Il limite di 4 mesi è un parametro: va verificato sulla normativa/accordo applicato.
- Il test «a parità di livello sceglie l'attestato col corso più recente» dipendeva dalla data odierna: ora usa una data fissa.
- `VistaPianoCorsi.tsx` non è usata da nessuna pagina e non è stata toccata.
