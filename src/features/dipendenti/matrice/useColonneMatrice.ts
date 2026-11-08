/*
 * File:      useColonneMatrice.ts
 * Percorso:  src/features/dipendenti/matrice/useColonneMatrice.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: larghezza delle colonne (trascinamento e doppio clic per
 *            ripristinare) e colonne corso nascoste, con memorizzazione nel browser. Nessun cambio di comportamento.
 */
import { useMemo, useRef, useState, type MouseEvent as EventoMouse } from "react";
import { toast } from "sonner";
import type { TipoCorso } from "@/lib/api";
import { CHIAVE_LARGHEZZE, CHIAVE_NASCOSTI, LARGHEZZE_FISSE_BASE } from "./matrice-costanti";

export function useColonneMatrice(corsiCatalogo: TipoCorso[], corsiFiltratiPerGruppo: TipoCorso[]) {
  // Persistenza larghezze colonne
  const [larghezze, setLarghezze] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(CHIAVE_LARGHEZZE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistenza colonne nascoste (id dei corsi)
  const [corsiNascosti, setCorsiNascosti] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CHIAVE_NASCOSTI);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const resizingRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const corsiVisibili = useMemo(() => {
    return corsiFiltratiPerGruppo.filter((c) => !corsiNascosti.includes(c.id));
  }, [corsiFiltratiPerGruppo, corsiNascosti]);

  const tuttiVisibili = corsiNascosti.length === 0;

  function toggleNascondiTutti() {
    if (tuttiVisibili) {
      const tuttiIds = corsiCatalogo.map((c) => c.id);
      setCorsiNascosti(tuttiIds);
      localStorage.setItem(CHIAVE_NASCOSTI, JSON.stringify(tuttiIds));
      toast.info("Tutte le colonne dei corsi sono state nascoste");
    } else {
      setCorsiNascosti([]);
      localStorage.removeItem(CHIAVE_NASCOSTI);
      toast.success("Tutte le colonne dei corsi sono ora visibili");
    }
  }

  function toggleVisibilitaCorso(corsoId: string, e: EventoMouse) {
    e.stopPropagation();
    setCorsiNascosti((prev) => {
      const next = prev.includes(corsoId)
        ? prev.filter((id) => id !== corsoId)
        : [...prev, corsoId];
      localStorage.setItem(CHIAVE_NASCOSTI, JSON.stringify(next));
      return next;
    });
  }

  const larghezzaTotaleTabella = useMemo(() => {
    let tot =
      (larghezze["nominativo"] || LARGHEZZE_FISSE_BASE.nominativo) +
      (larghezze["funzione"] || LARGHEZZE_FISSE_BASE.funzione) +
      (larghezze["ruolo"] || LARGHEZZE_FISSE_BASE.ruolo);
    for (const c of corsiVisibili) {
      tot += larghezze[c.id] || LARGHEZZE_FISSE_BASE.corso;
    }
    return Math.max(tot, 1100);
  }, [larghezze, corsiVisibili]);

  function iniziaResize(colKey: string, currentWidth: number, e: EventoMouse) {
    e.preventDefault();
    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newWidth = Math.max(70, resizingRef.current.startWidth + diff);
      setLarghezze((prev) => {
        const next = { ...prev, [resizingRef.current!.colKey]: newWidth };
        localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(next));
        return next;
      });
    }

    function onMouseUp() {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  function resetLarghezza(colKey: string) {
    setLarghezze((prev) => {
      const next = { ...prev };
      delete next[colKey];
      localStorage.setItem(CHIAVE_LARGHEZZE, JSON.stringify(next));
      return next;
    });
  }

  return {
    larghezze,
    corsiVisibili,
    tuttiVisibili,
    larghezzaTotaleTabella,
    toggleNascondiTutti,
    toggleVisibilitaCorso,
    iniziaResize,
    resetLarghezza,
  };
}
