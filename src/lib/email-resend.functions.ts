/*
 * File:      email-resend.functions.ts
 * Percorso:  src/lib/email-resend.functions.ts
 * Invio email tramite Resend con firma e mittente personalizzati.
 */
import { createServerFn } from "@tanstack/react-start";
import type { DatiAzienda } from "./dati-azienda";

export interface InvioEmailInput {
  destinatari: string[];
  oggetto: string;
  testoCorpo: string;
  datiAzienda: DatiAzienda;
}

export interface InvioEmailRisultato {
  ok: boolean;
  messaggio?: string;
  id?: string;
}

function costruisciFirmaTestuale(d: DatiAzienda): string {
  const righe: string[] = ["\n\n---"];
  if (d.referente && d.nomeAzienda) righe.push(`${d.referente} — ${d.nomeAzienda}`);
  else if (d.nomeAzienda) righe.push(d.nomeAzienda);
  else if (d.referente) righe.push(d.referente);

  const indirizzo = [
    d.via,
    [d.cap, d.comune].filter(Boolean).join(" "),
    d.provincia ? `(${d.provincia})` : "",
  ].filter(Boolean).join(", ");

  if (indirizzo) righe.push(`Indirizzo: ${indirizzo}`);
  if (d.telefono) righe.push(`Tel: ${d.telefono}`);
  if (d.email) righe.push(`Email di riferimento: ${d.email}`);
  righe.push("Verifica conformità attestati D.Lgs. 81/2008");

  return righe.join("\n");
}

function costruisciHtml(corpo: string, d: DatiAzienda): string {
  const testoHtml = corpo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
  const ditta = d.nomeAzienda || "Ufficio Sicurezza";
  const operatore = d.referente ? `${d.referente} &middot; ` : "";
  const tel = d.telefono ? `<p style="margin:2px 0;">Tel: <strong>${d.telefono}</strong></p>` : "";
  const emailRef = d.email ? `<p style="margin:2px 0;">Email: <a href="mailto:${d.email}">${d.email}</a></p>` : "";
  const indirizzo = [d.via, [d.cap, d.comune].filter(Boolean).join(" "), d.provincia ? `(${d.provincia})` : ""].filter(Boolean).join(", ");
  const indHtml = indirizzo ? `<p style="margin:2px 0; color:#666;">${indirizzo}</p>` : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; font-size:14px; line-height:1.6; color:#1a1a1a; max-width:640px; margin:0 auto; padding:20px;">
      <div style="background:#f8fafc; border-left:4px solid #0d9488; padding:16px 20px; border-radius:4px; margin-bottom:20px;">
        <h2 style="margin:0 0 4px 0; font-size:18px; color:#0f766e;">${ditta}</h2>
        <p style="margin:0; font-size:12px; color:#64748b;">Verifica attestati di formazione sicurezza (D.Lgs. 81/2008)</p>
      </div>

      <div style="white-space:normal; margin-bottom:24px;">
        ${testoHtml}
      </div>

      <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />

      <div style="font-size:12px; color:#475569; line-height:1.5;">
        <p style="margin:0 0 4px 0; font-weight:600; color:#0f172a;">${operatore}${ditta}</p>
        ${indHtml}
        ${tel}
        ${emailRef}
      </div>
    </div>
  `;
}

export const inviaEmailConResend = createServerFn({ method: "POST" })
  .inputValidator((d: InvioEmailInput) => d)
  .handler(async ({ data }): Promise<InvioEmailRisultato> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, messaggio: "Chiave RESEND_API_KEY non configurata sul server." };
    }

    if (!data.destinatari || data.destinatari.length === 0) {
      return { ok: false, messaggio: "Nessun destinatario specificato." };
    }

    const { datiAzienda } = data;
    const nomeMittente = datiAzienda.referente
      ? `${datiAzienda.referente} (${datiAzienda.nomeAzienda || "Ufficio Sicurezza"})`
      : (datiAzienda.nomeAzienda || "Ufficio Sicurezza");

    const senderEmail = datiAzienda.emailMittenteResend?.trim() || "onboarding@resend.dev";
    const from = `${nomeMittente} <${senderEmail}>`;

    const testoCompleto = data.testoCorpo + costruisciFirmaTestuale(datiAzienda);
    const htmlCompleto = costruisciHtml(data.testoCorpo, datiAzienda);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          from,
          to: data.destinatari,
          reply_to: datiAzienda.email?.trim() || undefined,
          subject: data.oggetto,
          text: testoCompleto,
          html: htmlCompleto,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errDettaglio = json.message || json.error || `Errore HTTP ${res.status}`;
        return { ok: false, messaggio: `Resend: ${errDettaglio}` };
      }

      return { ok: true, id: json.id };
    } catch (e) {
      return { ok: false, messaggio: `Errore di rete nell'invio con Resend: ${(e as Error).message}` };
    }
  });
