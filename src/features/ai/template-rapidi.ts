/*
 * File:      template-rapidi.ts
 * Percorso:  src/features/ai/template-rapidi.ts
 * Precompilazioni rapide per aggiungere un fornitore AI (Gemini, Mistral, OpenRouter).
 */

export interface TemplateAiRapido {
  etichetta: string;
  nome: string;
  baseUrl: string;
  model: string;
  keyUrl: string;
  suggerimentoChiave: string;
}

export const TEMPLATE_RAPIDI: TemplateAiRapido[] = [
  {
    etichetta: "✨ Google Gemini 2.0 Flash (Gratis)",
    nome: "Google AI Studio – Gemini 2.0 Flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    keyUrl: "https://aistudio.google.com/app/apikey",
    suggerimentoChiave: "AIzaSy...",
  },
  {
    etichetta: "🌪️ Mistral Pixtral (Visione)",
    nome: "Mistral – Pixtral 12B",
    baseUrl: "https://api.mistral.ai/v1",
    model: "pixtral-12b-2409",
    keyUrl: "https://console.mistral.ai/api-keys/",
    suggerimentoChiave: "chiave Mistral",
  },
  {
    etichetta: "🌐 OpenRouter Free Vision",
    nome: "OpenRouter – Gemini 2.0 Flash Free",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "google/gemini-2.0-flash-exp:free",
    keyUrl: "https://openrouter.ai/keys",
    suggerimentoChiave: "sk-or-...",
  },
];
