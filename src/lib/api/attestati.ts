export async function scollegaDocumentoAttestato(id: string): Promise<void> {
  const { error } = await supabase
    .from("attestati_caricati")
    .update({
      url_foto_fronte: null,
      url_foto_retro: null,
      stato_validazione: "Approvato",
      data_validazione: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
