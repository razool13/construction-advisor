import React from 'react';
import { CARD, TAG } from '../../ui/styles.js';
import { docStColors } from '../../utils/constants.js';

export function DocsTab({ documents, setDocuments, setViewDoc }) {
  return (
    <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>📄 ארכיון מסמכים</div>
        <div style={{ fontSize: "12px", color: "#888" }}>מסמכים שצורפו ונותחו נשמרים אוטומטית</div>
      </div>
      {documents.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "36px 20px", maxWidth: 450, margin: "20px auto" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
          <div style={{ fontWeight: 700, color: "#1a3a4a", marginBottom: "4px" }}>אין מסמכים עדיין</div>
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>צרף הצעת מחיר או מסמך בצ'אט - והוא יישמר כאן אוטומטית עם הניתוח</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.map((doc) => (
            <div key={doc.id} onClick={() => setViewDoc(doc)} style={{ ...CARD, cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)"; }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                {doc.preview ? (
                  <img src={doc.preview} alt="" style={{ width: 52, height: 52, borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: "8px", background: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
                    {doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#1a3a4a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                    <span style={TAG((docStColors[doc.status] || "#888") + "20", docStColors[doc.status] || "#888")}>{doc.status}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{doc.date}</div>
                  <div style={{ fontSize: "12px", color: "#555", maxHeight: "32px", overflow: "hidden", lineHeight: 1.4 }}>
                    {doc.analysis?.slice(0, 120)}...
                  </div>
                  {(doc.actionItems || []).length > 0 && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#2d8a6e" }}>
                      ✅ {doc.actionItems.filter((a) => a.done).length}/{doc.actionItems.length} צעדים הושלמו
                    </div>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setDocuments((p) => p.filter((d) => d.id !== doc.id)); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "4px", flexShrink: 0 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
