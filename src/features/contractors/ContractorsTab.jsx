import React, { useState } from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatDate } from '../../utils/dates.js';
import { stColors, WA_TEMPLATES, CONTRACTOR_DOC_TEMPLATES, docStColors } from '../../utils/constants.js';
import { Overlay } from '../../ui/Overlay.jsx';
import { FileSelectionDialog } from '../../ui/FileSelectionDialog.jsx';

export function ContractorsTab({ contractors, phases, setEditContractor, setWaCompose, setWaText, openWhatsApp, onPhaseClick, documents = [], onDocClick, onAddDoc, onLinkDoc }) {
  const [pickerState, setPickerState] = useState(null); // { contractorId, category, contractorName }
  const [fileSelectState, setFileSelectState] = useState(null); // { docs, category, contractorName }
  const [hoveredDoc, setHoveredDoc] = useState(null); // doc id for preview tooltip

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

                {/* Document completeness progress */}
                {(() => {
                  const filled = CONTRACTOR_DOC_TEMPLATES.filter(t => presentCategories.has(t.id)).length;
                  const total = CONTRACTOR_DOC_TEMPLATES.length;
                  const pct = Math.round((filled / total) * 100);
                  const barColor = filled === total ? "#22c55e" : filled >= total / 2 ? "#f59e0b" : "#ef4444";
                  return (
                    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, height: "6px", background: "#eee", borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: "3px", transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: barColor, whiteSpace: "nowrap" }}>
                        {filled}/{total} מסמכים
                      </span>
                    </div>
                  );
                })()}

                {/* Document template checklist */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                  {CONTRACTOR_DOC_TEMPLATES.map((tpl) => {
                    const present = presentCategories.has(tpl.id);
                    const docCount = contractorDocs.filter(d => d.docCategory === tpl.id).length;
                    return (
                      <span
                        key={tpl.id}
                        onClick={() => {
                          if (present) {
                            const matchingDocs = contractorDocs.filter(d => d.docCategory === tpl.id);
                            if (matchingDocs.length === 1) {
                              onDocClick && onDocClick(matchingDocs[0]);
                            } else {
                              setFileSelectState({ docs: matchingDocs, category: tpl.id, contractorName: c.name });
                            }
                          } else {
                            setPickerState({ contractorId: c.id, category: tpl.id, contractorName: c.name });
                          }
                        }}
                        style={{
                          ...TAG(present ? "#22c55e20" : "#f59e0b20", present ? "#16a34a" : "#b45309"),
                          fontSize: "11px",
                          border: `1px solid ${present ? "#22c55e40" : "#f59e0b40"}`,
                          cursor: "pointer",
                          position: "relative",
                        }}
                        title={present ? (docCount > 1 ? `${docCount} מסמכים — לחץ לבחירה` : "לחץ לפתיחת המסמך") : "לחץ לקישור מסמך"}
                      >
                        {present ? "✓" : "!"} {tpl.icon} {tpl.label}
                        {docCount > 1 && (
                          <span style={{
                            background: "#16a34a", color: "#fff", borderRadius: "50%",
                            width: "16px", height: "16px", fontSize: "10px", fontWeight: 700,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            marginRight: "-2px", marginLeft: "2px",
                          }}>
                            {docCount}
                          </span>
                        )}
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
                      {contractorDocs.map((doc) => {
                        const catTpl = CONTRACTOR_DOC_TEMPLATES.find(t => t.id === doc.docCategory);
                        return (
                          <div
                            key={doc.id}
                            onClick={() => onDocClick && onDocClick(doc)}
                            onMouseEnter={() => setHoveredDoc(doc.id)}
                            onMouseLeave={() => setHoveredDoc(null)}
                            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 8px", borderRadius: "8px", background: "#f8f6f3", cursor: "pointer", fontSize: "12px", position: "relative", transition: "background 0.15s" }}
                          >
                            <span style={{ fontSize: "14px" }}>
                              {doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}
                            </span>
                            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1a3a4a" }}>
                              {doc.title}
                            </span>
                            {catTpl && (
                              <span style={{ fontSize: "10px", color: "#aaa" }}>{catTpl.icon}</span>
                            )}
                            <span style={TAG((docStColors[doc.status] || "#888") + "20", docStColors[doc.status] || "#888")}>
                              {doc.status}
                            </span>
                            {/* Hover preview tooltip */}
                            {hoveredDoc === doc.id && (
                              <div style={{
                                position: "absolute", bottom: "100%", right: 0, marginBottom: "4px",
                                background: "#1a3a4a", color: "#fff", borderRadius: "10px",
                                padding: "8px 12px", fontSize: "11px", zIndex: 10,
                                minWidth: "200px", maxWidth: "300px",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                                pointerEvents: "none",
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: "3px" }}>{doc.title}</div>
                                <div style={{ color: "#aac" }}>{doc.date} {catTpl ? `• ${catTpl.label}` : ""}</div>
                                {doc.extractedContent && (
                                  <div style={{ marginTop: "4px", color: "#ccd", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                    {doc.extractedContent.slice(0, 120)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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

      {/* Document picker overlay */}
      {pickerState && (
        <Overlay onClose={() => setPickerState(null)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a3a4a" }}>
                {CONTRACTOR_DOC_TEMPLATES.find((t) => t.id === pickerState.category)?.icon}{" "}
                {CONTRACTOR_DOC_TEMPLATES.find((t) => t.id === pickerState.category)?.label}
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>בחר מסמך לקישור ל{pickerState.contractorName}</div>
            </div>
            <button onClick={() => setPickerState(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#888" }}>✕</button>
          </div>
          <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
            {documents.length === 0 ? (
              <div style={{ textAlign: "center", color: "#888", padding: "24px", fontSize: "13px" }}>אין מסמכים בארכיון</div>
            ) : (
              <>
                {documents.filter((d) => d.docCategory === pickerState.category).length > 0 && (
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", marginBottom: "6px" }}>
                    מסמכים מאותה קטגוריה
                  </div>
                )}
                {documents.filter((d) => d.docCategory === pickerState.category).map((doc) => (
                  <div key={doc.id} onClick={() => { onLinkDoc && onLinkDoc(doc.id, pickerState.contractorId, pickerState.category); setPickerState(null); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "#f5f0ff", cursor: "pointer", marginBottom: "6px", border: "1px solid #6366f130" }}>
                    <span style={{ fontSize: "18px" }}>{doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a3a4a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>{doc.date}</div>
                    </div>
                  </div>
                ))}
                {documents.filter((d) => d.docCategory !== pickerState.category).length > 0 && (
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", marginBottom: "6px", marginTop: "8px" }}>
                    כל המסמכים
                  </div>
                )}
                {documents.filter((d) => d.docCategory !== pickerState.category).map((doc) => (
                  <div key={doc.id} onClick={() => { onLinkDoc && onLinkDoc(doc.id, pickerState.contractorId, pickerState.category); setPickerState(null); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", borderRadius: "10px", background: "#f8f6f3", cursor: "pointer", marginBottom: "6px", border: "1px solid #eee" }}>
                    <span style={{ fontSize: "18px" }}>{doc.type === "pdf" ? "📄" : doc.type === "image" ? "🖼️" : "📝"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a3a4a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>{doc.date}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid #eee" }}>
            <input
              type="file"
              id={`picker-upload-${pickerState.contractorId}-${pickerState.category}`}
              style={{ display: "none" }}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.txt,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file && onAddDoc) {
                  onAddDoc(file, pickerState.contractorId, pickerState.category);
                  setPickerState(null);
                  e.target.value = "";
                }
              }}
            />
            <label htmlFor={`picker-upload-${pickerState.contractorId}-${pickerState.category}`}
              style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "12px", padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              📎 העלה מסמך חדש
            </label>
          </div>
        </Overlay>
      )}

      {/* File selection dialog for multiple docs in same category */}
      {fileSelectState && (
        <FileSelectionDialog
          docs={fileSelectState.docs}
          categoryId={fileSelectState.category}
          contractorName={fileSelectState.contractorName}
          onSelect={(doc) => { onDocClick && onDocClick(doc); setFileSelectState(null); }}
          onClose={() => setFileSelectState(null)}
        />
      )}
    </div>
  );
}
