import { handleApiError } from '../provider.js';

export async function chatAnthropic({ apiKey, systemPrompt, messages, userContent, fetchWithTimeout }) {
  const apiMsgs = [
    ...messages.map((m) => ({ role: m.role, content: m.apiContent || m.displayText || m.content || "" })),
    { role: "user", content: userContent },
  ];
  const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2025-04-14",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6", max_tokens: 4000,
      system: systemPrompt,
      messages: apiMsgs,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });
  const apiErr = await handleApiError(resp, "Anthropic");
  if (apiErr) return { text: apiErr, usedSearch: false };
  const data = await resp.json();
  if (data.error) return { text: `❌ שגיאת Anthropic: ${data.error.message || JSON.stringify(data.error)}`, usedSearch: false };
  const text = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "❌ Anthropic לא החזיר תשובה. נסה שוב.";
  const usedSearch = data.content?.some((b) => b.type === "web_search_tool_result" || b.type === "server_tool_use");
  return { text, usedSearch };
}

export async function chatAnthropicSimple({ apiKey, systemPrompt, chatHistory, text, doFetch }) {
  const resp = await doFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2025-04-14", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, system: systemPrompt, messages: [...chatHistory, { role: "user", content: text }] }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  return data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "שגיאה";
}
