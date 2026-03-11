import React from 'react';
import { Overlay } from './Overlay.jsx';
import { TAG } from './styles.js';
import { CONTRACTOR_DOC_TEMPLATES, docStColors } from '../utils/constants.js';

export function FileSelectionDialog({ docs, categoryId, contractorName, onSelect, onClose }) {
  const tpl = CONTRACTOR_DOC_TEMPLATES.find(t => t.id === categoryId);

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a3a4a" }}>
            {tpl?.icon} {tpl?.label} — {contractorName}
          </div>
          <div style={{ fontSize: "12px", color: "#888" }}>
            {docs.length} מסמכים — בחר לצפייה
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#888" }}>✕</button>
      </div>
      <div style={{ padding: "12px 16px", overflowY: "auto", maxHeight: "60vh" }}>
        {docs.map(doc => (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 12px", borderRadius: "10px",
              background: "#f8f6f3", cursor: "pointer",
              marginBottom: "6px", border: "1px solid #eee",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0ece6"}
            onMouseLeave={e => e.currentTarget.style.background = "#f8f6f3"}
          >
            <span style={{ fontSize: "18px" }}>
              {doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a3a4a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.title}
              </div>
              <div style={{ fontSize: "11px", color: "#888" }}>{doc.date}</div>
            </div>
            <span style={TAG((docStColors[doc.status] || "#888") + "20", docStColors[doc.status] || "#888")}>
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </Overlay>
  );
}
