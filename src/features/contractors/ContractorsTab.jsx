import React from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatDate } from '../../utils/dates.js';
import { stColors, WA_TEMPLATES, CONTRACTOR_DOC_TEMPLATES, docStColors } from '../../utils/constants.js';

export function ContractorsTab({ contractors, phases, setEditContractor, setWaCompose, setWaText, openWhatsApp, onPhaseClick, documents = [], onDocClick, onAddDoc }) {
  return (
    <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>👷 קבלנים</div>
        <button onClick={() => setEditContractor({ name: "", role: "", phone: "", notes: "" })} style={BTN()}>+ הוסף</button>
      </div>
      {contractors.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "36px 20px", maxWidth: 420, margin: "20px auto" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>👷</div>
          <div style={{ fontWeight: 700, color: "#1a3a4a" }}>הוסף קבלנים</div>
          <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 12px" }}>שמות, טלפונים - שלח וואטסאפ ישירות</p>
          <button onClick={() => setEditContractor({ name: "", role: "", phone: "", notes: "" })} style={BTN()}>+ קבלן ראשון</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {contractors.map((c) => {
            const ap = phases.filter((p) => p.contractor === c.name);
            const contractorDocs = documents.filter((d) => d.contractorId === c.id);
            const presentCategories = new Set(contractorDocs.map((d) => d.docCategory).filter(Boolean));
            return (
              <div key={c.id} style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14.5px", color: "#1a3a4a" }}>{c.name}</div>
                    <div style={{ fontSize: "12px", color: "#888" }}>{c.role}{c.phone ? ` • ${c.phone}` : ""}</div>
                  </div>
                  <button onClick={() => setEditContractor({ ...c })} style={{ background: "none", border: "none", cursor: "pointer" }}>✏️</button>
                </div>

                {/* Phase tags */}
                {ap.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                    {ap.map((p) => (
                      <span key={p.id} onClick={() => onPhaseClick && onPhaseClick(p.id)}
                        style={{ ...TAG(stColors[p.status] + "20", stColors[p.status]), cursor: "pointer" }}>
                        {p.name} ({p.progress || 0}%)
                      </span>
                    ))}
                  </div>
                )}

                {/* Document template checklist */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                  {CONTRACTOR_DOC_TEMPLATES.map((tpl) => {
                    const present = presentCategories.has(tpl.id);
                    return (
                      <span
                        key={tpl.id}
                        style={{
                          ...TAG(present ? "#22c55e20" : "#f59e0b20", present ? "#16a34a" : "#b45309"),
                          fontSize: "11px",
                          border: `1px solid ${present ? "#22c55e40" : "#f59e0b40"}`,
                        }}
                        title={present ? "קיים" : "חסר"}
                      >
                        {present ? "✓" : "!"} {tpl.icon} {tpl.label}
                      </span>
                    );
                  })}
                </div>

                {/* Linked documents list */}
                {contractorDocs.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", marginBottom: "4px" }}>
                      📄 מסמכים ({contractorDocs.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {contractorDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => onDocClick && onDocClick(doc)}
                          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "8px", background: "#f8f6f3", cursor: "pointer", fontSize: "12px" }}
                        >
                          <span style={{ fontSize: "14px" }}>
                            {doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}
                          </span>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1a3a4a" }}>
                            {doc.title}
                          </span>
                          <span style={TAG((docStColors[doc.status] || "#888") + "20", docStColors[doc.status] || "#888")}>
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add document to contractor */}
                {onAddDoc && (
                  <div style={{ marginTop: "8px" }}>
                    <input
                      type="file"
                      id={`doc-upload-${c.id}`}
                      style={{ display: "none" }}
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { onAddDoc(file, c.id); e.target.value = ""; }
                      }}
                    />
                    <label htmlFor={`doc-upload-${c.id}`} style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "11.5px", padding: "5px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      📎 הוסף מסמך
                    </label>
                  </div>
                )}

                {/* WhatsApp buttons */}
                {c.phone && (
                  <div style={{ display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => { const cp = ap[0] || {}; setWaCompose(c); setWaText(WA_TEMPLATES[0].text.replace("{name}", c.name).replace("{phase}", cp.name || "השלב").replace("{progress}", cp.progress || 0).replace("{startDate}", formatDate(cp.start)).replace("{endDate}", formatDate(cp.end))); }} style={{ ...BTN("#25d366", "#fff"), fontSize: "12px", padding: "5px 10px" }}>📱 וואטסאפ</button>
                    {["סטטוס", "תיאום", "תזכורת", "תודה"].map((label, idx) => {
                      const tIdx = [0, 1, 4, 5][idx]; const cp = ap[0] || {};
                      return <button key={label} onClick={() => { setWaCompose(c); setWaText(WA_TEMPLATES[tIdx].text.replace("{name}", c.name).replace("{phase}", cp.name || "השלב").replace("{progress}", cp.progress || 0).replace("{startDate}", formatDate(cp.start)).replace("{endDate}", formatDate(cp.end))); }}
                        style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "11px", padding: "5px 8px" }}>{WA_TEMPLATES[tIdx].icon} {label}</button>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {contractors.filter((c) => c.phone).length > 1 && (
        <div style={{ ...CARD, marginTop: "12px", padding: "12px" }}>
          <div style={{ fontWeight: 700, fontSize: "12.5px", color: "#1a3a4a", marginBottom: "6px" }}>📢 בדיקת סטטוס מרוכזת</div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {contractors.filter((c) => c.phone).map((c) => {
              const cp = phases.find((p) => p.contractor === c.name) || {};
              return <button key={c.id} onClick={() => openWhatsApp(c.phone, WA_TEMPLATES[0].text.replace("{name}", c.name).replace("{phase}", cp.name || "השלב").replace("{progress}", cp.progress || 0).replace("{startDate}", formatDate(cp.start)).replace("{endDate}", formatDate(cp.end)))}
                style={{ ...BTN("#25d36620", "#25d366"), fontSize: "11px", padding: "4px 8px", border: "1px solid #25d36640" }}>📱 {c.name}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
