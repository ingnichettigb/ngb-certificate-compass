/*
 * File:      RigaCoda.tsx
 * Percorso:  src/features/operatore/components/RigaCoda.tsx
 * Una riga della coda di lavoro: dati del lavoratore, stato e azioni.
 */
import { Archive, Copy, Download, Edit3, Mail, Trash2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatData } from "@/lib/api";
import type { CodaRiga } from "../types";
import { IconaAzione } from "./IconaAzione";

export function RigaCoda({
  r,
  selezionata,
  archiviando,
  inviandoEmail,
  onToggle,
  onCopiaAnagrafica,
  onModifica,
  onArchivia,
  onDuplica,
  onSalvaLocale,
  onEmail,
  onCancella,
}: {
  r: CodaRiga;
  selezionata: boolean;
  archiviando: boolean;
  inviandoEmail: boolean;
  onToggle: () => void;
  onCopiaAnagrafica: () => void;
  onModifica: () => void;
  onArchivia: () => void;
  onDuplica: () => void;
  onSalvaLocale: () => void;
  onEmail: () => void;
  onCancella: () => void;
}) {
  return (
        <tr className="border-t">
          <td className="p-2">
            <Checkbox checked={selezionata} onCheckedChange={() => onToggle()} />
          </td>
          <td className="p-2">
            <div className="font-medium">{r.cognome} {r.nome}</div>
            <div className="font-mono text-xs text-muted-foreground">{r.codice_fiscale}</div>
            {r.email && <div className="text-[11px] text-muted-foreground">{r.email}</div>}
          </td>
          <td className="p-2">
            {r.tipo_corso_nome || <span className="text-destructive">da scegliere</span>}
            <div className="text-xs text-muted-foreground">{r.ore ?? "?"} ore</div>
          </td>
          <td className="p-2">{formatData(r.data_corso)}</td>
          <td className="p-2">
            <Badge variant={r.esito === "Non valido" ? "destructive" : r.esito === "Valido" ? "default" : "secondary"}>
              {r.esito}
            </Badge>
          </td>
          <td className="p-2 text-xs">
            {r.archiviato ? <span className="text-primary font-medium">Archiviato nel DB ✓</span> : "Bozza"}
            {r.inviato && <div className="text-muted-foreground">Email inviata ✓</div>}
          </td>
          <td className="p-2">
            <div className="flex justify-end gap-1">
              <IconaAzione
                t="Copia dati anagrafici nel modulo per nuovo documento"
                onClick={() => onCopiaAnagrafica()}
              >
                <UserCheck />
              </IconaAzione>
              <IconaAzione t="Modifica" onClick={() => onModifica()}>
                <Edit3 />
              </IconaAzione>
              <IconaAzione
                t={r.archiviato ? "Già archiviato nel database" : "Aggiungi al database"}
                disabled={r.archiviato || archiviando}
                onClick={() => onArchivia()}
              >
                <Archive />
              </IconaAzione>
              <IconaAzione t="Duplica (altro corso nello stesso file)" onClick={() => onDuplica()}>
                <Copy />
              </IconaAzione>
              <IconaAzione t="Salva sul PC con nome" onClick={() => onSalvaLocale()}>
                <Download />
              </IconaAzione>
              <IconaAzione
                t="Invia email con Resend (apre anteprima)"
                disabled={inviandoEmail}
                onClick={() => onEmail()}
              >
                <Mail />
              </IconaAzione>
              <IconaAzione t="Elimina dalla coda" danger onClick={() => onCancella()}>
                <Trash2 />
              </IconaAzione>
            </div>
          </td>
        </tr>
  );
}
