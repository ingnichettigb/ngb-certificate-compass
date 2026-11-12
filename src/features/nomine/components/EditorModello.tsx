/*
 * File:      EditorModello.tsx
 * Percorso:  src/features/nomine/components/EditorModello.tsx
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Modifica dei testi della nomina (titolo, oggetto, introduzione, compiti, chiusura, firma) con elenco dei segnaposto.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEGNAPOSTO, type ModelloNomina } from "../tipi";

type Campo = { chiave: keyof ModelloNomina; etichetta: string; righe?: number; aiuto?: string };

const CAMPI: Campo[] = [
  { chiave: "titolo", etichetta: "Titolo", righe: 2 },
  { chiave: "oggetto", etichetta: "Oggetto", righe: 2 },
  {
    chiave: "introduzione",
    etichetta: "Introduzione",
    righe: 8,
    aiuto: "Paragrafi separati da una riga vuota.",
  },
  {
    chiave: "corpo",
    etichetta: "Compiti / obblighi",
    righe: 16,
    aiuto:
      "Una riga per voce, numerate in automatico. Inizia la riga con «# » per un sottotitolo, «- » per un elenco puntato, «> » per un testo rientrato.",
  },
  {
    chiave: "chiusura",
    etichetta: "Chiusura (prima dei saluti)",
    righe: 8,
    aiuto: "Paragrafi separati da una riga vuota. L'ultimo può essere «Distinti saluti.»",
  },
  {
    chiave: "nota_firma",
    etichetta: "Sotto la firma del firmatario",
    righe: 2,
    aiuto: "Una riga per voce (es. «f.to Digitalmente»).",
  },
];

export function EditorModello({
  modello,
  onCambia,
}: {
  modello: ModelloNomina;
  onCambia: (m: ModelloNomina) => void;
}) {
  const set = (chiave: keyof ModelloNomina, valore: string) =>
    onCambia({ ...modello, [chiave]: valore });
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted p-3 text-xs">
        <p className="mb-1 font-semibold">Segnaposto utilizzabili nei testi</p>
        <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {SEGNAPOSTO.map((s) => (
            <li key={s.chiave}>
              <code className="rounded bg-background px-1">{`{{${s.chiave}}}`}</code>{" "}
              <span className="text-muted-foreground">{s.descrizione}</span>
            </li>
          ))}
        </ul>
      </div>
      {CAMPI.map((c) => (
        <div key={c.chiave} className="space-y-1">
          <Label htmlFor={`m-${c.chiave}`}>{c.etichetta}</Label>
          <Textarea
            id={`m-${c.chiave}`}
            rows={c.righe}
            value={String(modello[c.chiave] ?? "")}
            onChange={(e) => set(c.chiave, e.target.value)}
          />
          {c.aiuto && <p className="text-xs text-muted-foreground">{c.aiuto}</p>}
        </div>
      ))}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="m-etichetta_firma">Scritta sopra la firma del nominato</Label>
          <Input
            id="m-etichetta_firma"
            value={modello.etichetta_firma}
            onChange={(e) => set("etichetta_firma", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="m-formazione">Figura per le dichiarazioni sulla formazione</Label>
          <Input
            id="m-formazione"
            value={modello.formazione}
            onChange={(e) => set("formazione", e.target.value)}
            placeholder="es. ADDETTO AL PRIMO SOCCORSO"
          />
          <p className="text-xs text-muted-foreground">
            Lascia vuoto per non stampare le tre dichiarazioni.
          </p>
        </div>
      </div>
    </div>
  );
}
