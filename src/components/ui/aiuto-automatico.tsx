/*
 * File: aiuto-automatico.tsx
 * Percorso: src/components/ui/aiuto-automatico.tsx
 * Data creazione: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 09:55 — Fumetto informativo omogeneo per bottoni e campi, sempre contenuto nello schermo.
 */
import { useEffect, useRef, useState } from "react";
import { testoAiuto, posizionaFumetto } from "./aiuto-testi";

const SELETTORE = "button, a[href], [role='button'], input, select, textarea, [data-aiuto], [title]";

/** Fumetto globale: legge data-aiuto / title / aria-label / placeholder / dizionario comandi. */
export function AiutoAutomatico() {
  const [stato, setStato] = useState<{ testo: string; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const corrente = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const nascondi = () => {
      window.clearTimeout(timer.current);
      const el = corrente.current;
      if (el?.dataset.aiutoTitolo) { el.setAttribute("title", el.dataset.aiutoTitolo); delete el.dataset.aiutoTitolo; }
      corrente.current = null;
      setStato(null);
    };
    const mostra = (ev: Event) => {
      const el = (ev.target as Element | null)?.closest?.(SELETTORE) as HTMLElement | null;
      if (!el || el === corrente.current) return;
      nascondi();
      // Rispetta i fumetti già esistenti (Radix) e le esclusioni esplicite.
      if (el.closest("[data-aiuto-off]") || /open|closed/.test(el.getAttribute("data-state") ?? "") && el.hasAttribute("data-radix-collection-item") === false && !el.title && !el.dataset.aiuto && el.matches("[data-state][aria-describedby], a[data-state]")) return;
      const testo = testoAiuto(el);
      if (!testo) return;
      corrente.current = el;
      if (el.title) { el.dataset.aiutoTitolo = el.title; el.removeAttribute("title"); }
      timer.current = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        setStato({ testo, x: r.left + r.width / 2, y: r.bottom });
      }, 250);
    };
    const esci = (ev: Event) => {
      const el = corrente.current;
      const verso = (ev as MouseEvent).relatedTarget as Node | null;
      if (el && verso && el.contains(verso)) return;
      if (el && ev.type === "mouseout" && document.activeElement === el && el.matches("input, textarea, select")) return;
      nascondi();
    };
    document.addEventListener("mouseover", mostra);
    document.addEventListener("focusin", mostra);
    document.addEventListener("mouseout", esci);
    document.addEventListener("focusout", nascondi);
    document.addEventListener("mousedown", nascondi);
    window.addEventListener("scroll", nascondi, true);
    return () => {
      document.removeEventListener("mouseover", mostra);
      document.removeEventListener("focusin", mostra);
      document.removeEventListener("mouseout", esci);
      document.removeEventListener("focusout", nascondi);
      document.removeEventListener("mousedown", nascondi);
      window.removeEventListener("scroll", nascondi, true);
    };
  }, []);

  // Dopo il rendering misura il fumetto e lo riporta dentro lo schermo.
  useEffect(() => {
    const b = box.current;
    if (!stato || !b || !corrente.current) return;
    const p = posizionaFumetto(corrente.current.getBoundingClientRect(), b.offsetWidth, b.offsetHeight, window.innerWidth, window.innerHeight);
    b.style.left = `${p.left}px`;
    b.style.top = `${p.top}px`;
    b.style.visibility = "visible";
  }, [stato]);

  if (!stato) return null;
  return (
    <div
      ref={box}
      role="tooltip"
      style={{ position: "fixed", left: 0, top: 0, visibility: "hidden" }}
      className="pointer-events-none z-[100] max-w-[min(20rem,calc(100vw-1.5rem))] whitespace-normal break-words rounded-md bg-primary px-3 py-1.5 text-xs leading-snug text-primary-foreground shadow-md print:hidden"
    >
      {stato.testo}
    </div>
  );
}
