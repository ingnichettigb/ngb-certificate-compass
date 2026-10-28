  async function toggleObbligo(dipendente: Dipendente, corso: TipoCorso, e: React.MouseEvent) {
    e.stopPropagation();
    const chiaveOp = `${dipendente.id}-${corso.id}`;
    if (inSalvataggio === chiaveOp) return;

    setInSalvataggio(chiaveOp);
    try {
      let ruoloTrovato = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
      if (!ruoloTrovato) {
        await aggiungiRuolo({
          nome: corso.nome_corso,
          macro_categoria: corso.macro_categoria || "Corsi",
          obbligatorio_tutti: false,
          ordine: ruoliCatalogo.length + 1,
        });
        await qc.invalidateQueries({ queryKey: ["ruoli-sicurezza"] });
        ruoloTrovato = mappaRuoli.get(corso.nome_corso.toLowerCase().trim());
      }

      if (!ruoloTrovato || ruoloTrovato.obbligatorio_tutti) return;

      const giaObbligato = haObbligoCorso(dipendente.id, corso);
      await impostaRuoloDipendente(dipendente.id, ruoloTrovato.id, !giaObbligato);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dipendenti-ruoli"] }),
        qc.invalidateQueries({ queryKey: ["ruoli-sicurezza"] }),
      ]);

      toast.success(
        !giaObbligato
          ? `Obbligo aggiunto: ${corso.nome_corso} per ${dipendente.cognome} ${dipendente.nome}`
          : `Obbligo rimosso: ${corso.nome_corso} per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (err) {
      toast.error("Errore salvataggio", { description: (err as Error).message });
    } finally {
      setInSalvataggio(null);
    }
  }
