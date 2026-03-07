import { handleApiError } from '../provider.js';

export async function chatOpenAI({ apiKey, systemPrompt, messages, fullText, curAttach, extractText, fetchWithTimeout }) {
  const oaiUserContent = [];
  curAttach.forEach((a) => {
    if (a.type === "image") oaiUserContent.push({ type: "image_url", image_url: { url: `data:${a.mediaType};base64,${a.data}` } });
  });
  oaiUserContent.push({ type: "text", text: fullText || "נתח" });
  const oaiMsgs = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: extractText(m.apiContent) || m.displayText || m.content || "",
    })),
    { role: "user", content: oaiUserContent.length === 1 ? oaiUserContent[0].text : oaiUserContent },
  ];
  const resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: 4000, messages: oaiMsgs }),
  });
  const apiErr = await handleApiError(resp, "OpenAI");
  if (apiErr) return { text: apiErr, usedSearch: false };
  const data = await resp.json();
  if (data.error) return { text: `❌ שגיאת OpenAI: ${data.error.message || JSON.stringify(data.error)}`, usedSearch: false };
  return { text: data.choices?.[0]?.message?.content || "❌ OpenAI לא החזיר תשובה. נסה שוב.", usedSearch: false };
}

export async function chatOpenAISimple({ apiKey, systemPrompt, chatHistory, text, doFetch }) {
  const resp = await doFetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", max_tokens: 2000, messages: [{ role: "system", content: systemPrompt }, ...chatHistory.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }] }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "שגיאה";
}
