import React from 'react';
import { CARD, BTN } from '../../ui/styles.js';
import { uid } from '../../utils/dates.js';
import { InlineAIChat } from '../../ui/InlineAIChat.jsx';

export function BudgetTab({
  budget, setBudget, dashData, phases, setEditBudget,
  budgetChat, setBudgetChat, budgetInput, setBudgetInput, budgetLoading,
  sendBudgetMessage, anthropicKey, openaiKey, geminiKey,
}) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, padding: "14px", overflowY: "auto", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>💰 ניהול תקציב</div>
          <button onClick={() => setEditBudget({ category: "", planned: 0, actual: 0, phase: "", notes: "" })} style={BTN()}>+ סעיף</button>
        </div>

        {budget.length > 0 && (
          <div style={{ ...CARD, marginBottom: "12px", padding: "12px", background: "linear-gradient(135deg, #f0faf5, #fef9ef)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>
              <span>סה"כ מתוכנן: ₪{dashData.totalBudget.toLocaleString()}</span>
              <span style={{ color: dashData.budgetDiff >= 0 ? "#22c55e" : "#ef4444" }}>בפועל: ₪{dashData.totalActual.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: "#e5e5e5", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: 8, borderRadius: 4, width: `${dashData.totalBudget > 0 ? Math.min(100, dashData.totalActual / dashData.totalBudget * 100) : 0}%`, background: dashData.totalActual <= dashData.totalBudget ? "#22c55e" : "#ef4444" }} />
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", textAlign: "center" }}>{dashData.budgetDiff >= 0 ? `נותר ₪${dashData.budgetDiff.toLocaleString()}` : `חריגה של ₪${Math.abs(dashData.budgetDiff).toLocaleString()}`}</div>
          </div>
        )}

        {budget.length === 0 ? (
          <div style={{ ...CARD, textAlign: "center", padding: "28px", maxWidth: 420, margin: "20px auto" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>💰</div>
            <div style={{ fontWeight: 700, color: "#1a3a4a" }}>ניהול תקציב</div>
            <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 12px" }}>הוסף סעיפי תקציב לפי שלבים</p>
            <button onClick={() => {
              const defaultItems = phases.map((p) => ({ id: uid(), category: p.name, planned: 0, actual: 0, phase: p.name, notes: "" }));
              setBudget(defaultItems);
            }} style={BTN()}>🚀 צור סעיפים מהגאנט</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {budget.map((b) => {
              const pct = b.planned > 0 ? Math.round(b.actual / b.planned * 100) : 0;
              const over = b.actual > b.planned && b.planned > 0;
              return (
                <div key={b.id} style={{ ...CARD, padding: "10px 12px" }} onClick={() => setEditBudget({ ...b })}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a3a4a" }}>{b.category}</div>
                      <div style={{ fontSize: "10.5px", color: "#888" }}>{b.phase || "-"}{b.notes ? ` | ${b.notes}` : ""}</div>
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: over ? "#ef4444" : "#1a3a4a" }}>₪{(b.actual || 0).toLocaleString()}</div>
                      <div style={{ fontSize: "10px", color: "#888" }}>מתוך ₪{(b.planned || 0).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ height: 4, background: "#eee", borderRadius: 2, marginTop: 6 }}>
                    <div style={{ height: 4, borderRadius: 2, width: `${Math.min(100, pct)}%`, background: over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sendBudgetMessage && (
        <InlineAIChat
          chat={budgetChat}
          setChat={setBudgetChat}
          input={budgetInput}
          setInput={setBudgetInput}
          loading={budgetLoading}
          send={sendBudgetMessage}
          placeholder='עדכן תקציב או גאנט... (למשל: "הוסף סעיף חשמל 18000", "שלמתי 7500 על אינסטלציה")'
          disabled={!anthropicKey && !openaiKey && !geminiKey}
          icon="💰"
        />
      )}
    </div>
  );
}
