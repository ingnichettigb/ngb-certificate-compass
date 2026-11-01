/*
 * File:          setup.ts
 * Percorso:      src/test/setup.ts
 * Data creazione: 2026-10-16
 * Revisioni:
 *   - Rev 1 (2026-10-16 12:25): Prima stesura ambiente di test (jest-dom, scrollTo, matchMedia).
 *   - Rev 2 (2026-11-01 20:45): Aggiunto stub ResizeObserver, richiesto dai componenti Radix in jsdom.
 */
import "@testing-library/jest-dom/vitest";

// jsdom non fornisce ResizeObserver: i componenti Radix (Select, ecc.) lo usano al mount.
class ResizeObserverFinto {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverFinto as unknown as typeof ResizeObserver;

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
