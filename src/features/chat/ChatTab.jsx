import React, { useState } from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatMsg } from '../../ui/Markdown.jsx';
import { CATEGORIES } from '../../utils/constants.js';

export function ChatTab({
  activeKey, provider, setShowSettings,
  showIntro, setShowIntro,
  messages, messagesEndRef,
  input, setInput, textareaRef,
  loading, sendMessage,
  attachments, removeAttachment, processingFile,
  dragOver, setDragOver, handleDrop,
  fileInputRef, processFile,
  documents, contractors, addStoredDocAsAttachment,
}) {
  const [showDocPicker, setShowDocPicker] = useState(false);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
      onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}>

      {dragOver && (
        <div style={{ position: "absolute", inset: 8, background: "rgba(45,138,110,0.12)", border: "3px dashed #2d8a6e", borderRadius: "12px", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "20px 36px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "6px" }}>📎</div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>שחרר כאן</div>
            <div style={{ fontSize: "12px", color: "#666" }}>תמונות • PDF • טקסט</div>
          </div>
        </div>
      )}

      {!activeKey && (
        <div style={{ background: "#fef3c7", borderBottom: "1px solid #f59e0b", padding: "10px 16px", fontSize: "13px", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>⚠️ לא הוגדר API Key — היועץ לא יעבוד</span>
          <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: "#2d8a6e", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: "13px" }}>הגדר עכשיו ←</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {showIntro ? (
          <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
            <div style={{ ...CARD, textAlign: "center", marginBottom: "14px", padding: "22px" }}>
              <div style={{ fontSize: "34px", marginBottom: "8px" }}>🏗️</div>
              <h2 style={{ margin: "0 0 6px", fontSize: "19px", fontWeight: 800, color: "#1a3a4a" }}>ברוך הבא לפרויקט הבנייה</h2>
              <p style={{ margin: "0 0 12px", color: "#666", fontSize: "13.5px" }}>שאל, צרף הצעות מחיר, בקש מחקר - בגישה דיפלומטית ומקצועית</p>
              <div style={{ background: "#f0faf5", border: "2px dashed #2d8a6e40", borderRadius: "12px", padding: "14px", maxWidth: "380px", margin: "0 auto" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>📎</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#2d6b5a" }}>גרור קובץ או לחץ 📎</div>
                <div style={{ fontSize: "11px", color: "#888" }}>תמונות • PDF • הצעות מחיר</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px", marginBottom: "14px" }}>
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => { setShowIntro(false); setInput(c.label + ": "); setTimeout(() => textareaRef.current?.focus(), 50); }}
                  style={{ ...CARD, cursor: "pointer", textAlign: "center", padding: "12px 8px", fontFamily: "inherit", border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: "18px" }}>{c.icon}</div>
                  <div style={{ fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>{c.label}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["מה חייב להיות בחוזה?", "מחיר למ״ר?", "איך בוחרים אדריכל?"].map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: 500 }}>{q}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-start" : "flex-end" }}>
                <div style={{
                  maxWidth: msg.role === "assistant" ? "88%" : "78%",
                  background: msg.role === "user" ? "linear-gradient(135deg, #1a3a4a, #2d5a4a)" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#2c2c2c",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: msg.role === "user" ? "12px 16px" : "14px 18px",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.08)", fontSize: "13.5px", lineHeight: 1.65,
                  border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.04)" : "none",
                }}>
                  {msg.loading ? (
                    <div style={{ display: "flex", gap: "5px", padding: "6px 2px", alignItems: "center" }}>
                      {[0, 1, 2].map((j) => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d8a6e", animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />)}
                      <span style={{ fontSize: "11px", color: "#999", marginRight: "6px" }}>מנתח...</span>
                    </div>
                  ) : msg.role === "assistant" ? (
                    <>
                      {msg.usedSearch && <div style={TAG("#f0faf5", "#2d8a6e")}>🔍 כולל חיפוש</div>}
                      {msg.ganttCmds && <div style={TAG("#fef3c7", "#92400e")}>📊 הגאנט עודכן ({msg.ganttCmds.length} {msg.ganttCmds.length === 1 ? "שינוי" : "שינויים"})</div>}
                      <div style={{ marginTop: (msg.usedSearch || msg.ganttCmds) ? "8px" : 0 }}>{formatMsg(msg.content || "")}</div>
                    </>
                  ) : (
                    <>
                      {msg.displayPreviews?.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                          {msg.displayPreviews.map((a, j) => <img key={j} src={a.preview} alt="" style={{ maxWidth: "160px", maxHeight: "100px", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.3)" }} />)}
                        </div>
                      )}
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.displayText || ""}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ padding: "8px 14px 0", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.04)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {attachments.map((a, i) => (
            <div key={i} style={{ background: "#f5f0eb", borderRadius: "10px", padding: "5px 10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
              {a.preview ? <img src={a.preview} alt="" style={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }} /> : <span>{a.type === "pdf" ? "📄" : "📝"}</span>}
              <span style={{ fontWeight: 500, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
              <button onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "13px", padding: "0 2px" }}>✕</button>
            </div>
          ))}
        </div>
      )}
      {processingFile && <div style={{ padding: "4px 14px", background: "#fff", textAlign: "center", fontSize: "12px", color: "#2d8a6e", fontWeight: 600 }}>⏳ מעבד...</div>}

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "10px 14px", background: "#fff", flexShrink: 0 }}>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.csv,.json,.md,.html" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) Array.from(e.target.files).forEach(processFile); e.target.value = ""; }} />
        <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: "6px", alignItems: "flex-end", position: "relative" }}>
          {showDocPicker && (
            <div onClick={() => setShowDocPicker(false)}
              style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          )}
          {showDocPicker && (
            <div style={{ position: "absolute", bottom: "44px", right: 0, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, width: "280px", maxHeight: "260px", overflowY: "auto", padding: "6px" }}>
              <div style={{ fontSize: "11px", color: "#999", padding: "4px 8px 6px", fontWeight: 600 }}>מסמכים שמורים</div>
              {!documents?.length ? (
                <div style={{ padding: "12px", fontSize: "12px", color: "#aaa", textAlign: "center" }}>אין מסמכים שמורים</div>
              ) : documents.map((doc) => {
                const ctractor = contractors?.find((x) => x.id === doc.contractorId);
                const icon = doc.type === "image" ? "🖼️" : doc.type === "pdf" ? "📄" : "📝";
                return (
                  <button key={doc.id}
                    onClick={() => { addStoredDocAsAttachment(doc); setShowDocPicker(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 10px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "8px", fontFamily: "inherit", textAlign: "right" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f0eb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#1a3a4a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize: "10.5px", color: "#888" }}>{ctractor ? ctractor.name : "ללא קבלן"} · {doc.date}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <button onClick={() => setShowDocPicker((v) => !v)} title="מסמך שמור"
            style={{ width: 36, height: 36, borderRadius: "10px", background: showDocPicker ? "#e0f0ea" : "#f5f0eb", border: showDocPicker ? "1px solid #2d8a6e" : "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>📁</button>
          <button onClick={() => fileInputRef.current?.click()} title="צרף קובץ" style={{ width: 36, height: 36, borderRadius: "10px", background: "#f5f0eb", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>📎</button>
          <div style={{ flex: 1, background: "#f5f0eb", borderRadius: "14px", border: "2px solid transparent", padding: "1px", transition: "border-color 0.2s" }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#2d8a6e"; }} onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}>
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={attachments.length ? "הוסף הוראות (אופציונלי)..." : "שאל, הדבק הצעה, או גרור קובץ..."}
              rows={1} style={{ width: "100%", border: "none", background: "transparent", padding: "9px 12px", resize: "none", outline: "none", fontSize: "13.5px", lineHeight: 1.5, fontFamily: "inherit", direction: "rtl", maxHeight: "180px" }} />
          </div>
          <button onClick={() => sendMessage(input)} disabled={(!input.trim() && !attachments.length) || loading}
            style={{ width: 36, height: 36, borderRadius: "10px", background: (input.trim() || attachments.length) && !loading ? "linear-gradient(135deg, #1a3a4a, #2d6b5a)" : "#ddd", border: "none", cursor: (input.trim() || attachments.length) && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleX(-1)" }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#fff" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
