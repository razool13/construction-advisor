import React from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatDate } from '../../utils/dates.js';
import { stColors, WA_TEMPLATES } from '../../utils/constants.js';

export function ContractorsTab({ contractors, phases, setEditContractor, setWaCompose, setWaText, openWhatsApp, onPhaseClick }) {
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
            return (
              <div key={c.id} style={CARD}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontWeight: 700, fontSize: "14.5px", color: "#1a3a4a" }}>{c.name}</div><div style={{ fontSize: "12px", color: "#888" }}>{c.role}{c.phone ? ` • ${c.phone}` : ""}</div></div>
                  <button onClick={() => setEditContractor({ ...c })} style={{ background: "none", border: "none", cursor: "pointer" }}>✏️</button>
                </div>
                {ap.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>{ap.map((p) => <span key={p.id} onClick={() => onPhaseClick && onPhaseClick(p.id)} style={{ ...TAG(stColors[p.status] + "20", stColors[p.status]), cursor: "pointer" }}>{p.name} ({p.progress || 0}%)</span>)}</div>}
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
