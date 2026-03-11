import React, { useState } from 'react';
import { Overlay } from '../../ui/Overlay.jsx';
import { BTN, INP } from '../../ui/styles.js';

export function SettingsPanel({ onClose, provider, setProvider, anthropicKey, setAnthropicKey, openaiKey, setOpenaiKey, geminiKey, setGeminiKey }) {
  const [settingsTab, setSettingsTab] = useState(provider);
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(() => localStorage.getItem('openai-base-url') || '');
  const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('openai-model') || '');

  const PROVIDERS = [
    { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", url: "https://console.anthropic.com/settings/keys", urlLabel: "console.anthropic.com ↗", key: anthropicKey, setKey: setAnthropicKey, storageKey: "anthropic-api-key" },
    { id: "openai", label: "ChatGPT", placeholder: "sk-...", url: "https://platform.openai.com/api-keys", urlLabel: "platform.openai.com ↗", key: openaiKey, setKey: setOpenaiKey, storageKey: "openai-api-key" },
    { id: "gemini", label: "Gemini", placeholder: "AIza...", url: "https://aistudio.google.com/app/apikey", urlLabel: "aistudio.google.com ↗", key: geminiKey, setKey: setGeminiKey, storageKey: "gemini-api-key" },
  ];

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>⚙️ הגדרות AI</span>
        <button onClick={onClose} style={BTN("#f0f0f0", "#555")}>✕</button>
      </div>
      <div style={{ display: "flex", borderBottom: "2px solid #eee", padding: "0 20px" }}>
        {PROVIDERS.map((p) => (
          <button key={p.id} onClick={() => setSettingsTab(p.id)}
            style={{
              flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: "13px", fontWeight: settingsTab === p.id ? 700 : 400,
              color: settingsTab === p.id ? "#1a3a4a" : "#888",
              background: "transparent",
              borderBottom: settingsTab === p.id ? "2px solid #2d8a6e" : "2px solid transparent",
              marginBottom: "-2px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}>
            {p.label}
            {provider === p.id && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d8a6e", display: "inline-block", flexShrink: 0 }} />}
          </button>
        ))}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {PROVIDERS.filter((p) => p.id === settingsTab).map((p) => (
          <div key={p.id}>
            <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "8px" }}>
              🔑 API Key — <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2d8a6e" }}>{p.urlLabel}</a>
            </div>
            <input type="password" value={p.key}
              onChange={e => { p.setKey(e.target.value); localStorage.setItem(p.storageKey, e.target.value); }}
              placeholder={p.placeholder} style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
            {p.key
              ? <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "6px", fontWeight: 600 }}>✅ מפתח מוגדר</div>
              : <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px", fontWeight: 600 }}>❌ נדרש מפתח</div>}
            {p.id === "openai" && (
              <div style={{ marginTop: "14px", borderTop: "1px solid #eee", paddingTop: "14px" }}>
                <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "6px" }}>
                  🌐 Endpoint מותאם אישית <span style={{ color: "#aaa" }}>(לרשת פנימית — השאר ריק לשימוש ב-api.openai.com)</span>
                </div>
                <input type="text" value={openaiBaseUrl}
                  onChange={e => { setOpenaiBaseUrl(e.target.value); localStorage.setItem('openai-base-url', e.target.value); }}
                  placeholder="http://your-internal-server:8080/v1"
                  style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
                <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "6px", marginTop: "10px" }}>
                  🤖 שם מודל <span style={{ color: "#aaa" }}>(השאר ריק לשימוש ב-gpt-4o)</span>
                </div>
                <input type="text" value={openaiModel}
                  onChange={e => { setOpenaiModel(e.target.value); localStorage.setItem('openai-model', e.target.value); }}
                  placeholder="gpt-4o"
                  style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
              </div>
            )}
            {provider === p.id
              ? <div style={{ fontSize: "12px", color: "#2d8a6e", marginTop: "8px", fontWeight: 600 }}>✓ ספק פעיל</div>
              : <button onClick={() => { setProvider(p.id); localStorage.setItem("ai-provider", p.id); }} style={{ ...BTN(), marginTop: "8px", fontSize: "12px", padding: "6px 14px" }}>בחר ספק זה</button>}
          </div>
        ))}
      </div>
    </Overlay>
  );
}
