import { handleApiError } from '../provider.js';

export async function chatGemini({ apiKey, systemPrompt, messages, fullText, curAttach, extractText, fetchWithTimeout }) {
  const geminiHistory = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: extractText(m.apiContent) || m.displayText || m.content || "" }],
  }));
  const currentParts = [];
  curAttach.forEach((a) => {
    if (a.type === "image") currentParts.push({ inlineData: { mimeType: a.mediaType, data: a.data } });
    else if (a.type === "pdf" && a.data) currentParts.push({ inlineData: { mimeType: "application/pdf", data: a.data } });
  });
  currentParts.push({ text: fullText || "נתח" });
  const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt + "\n\n⚡ חשוב: היה תמציתי וממוקד. תשובות קצרות עם עיקרי הדברים. אל תחזור על עצמך. השתמש בנקודות תמציתיות." }] },
      contents: [...geminiHistory, { role: "user", parts: currentParts }],
      tools: [{ googleSearch: {} }],
    }),
  });
  const apiErr = await handleApiError(resp, "Gemini");
  if (apiErr) return { text: apiErr, usedSearch: false };
  const data = await resp.json();
  if (data.error) return { text: `❌ שגיאת Gemini: ${data.error.message || JSON.stringify(data.error)}`, usedSearch: false };
  const text = data.candidates?.[0]?.content?.parts?.filter((p) => p.text).map((p) => p.text).join("\n") || "❌ Gemini לא החזיר תשובה. נסה שוב.";
  const grounding = data.candidates?.[0]?.groundingMetadata;
  const usedSearch = !!(grounding?.searchEntryPoint || grounding?.groundingChunks?.length);
  return { text, usedSearch };
}

export async function chatGeminiSimple({ apiKey, systemPrompt, chatHistory, text, doFetch }) {
  const gemHist = chatHistory.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const resp = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [...gemHist, { role: "user", parts: [{ text }] }], tools: [{ googleSearch: {} }] }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.filter((p) => p.text).map((p) => p.text).join("\n") || "שגיאה";
}
