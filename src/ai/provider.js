import { chatAnthropic, chatAnthropicSimple } from './providers/anthropic.js';
import { chatOpenAI, chatOpenAISimple } from './providers/openai.js';
import { chatGemini, chatGeminiSimple } from './providers/gemini.js';

/**
 * Handle API error responses with human-readable Hebrew messages.
 */
export async function handleApiError(resp, providerName) {
  if (resp.ok) return null;
  let detail = "";
  try { const d = await resp.json(); detail = d.error?.message || ""; } catch {}
  if (resp.status === 400)
    return `❌ בקשה שגויה ל-${providerName}: ${detail || "בדוק הגדרות API."}`;
  if (resp.status === 401 || resp.status === 403)
    return `❌ מפתח ה-API של ${providerName} שגוי או שפג תוקפו. עדכן בהגדרות.`;
  if (resp.status === 429)
    return `⏳ חריגה ממגבלת בקשות ${providerName} (גם אחרי ניסיון חוזר). ${providerName === "Gemini" ? "ב-Gemini חינמי יש מגבלה של 15 בקשות לדקה. " : ""}המתן דקה ונסה שוב.`;
  if (resp.status >= 500)
    return `❌ שגיאת שרת ${providerName} (${resp.status}). נסה שוב בעוד מספר דקות.`;
  return `❌ שגיאה מ-${providerName} (${resp.status}): ${detail || "נסה שוב."}`;
}

/**
 * Create a fetch wrapper with timeout and single retry on 429.
 */
export function createFetchWithTimeout(timeoutMs) {
  return async (url, options) => {
    const doFetch = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return resp;
      } catch (e) {
        clearTimeout(id);
        if (e.name === "AbortError") throw new Error(`הבקשה נכשלה — עברו ${timeoutMs / 1000} שניות ללא תגובה. בדוק את החיבור לאינטרנט ונסה שוב.`);
        throw e;
      }
    };
    const resp = await doFetch();
    if (resp.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return doFetch();
    }
    return resp;
  };
}

/**
 * Create a simple fetch with timeout (for Gantt chat - no 429 retry).
 */
export function createSimpleFetch(timeoutMs = 60000) {
  return async (url, opts) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try { const r = await fetch(url, { ...opts, signal: ctrl.signal }); clearTimeout(t); return r; }
    catch (e) { clearTimeout(t); throw e; }
  };
}

/**
 * Helper to extract text from potentially array apiContent.
 */
export function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "";
  return "";
}

/**
 * Unified chat function - dispatches to the correct provider.
 */
export async function sendToProvider({ provider, apiKey, systemPrompt, messages, userContent, fullText, curAttach, fetchWithTimeout }) {
  if (provider === "anthropic") {
    return chatAnthropic({ apiKey, systemPrompt, messages, userContent, fetchWithTimeout });
  } else if (provider === "openai") {
    return chatOpenAI({ apiKey, systemPrompt, messages, fullText, curAttach, extractText, fetchWithTimeout });
  } else if (provider === "gemini") {
    return chatGemini({ apiKey, systemPrompt, messages, fullText, curAttach, extractText, fetchWithTimeout });
  }
  return { text: "❌ ספק AI לא מוכר", usedSearch: false };
}

/**
 * Unified simple chat function (for Gantt chat).
 */
export async function sendToProviderSimple({ provider, apiKey, systemPrompt, chatHistory, text, doFetch }) {
  if (provider === "anthropic") {
    return chatAnthropicSimple({ apiKey, systemPrompt, chatHistory, text, doFetch });
  } else if (provider === "openai") {
    return chatOpenAISimple({ apiKey, systemPrompt, chatHistory, text, doFetch });
  } else if (provider === "gemini") {
    return chatGeminiSimple({ apiKey, systemPrompt, chatHistory, text, doFetch });
  }
  return "❌ ספק AI לא מוכר";
}
