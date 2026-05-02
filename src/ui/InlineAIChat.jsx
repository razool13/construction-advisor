import React, { useEffect, useRef } from 'react';
import { BTN, INP, TAG } from './styles.js';
import { formatMsg } from './Markdown.jsx';

/**
 * Reusable inline AI chat strip used at the bottom of feature tabs (Gantt, Budget, ...).
 * Displays a message log + a single-line input and a send button.
 *
 * Props:
 *  - chat: [{ role: 'user'|'assistant', text, loading?, ganttCmds?, budgetCmds? }]
 *  - setChat
 *  - input, setInput, loading
 *  - send(text)
 *  - placeholder
 *  - disabled (typically: no API key)
 *  - icon (string emoji shown next to input)
 */
export function InlineAIChat({ chat, setChat, input, setInput, loading, send, placeholder, disabled, icon = '💬' }) {
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50);
    }
  }, [chat]);

  return (
    <div style={{ borderTop: "2px solid #e5e5e5", background: "#fff", flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: chat.length > 0 ? "45%" : "auto" }}>
      {chat.length > 0 && (
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", minHeight: 0 }}>
          {chat.map((m, i) => {
            const cmdCount = (m.ganttCmds?.length || 0) + (m.budgetCmds?.length || 0);
            const cmdLabels = [];
            if (m.ganttCmds?.length) cmdLabels.push(`📊 ${m.ganttCmds.length} בגאנט`);
            if (m.budgetCmds?.length) cmdLabels.push(`💰 ${m.budgetCmds.length} בתקציב`);
            return (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "4px" }}>
                <div style={{
                  background: m.role === "user" ? "#1a3a4a" : m.loading ? "#f5f0eb" : "#f0faf5",
                  color: m.role === "user" ? "#fff" : "#2c2c2c",
                  borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  padding: "8px 12px", maxWidth: "85%", fontSize: "12.5px", lineHeight: 1.5,
                }}>
                  {m.loading ? <span style={{ color: "#999" }}>⏳ חושב...</span> : (
                    <>
                      {cmdCount > 0 && (
                        <div style={{ ...TAG("#fef3c7", "#92400e"), marginBottom: "4px", fontSize: "10px" }}>
                          {cmdLabels.join(" · ")} {cmdCount === 1 ? "שינוי" : "שינויים"} בוצעו
                        </div>
                      )}
                      {formatMsg(m.text)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", alignItems: "center", background: "#fafafa", borderTop: chat.length > 0 ? "1px solid #eee" : "none" }}>
        <div style={{ fontSize: "12px", color: "#2d8a6e", fontWeight: 700, flexShrink: 0 }}>{icon}</div>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder={placeholder}
          disabled={loading || disabled}
          style={{ ...INP, fontSize: "12.5px", padding: "8px 10px", borderRadius: "10px", border: "1.5px solid #e0e0e0" }}
        />
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          style={{ ...BTN(loading ? "#ccc" : "#2d8a6e"), fontSize: "13px", padding: "8px 14px", flexShrink: 0 }}
        >{loading ? "⏳" : "🚀"}</button>
        {chat.length > 0 && (
          <button onClick={() => setChat([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#999", flexShrink: 0 }} title="נקה צ'אט">✕</button>
        )}
      </div>
    </div>
  );
}
