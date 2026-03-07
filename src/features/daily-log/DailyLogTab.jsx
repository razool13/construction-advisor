import React from 'react';
import { CARD, TAG, BTN } from '../../ui/styles.js';
import { formatDate, todayStr } from '../../utils/dates.js';

export function DailyLogTab({ dailyLogs, punchList, setEditLog, setEditPunch }) {
  return (
    <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>📝 יומן אתר</div>
        <button onClick={() => setEditLog({ date: todayStr(), weather: "☀️", workers: 0, phase: "", notes: "", issues: "" })} style={BTN()}>+ רשומה</button>
      </div>

      {dailyLogs.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "28px", maxWidth: 420, margin: "20px auto" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📝</div>
          <div style={{ fontWeight: 700, color: "#1a3a4a" }}>יומן אתר</div>
          <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 12px" }}>תעד עבודה יומית, מזג אוויר, עובדים, ליקויים</p>
          <button onClick={() => setEditLog({ date: todayStr(), weather: "☀️", workers: 0, phase: "", notes: "", issues: "" })} style={BTN()}>📝 רשומה ראשונה</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[...dailyLogs].reverse().map((log) => (
            <div key={log.id} style={CARD} onClick={() => setEditLog({ ...log })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a" }}>{log.weather} {formatDate(log.date)}</div>
                <div style={{ display: "flex", gap: "6px", fontSize: "11px" }}>
                  {log.workers > 0 && <span style={TAG("#3b82f620", "#3b82f6")}>👷 {log.workers}</span>}
                  {log.phase && <span style={TAG("#8b5cf620", "#8b5cf6")}>{log.phase}</span>}
                </div>
              </div>
              {log.notes && <div style={{ fontSize: "12px", color: "#555", lineHeight: 1.5 }}>{log.notes}</div>}
              {log.issues && <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "4px" }}>⚠️ {log.issues}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Punch-list section */}
      <div style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1a3a4a" }}>🔧 רשימת ליקויים</div>
          <button onClick={() => setEditPunch({ title: "", phase: "", severity: "medium", notes: "", resolved: false, date: todayStr() })} style={{ ...BTN("#ef4444"), fontSize: "12px" }}>+ ליקוי</button>
        </div>
        {punchList.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#999", textAlign: "center", padding: "12px" }}>אין ליקויים - מצוין! 🎉</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {punchList.map((p) => (
              <div key={p.id} onClick={() => setEditPunch({ ...p })} style={{ ...CARD, padding: "10px", opacity: p.resolved ? 0.6 : 1, borderRight: `3px solid ${p.severity === "high" ? "#ef4444" : p.severity === "medium" ? "#f59e0b" : "#22c55e"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a3a4a", textDecoration: p.resolved ? "line-through" : "none" }}>{p.title}</div>
                  <span style={{ fontSize: "11px", color: p.resolved ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{p.resolved ? "✅ טופל" : "⏳ פתוח"}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{p.phase || "-"} | {formatDate(p.date)}{p.notes ? ` | ${p.notes}` : ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
