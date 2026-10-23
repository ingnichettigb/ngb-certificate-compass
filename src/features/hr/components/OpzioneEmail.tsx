/*
 * File:      OpzioneEmail.tsx
 * Percorso:  src/features/hr/components/OpzioneEmail.tsx
 * Casella «Invia email di esito al dipendente».
 */
import { Checkbox } from "@/components/ui/checkbox";

export function OpzioneEmail({
  email,
  haEmail,
  inviaEmail,
  setInviaEmail,
  busy,
}: {
  email: string | null | undefined;
  haEmail: boolean;
  inviaEmail: boolean;
  setInviaEmail: (v: boolean) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={inviaEmail && haEmail}
          disabled={!haEmail || busy}
          onCheckedChange={(v) => setInviaEmail(v === true)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Invia email di esito al dipendente</span>
          <span className="block text-xs text-muted-foreground">
            {haEmail
              ? `Scritta per ${email}: si apre la tua app di posta, tu premi Invia. Vale sia per approvato che per respinto (con il motivo).`
              : "Non disponibile: il dipendente non ha un'email in archivio."}
          </span>
        </span>
      </label>
    </div>
  );
}
