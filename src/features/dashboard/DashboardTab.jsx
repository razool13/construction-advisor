import React from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatDate } from '../../utils/dates.js';
import { stColors } from '../../utils/constants.js';

export function DashboardTab({ dashData, notifications, smartSuggestions, phases, exportCSV, quickExport, setActiveTab }) {
  return (
    <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", marginBottom: "14px" }}>
        <div style={{ ...CARD, textAlign: "center", padding: "12px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#2d8a6e" }}>{dashData.overallProgress}%</div>
          <div style={{ fontSize: "11px", color: "#888" }}>התקדמות כללית</div>
          <div style={{ height: 4, background: "#eee", borderRadius: 2, marginTop: 6 }}><div style={{ height: 4, background: "#2d8a6e", borderRadius: 2, width: `${dashData.overallProgress}%` }} /></div>
        </div>
        <div style={{ ...CARD, textAlign: "center", padding: "12px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#1a3a4a" }}>{dashData.donePhases}/{dashData.totalPhases}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>שלבים הושלמו</div>
          <div style={{ display: "flex", gap: "3px", justifyContent: "center", marginTop: 6 }}>
            {dashData.activePhases > 0 && <span style={TAG("#f59e0b20", "#f59e0b")}>🔨 {dashData.activePhases}</span>}
            {dashData.delayedPhases > 0 && <span style={TAG("#ef444420", "#ef4444")}>⚠️ {dashData.delayedPhases}</span>}
          </div>
        </div>
        <div style={{ ...CARD, textAlign: "center", padding: "12px" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, color: dashData.budgetDiff >= 0 ? "#22c55e" : "#ef4444" }}>₪{Math.abs(dashData.budgetDiff).toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>{dashData.budgetDiff >= 0 ? "תחת התקציב" : "חריגה"}</div>
          <div style={{ fontSize: "10px", color: "#aaa", marginTop: 4 }}>מתוך ₪{dashData.totalBudget.toLocaleString()}</div>
        </div>
        <div style={{ ...CARD, textAlign: "center", padding: "12px" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "#8b5cf6" }}>{dashData.openPunch}</div>
          <div style={{ fontSize: "11px", color: "#888" }}>ליקויים פתוחים</div>
          <div style={{ fontSize: "10px", color: "#aaa", marginTop: 4 }}>{dashData.openDocs} מסמכים בטיפול</div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div style={{ ...CARD, marginBottom: "14px", padding: "12px", border: "1px solid #fecaca" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "8px" }}>🔔 התראות ({notifications.length})</div>
          {notifications.map((n, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: i < notifications.length - 1 ? "1px solid #f5f5f5" : "none", fontSize: "12px", alignItems: "center" }}>
              <span>{n.icon}</span>
              <span style={{ flex: 1, color: n.type === "danger" ? "#ef4444" : n.type === "warn" ? "#f59e0b" : "#555" }}>{n.text}</span>
            </div>
          ))}
        </div>
      )}

      {smartSuggestions.length > 0 && (
        <div style={{ ...CARD, marginBottom: "14px", padding: "12px", border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#166534", marginBottom: "8px" }}>💡 המלצות חכמות</div>
          {smartSuggestions.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", padding: "6px 0", borderBottom: i < smartSuggestions.length - 1 ? "1px solid #dcfce7" : "none", fontSize: "12px", alignItems: "center" }}>
              <span>{s.icon}</span>
              <span style={{ flex: 1, color: "#333" }}>{s.text}</span>
              {s.action && <button onClick={s.action} style={{ ...BTN("#2d8a6e"), fontSize: "10px", padding: "3px 8px", whiteSpace: "nowrap" }}>{s.btn}</button>}
            </div>
          ))}
        </div>
      )}

      <div style={{ ...CARD, marginBottom: "14px", padding: "12px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "8px" }}>📊 שלבים פעילים</div>
        {phases.filter((p) => p.status === "active" || p.status === "delayed").length === 0
          ? <div style={{ fontSize: "12px", color: "#999" }}>אין שלבים פעילים כרגע</div>
          : phases.filter((p) => p.status === "active" || p.status === "delayed").map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: stColors[p.status], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#1a3a4a" }}>{p.name}</div>
              <div style={{ fontSize: "10.5px", color: "#888" }}>{p.contractor || "-"} | {formatDate(p.start)}-{formatDate(p.end)}</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: "13px", color: p.progress >= 80 ? "#22c55e" : "#f59e0b" }}>{p.progress || 0}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={exportCSV} style={{ ...BTN("#2563eb"), fontSize: "12px" }}>📊 ייצוא CSV</button>
        <button onClick={quickExport} style={{ ...BTN("#059669"), fontSize: "12px" }}>💾 גיבוי מהיר</button>
        <button onClick={() => setActiveTab("budget")} style={{ ...BTN("#7c3aed"), fontSize: "12px" }}>💰 ניהול תקציב</button>
      </div>
    </div>
  );
}
