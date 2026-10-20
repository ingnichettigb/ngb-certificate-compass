/*
 * File:      operatore.tsx
 * Percorso:  src/routes/operatore.tsx
 * Postazione Operatore completa: estrazione AI, mirino OCR con pulizia automatica testo,
 * campo email nel modulo, copia anagrafica nella coda e modale di anteprima/modifica email prima dell'invio via Resend.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase as sb } from "@/integrations/supabase/client";

import { estraiAttestato } from "@/lib/estrazione.functions";
import { getActiveProvider, useAiConfig } from "@/lib/ai-providers";

import { contaPagine, estraiPagine, parsePagine, piuSimile, renderizzaPrimaPaginaPdf } from "@/lib/pdf-pagine";
import { pulisciCF, upsertDipendente, CARTELLA_ARCHIVIO, cartellaDipendente, creaIntegrazioneDvr } from "@/lib/api";

import { leggiDatiAzienda } from "@/lib/dati-azienda";
import { inviaEmailConResend } from "@/lib/email-resend.functions";
import { ETICHETTE_OCR, dataDaTesto, pulisciTestoOcr } from "@/features/operatore/ocr-testo";
import { estensioneFile, nomeFileStandard } from "@/features/operatore/nome-file";
import { costruisciBozzaEmail, riepilogo } from "@/features/operatore/bozza-email";
import { NOTA_PREDEFINITA, VUOTA } from "@/features/operatore/types";
import type { CampoOcr, CodaRiga, Riga, StatoModaleEmail, TipoCorso } from "@/features/operatore/types";
import { IntestazioneOperatore } from "@/features/operatore/components/IntestazioneOperatore";
import { PannelloDocumento } from "@/features/operatore/components/PannelloDocumento";
import { ModuloDati } from "@/features/operatore/components/ModuloDati";
import { CodaLavoro } from "@/features/operatore/components/CodaLavoro";
import { ModaleEmail } from "@/features/operatore/components/ModaleEmail";

export const Route = createFileRoute("/operatore")({
  head: () => ({
    meta: [
      { title: "Postazione Operatore — Archivio Sicurezza · Nichetti Gian Battista" },
      { name: "description", content: "Lettura automatica con AI degli attestati di sicurezza, verifica dei dati e archiviazione." },
      { property: "og:title", content: "Postazione Operatore" },
      { property: "og:description", content: "Carica un attestato, verifica i dati letti dall'AI e archivialo nel database." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostazioneOperatore,
});

function PostazioneOperatore() {
  const qc = useQueryClient();
  const [aiConfig] = useAiConfig();
  const aiAttiva = getActiveProvider(aiConfig);

  const { data: tipi = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: async () => {
      const { data, error } = await sb.from("tipi_corso").select("*").order("nome_corso");
      if (error) throw error;
      return (data ?? []) as TipoCorso[];
    },
  });

  const { data: coda = [] } = useQuery({
    queryKey: ["coda"],
    queryFn: async () => {
      const { data, error } = await sb.from("coda_valutazioni").select("*").order("created_at", { ascending: false });
      if (error) return [];
      return data ?? [];
    },
  });

  const [form, setForm] = useState<Omit<Riga, "id">>(VUOTA);
  const [idInModifica, setIdInModifica] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [anteprimaMime, setAnteprimaMime] = useState<string | null>(null);
  const [lettura, setLettura] = useState(false);
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());
  const [totPagine, setTotPagine] = useState(0);
  const [pagine, setPagine] = useState("");
  const [, setTestoLetto] = useState("");
  const [, setSuggerito] = useState<string | null>(null);

  const [campoOcr, setCampoOcr] = useState<CampoOcr | null>(null);

  // Finestra anteprima / inserimento email prima dell'invio
  const [modaleEmail, setModaleEmail] = useState<StatoModaleEmail>({
    aperta: false,
    righe: [],
    destinatari: "",
    oggetto: "",
    testoCorpo: "",
  });

  function incollaOcr(testoGrezzo: string) {
    if (!campoOcr) return;
    const testo = pulisciTestoOcr(testoGrezzo, campoOcr);
    if (!testo) return void toast.error("Nessun testo valido riconosciuto: riprova con un rettangolo più mirato");
    const c = campoOcr;
    if (c === "codice_fiscale") set("codice_fiscale", pulisciCF(testo));
    else if (c === "cognome" || c === "nome") set(c, testo);
    else if (c === "email") set("email", testo);
    else if (c === "data_corso") {
      const d = dataDaTesto(testo);
      if (!d) return void toast.error(`Data non riconosciuta in: "${testo}"`);
      set("data_corso", d);
    } else if (c === "ore") {
      const n = Number((testo.match(/\d+([.,]\d+)?/)?.[0] ?? "").replace(",", "."));
      if (!n) return void toast.error("Numero ore non trovato");
      set("ore", n);
    } else if (c === "note") set("note", form.note ? form.note + " " + testo : testo);
    else set(c, testo);
    toast.success(`${ETICHETTE_OCR[c]}: ${testo}`);
    setCampoOcr(null);
  }

  const set = <K extends keyof Riga>(k: K, v: Riga[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => () => {
    if (anteprima?.startsWith("blob:")) URL.revokeObjectURL(anteprima);
  }, [anteprima]);

  async function scegliFile(f: File) {
    if (!(f.type === "application/pdf" || f.type.startsWith("image/"))) return void toast.error("Carica un PDF o una foto");
    setFile(f);
    setAnteprima(URL.createObjectURL(f));
    setAnteprimaMime(f.type);
    setIdInModifica(null);
    setForm(VUOTA);
    setPagine("");
    setTestoLetto("");
    setSuggerito(null);
    setTotPagine(f.type === "application/pdf" ? await contaPagine(f).catch(() => 0) : 0);
    setLettura(true);

    try {
      const accettaPdfDiretto =
        aiAttiva.kind === "default" ||
        aiAttiva.id.includes("gemini") ||
        aiAttiva.model.toLowerCase().includes("gemini");

      let payloadBase64 = "";
      let payloadMime = f.type;

      if (f.type === "application/pdf" && !accettaPdfDiretto) {
        toast.info("Conversione PDF per l'AI in uso...");
        const img = await renderizzaPrimaPaginaPdf(f);
        payloadBase64 = img.base64;
        payloadMime = img.mime;
      } else {
        const buf = await f.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
        payloadBase64 = btoa(bin);
      }

      const r = await estraiAttestato({
        data: {
          base64: payloadBase64,
          mime: payloadMime,
          nomeFile: f.name,
          tipiCorso: tipi.map((t) => t.nome_corso),
          argomenti: [],
          aiConfig: { kind: aiAttiva.kind, baseUrl: aiAttiva.baseUrl, model: aiAttiva.model, apiKey: aiAttiva.apiKey },
        },
      });

      if (!r.ok) return void toast.error(r.errore);
      const d = r.dati;
      setTestoLetto(d.tipo_corso);
      const tipo = tipi.find((t) => t.nome_corso.toLowerCase() === d.tipo_corso.toLowerCase()) ?? piuSimile(d.tipo_corso, tipi).tipo;
      setSuggerito(tipo?.id ?? null);

      const cf = pulisciCF(d.codice_fiscale);
      const { data: esistente } = cf
        ? await sb.from("dipendenti").select("*").eq("codice_fiscale", cf).maybeSingle()
        : { data: null };

      setForm({
        ...VUOTA,
        cognome: (d.cognome || "").toUpperCase(),
        nome: (d.nome || "").toUpperCase(),
        codice_fiscale: cf,
        data_nascita: d.data_nascita || "",
        luogo_nascita: d.luogo_nascita || "",
        codice_ateco: d.codice_ateco || esistente?.codice_ateco || "",
        email: esistente?.email ?? "",
        reparto: esistente?.reparto ?? "",
        tipo_corso_id: tipo?.id ?? null,
        tipo_corso_nome: tipo?.nome_corso ?? d.tipo_corso,
        data_corso: d.data_corso,
        ore: d.ore,
        ente: d.ente,
        argomenti: d.argomenti,
        esito: d.valutazione,
        note: d.motivazione || NOTA_PREDEFINITA,
        integrazione: "",
      });
      toast.success(esistente ? "Dati estratti (dipendente già presente)" : "Dati estratti con successo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLettura(false);
    }
  }

  // ================= Salvataggio, coda di lavoro, archiviazione =================
  const db = sb as any;
  const [salvando, setSalvando] = useState(false);
  const [archiviando, setArchiviando] = useState(false);
  const [inviandoEmail, setInviandoEmail] = useState(false);
  const righeCoda = coda as CodaRiga[];
  const ricarica = () => qc.invalidateQueries({ queryKey: ["coda"] });
  const selezione = useMemo(() => righeCoda.filter((r) => selezionati.has(r.id)), [righeCoda, selezionati]);
  const daArchiviare = useMemo(() => selezione.filter((r) => !r.archiviato), [selezione]);
  const toggleSel = (id: string) =>
    setSelezionati((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  function nuovo() {
    setForm(VUOTA);
    setFile(null);
    setAnteprima(null);
    setAnteprimaMime(null);
    setIdInModifica(null);
    setPagine("");
    setTotPagine(0);
    setCampoOcr(null);
  }

  function copiaSoloAnagrafica(r: CodaRiga) {
    setForm((f) => ({
      ...f,
      cognome: (r.cognome || "").toUpperCase(),
      nome: (r.nome || "").toUpperCase(),
      codice_fiscale: r.codice_fiscale || "",
      data_nascita: r.data_nascita || "",
      luogo_nascita: r.luogo_nascita || "",
      codice_ateco: r.codice_ateco || "",
      email: r.email || "",
      reparto: r.reparto || "",
      tipo_corso_id: null,
      tipo_corso_nome: "",
      data_corso: "",
      ore: null,
      ente: "",
      argomenti: [],
      esito: "Valido",
      note: NOTA_PREDEFINITA,
      integrazione: "",
    }));
    setIdInModifica(null);
    toast.success(`Anagrafica di ${r.cognome} ${r.nome} copiata nel modulo`);
  }

  async function salvaInCoda(archiviaSubito: boolean) {
    if (!form.cognome || !form.codice_fiscale) return void toast.error("Servono almeno cognome e codice fiscale");
    if (form.esito === "Non valido" && !form.note.trim()) return void toast.error("Indica il motivo del rifiuto nelle note");
    setSalvando(true);
    try {
      let percorso: string | null = idInModifica ? righeCoda.find((r) => r.id === idInModifica)?.percorso_file ?? null : null;
      let mime: string | null = idInModifica ? righeCoda.find((r) => r.id === idInModifica)?.mime_file ?? null : null;
      if (file) {
        let blob: Blob = file;
        mime = file.type;
        if (file.type === "application/pdf" && pagine.trim() && totPagine > 0) {
          const idx = parsePagine(pagine, totPagine).map((n) => n - 1);
          if (idx.length) blob = await estraiPagine(file, idx);
        }
        percorso = `Coda/${crypto.randomUUID()}.${estensioneFile(mime)}`;
        const { error } = await sb.storage.from("attestati").upload(percorso, blob, { contentType: mime });
        if (error) throw error;
      }
      const { file_blob: _b, nome_file_originale: _n, pagine_salvate: _p, ...dati } = form as Riga;
      const payload = {
        ...dati,
        data_nascita: dati.data_nascita || null,
        data_corso: dati.data_corso || null,
        percorso_file: percorso,
        mime_file: mime,
        nome_file: nomeFileStandard(form).replace(/\.pdf$/, `.${estensioneFile(mime)}`),
      };
      const res = idInModifica
        ? await db.from("coda_valutazioni").update(payload).eq("id", idInModifica).select().single()
        : await db.from("coda_valutazioni").insert(payload).select().single();
      if (res.error) throw res.error;
      if (archiviaSubito) await archivia([{ ...VUOTA, ...res.data } as CodaRiga]);
      else toast.success(idInModifica ? "Valutazione aggiornata" : "Aggiunto alla coda di lavoro");
      nuovo();
      ricarica();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function modifica(r: CodaRiga) {
    const base = { ...VUOTA } as Record<string, unknown>;
    for (const k of Object.keys(VUOTA)) base[k] = (r as any)[k] ?? (VUOTA as any)[k];
    setForm(base as Omit<Riga, "id">);
    setIdInModifica(r.id);
    setFile(null);
    setPagine("");
    setTotPagine(0);
    setAnteprimaMime(r.mime_file);
    setAnteprima(r.percorso_file ? (await sb.storage.from("attestati").createSignedUrl(r.percorso_file, 3600)).data?.signedUrl ?? null : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function duplica(r: CodaRiga) {
    const { id: _i, created_at: _c, updated_at: _u, ...resto } = r as any;
    const { error } = await db.from("coda_valutazioni").insert({ ...resto, archiviato: false, inviato: false, tipo_corso_id: null, tipo_corso_nome: "" });
    if (error) return void toast.error(error.message);
    toast.success("Riga duplicata: scegli il secondo corso con la matita");
    ricarica();
  }

  async function cancella(r: CodaRiga) {
    if (!window.confirm(`Eliminare dalla coda ${r.cognome} ${r.nome} — ${r.tipo_corso_nome}?`)) return;
    const altri = righeCoda.filter((x) => x.id !== r.id && x.percorso_file === r.percorso_file);
    if (r.percorso_file && !altri.length && !r.archiviato) await sb.storage.from("attestati").remove([r.percorso_file]);
    await db.from("coda_valutazioni").delete().eq("id", r.id);
    ricarica();
  }

  async function archivia(righe: CodaRiga[]) {
    if (!righe.length) return;
    const daSalvare = righe.filter((r) => !r.archiviato);
    if (daSalvare.length === 0) {
      toast.info("Tutti gli attestati selezionati risultano già archiviati nel database");
      return;
    }

    setArchiviando(true);
    let ok = 0;
    try {
      for (const r of daSalvare) {
        try {
          if (!r.tipo_corso_id) throw new Error(`${r.cognome}: scegli il tipo di corso`);
          if (!r.data_corso) throw new Error(`${r.cognome}: manca la data del corso`);
          const dip = await upsertDipendente({
            codice_fiscale: pulisciCF(r.codice_fiscale),
            cognome: r.cognome,
            nome: r.nome,
            email: r.email || null,
            reparto: r.reparto || null,
            sottoreparto: null,
            classe_concorso: null,
            materia: null,
            luogo_nascita: r.luogo_nascita || null,
            data_nascita: r.data_nascita || null,
            ...(r.codice_ateco ? { codice_ateco: r.codice_ateco } : {}),
          });
          let percorsoFinale = r.percorso_file;
          if (r.percorso_file) {
            percorsoFinale = `${CARTELLA_ARCHIVIO}/${cartellaDipendente(dip)}/${nomeFileStandard(r).replace(/\.pdf$/, `.${estensioneFile(r.mime_file)}`)}`;
            const { data: blob } = await sb.storage.from("attestati").download(r.percorso_file);
            if (blob) await sb.storage.from("attestati").upload(percorsoFinale, blob, { upsert: true, ...(r.mime_file ? { contentType: r.mime_file } : {}) });
            else percorsoFinale = r.percorso_file;
          }
          const { data: att, error } = await db.from("attestati_caricati").insert({
            dipendente_id: dip.id,
            codice_fiscale: dip.codice_fiscale,
            tipo_corso_id: r.tipo_corso_id,
            data_corso: r.data_corso,
            ore_dichiarate: r.ore,
            url_foto_fronte: percorsoFinale,
            url_foto_retro: null,
            stato_validazione: r.esito === "Non valido" ? "Respinto" : "Approvato",
            note_rifiuto: r.esito === "Valido" ? r.note || null : riepilogo(r),
            data_validazione: new Date().toISOString(),
          }).select("id").single();
          if (error) throw error;
          if (r.esito === "Valido con integrazione DVR") {
            await creaIntegrazioneDvr({
              dipendente_id: dip.id,
              attestato_origine_id: att?.id ?? null,
              tipo_corso_nome: r.tipo_corso_nome || null,
              descrizione: r.integrazione || r.note || "Integrazione DVR richiesta",
              ore: Number(r.integrazione?.match(/(\d+)\s*or/)?.[1]) || null,
              argomenti_mancanti: r.argomenti_mancanti ?? [],
            }).catch((e) => toast.error(`Integrazione DVR non registrata: ${(e as Error).message}`));
          }
          await db.from("coda_valutazioni").update({ archiviato: true, ...(percorsoFinale !== r.percorso_file ? { percorso_file: percorsoFinale } : {}) }).eq("id", r.id);
          if (r.percorso_file && percorsoFinale !== r.percorso_file && r.percorso_file.startsWith("Coda/")) {
            const { count } = await db.from("coda_valutazioni").select("id", { count: "exact", head: true }).eq("percorso_file", r.percorso_file);
            if (!count) await sb.storage.from("attestati").remove([r.percorso_file]);
          }
          ok++;
        } catch (e) {
          toast.error((e as Error).message);
        }
      }
      if (ok) toast.success(`${ok} attestat${ok === 1 ? "o archiviato" : "i archiviati"} nel database`);
      ricarica();
      qc.invalidateQueries();
    } finally {
      setArchiviando(false);
    }
  }

  // Apre la finestra di anteprima e compilazione email prima dell'invio effettivo
  function preparaInvioEmail(righe: CodaRiga[]) {
    if (!righe.length) return;
    const { destinatari, oggetto, testoCorpo } = costruisciBozzaEmail(righe);
    setModaleEmail({ aperta: true, righe, destinatari, oggetto, testoCorpo });
  }

  // Invio effettivo tramite Resend dalla finestra di anteprima
  async function confermaEInviaEmail() {
    const destinatariList = modaleEmail.destinatari
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));

    if (!destinatariList.length) {
      return void toast.error("Inserisci almeno un indirizzo email valido nel campo Destinatari");
    }

    const datiAzienda = leggiDatiAzienda();
    setInviandoEmail(true);
    const toastId = toast.loading(`Invio email a ${destinatariList.join(", ")}...`);

    try {
      const res = await inviaEmailConResend({
        data: {
          destinatari: destinatariList,
          oggetto: modaleEmail.oggetto,
          testoCorpo: modaleEmail.testoCorpo,
          datiAzienda,
        },
      });

      if (!res.ok) {
        toast.error(res.messaggio || "Errore durante l'invio dell'email", { id: toastId });
        return;
      }

      toast.success("Email inviata con successo tramite Resend!", { id: toastId });

      // Salva l'email inserita nei record di coda (se prima era vuota) per ricordarla
      const primoIndirizzo = destinatariList[0];
      for (const r of modaleEmail.righe) {
        await db
          .from("coda_valutazioni")
          .update({
            inviato: true,
            ...(!r.email ? { email: primoIndirizzo } : {}),
          })
          .eq("id", r.id);
      }

      setModaleEmail((m) => ({ ...m, aperta: false }));
      ricarica();
    } catch (e) {
      toast.error(`Errore: ${(e as Error).message}`, { id: toastId });
    } finally {
      setInviandoEmail(false);
    }
  }

  async function salvaLocale(r: CodaRiga) {
    if (!r.percorso_file) return void toast.error("Nessun file allegato");
    const { data: blob, error } = await sb.storage.from("attestati").download(r.percorso_file);
    if (error || !blob) return void toast.error("Download non riuscito");
    const nome = nomeFileStandard(r).replace(/\.pdf$/, `.${estensioneFile(r.mime_file)}`);
    const w = window as any;
    try {
      if (w.showSaveFilePicker) {
        const h = await w.showSaveFilePicker({ suggestedName: nome });
        const wr = await h.createWritable();
        await wr.write(blob);
        await wr.close();
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = nome;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      toast.success(`Salvato: ${nome}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
    }
  }

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
