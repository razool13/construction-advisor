import React, { useState, useRef, useEffect } from 'react';
import { CARD, TAG, BTN, INP } from '../../ui/styles.js';
import { formatDate, addDays, daysBetween, todayStr, clamp, uid } from '../../utils/dates.js';
import { stColors, stLabels, stCycle, PHASES_TEMPLATE } from '../../utils/constants.js';
import { formatMsg } from '../../ui/Markdown.jsx';

export function GanttTab({
  phases, setPhases, projectStart, setProjectStart,
  ganttVersions, setGanttVersions,
  ganttChat, setGanttChat, ganttInput, setGanttInput, ganttLoading,
  sendGanttMessage, setEditPhase,
  anthropicKey, openaiKey, geminiKey,
  highlightPhaseId, setHighlightPhaseId,
}) {
  const [showGanttHistory, setShowGanttHistory] = useState(false);
  const [dragPhaseId, setDragPhaseId] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const ganttChatRef = useRef(null);
  const ganttInputRef = useRef(null);
  const ganttScrollRef = useRef(null);
  const phaseRowRefs = useRef({});

  // Scroll to and auto-clear highlighted phase
  useEffect(() => {
    if (highlightPhaseId) {
      const el = phaseRowRefs.current[highlightPhaseId];
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      }
      const timer = setTimeout(() => setHighlightPhaseId && setHighlightPhaseId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightPhaseId, setHighlightPhaseId]);

  // Auto-scroll Gantt chart to today's position
  useEffect(() => {
    if (ganttScrollRef.current && phases.length > 0) {
      setTimeout(() => {
        const el = ganttScrollRef.current;
        if (!el) return;
        const today = new Date(todayStr());
        const dates = phases.flatMap((p) => [new Date(p.start), new Date(p.end)]);
        dates.push(today);
        const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates));
        min.setDate(min.getDate() - 7); max.setDate(max.getDate() + 14);
        const minDate = min.toISOString().split("T")[0];
        const totalDays = daysBetween(minDate, max.toISOString().split("T")[0]);
        const todayPct = clamp(daysBetween(minDate, todayStr()) / totalDays, 0, 1);
        const scrollTarget = el.scrollWidth * (1 - todayPct) - el.clientWidth * 0.3;
        el.scrollLeft = -Math.max(0, scrollTarget);
        if (el.scrollLeft === 0 && scrollTarget > 0) el.scrollLeft = scrollTarget;
      }, 100);
    }
  }, [phases]);

  // Auto-scroll gantt chat when messages change
  useEffect(() => {
    if (ganttChatRef.current) {
      setTimeout(() => ganttChatRef.current?.scrollTo(0, ganttChatRef.current.scrollHeight), 50);
    }
  }, [ganttChat]);

  const initPhases = () => {
    let s = projectStart;
    setPhases(PHASES_TEMPLATE.map((t) => {
      const e = addDays(s, t.duration);
      const p = { ...t, start: s, end: e, status: "pending", contractor: "", progress: 0, id: uid() };
      s = e; return p;
    }));
  };

  const getGanttRange = () => {
    if (!phases.length) return { minDate: todayStr(), totalDays: 365 };
    const today = new Date(todayStr());
    const dates = phases.flatMap((p) => [new Date(p.start), new Date(p.end)]);
    dates.push(today);
    const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 7); max.setDate(max.getDate() + 14);
    return { minDate: min.toISOString().split("T")[0], totalDays: daysBetween(min.toISOString().split("T")[0], max.toISOString().split("T")[0]) };
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ flex: 1, padding: "14px", overflowY: "auto", minHeight: 0 }}>
      {phases.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", maxWidth: 460, margin: "40px auto", padding: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>📊</div>
          <h3 style={{ margin: "0 0 6px", color: "#1a3a4a", fontWeight: 800, fontSize: "17px" }}>תרשים גאנט</h3>
          <p style={{ color: "#666", fontSize: "13px", margin: "0 0 14px" }}>תוכנית עבודה עם שלבים, קבלנים ומעקב</p>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#666" }}>תאריך התחלה</label>
            <input type="date" value={projectStart} onChange={(e) => setProjectStart(e.target.value)} style={{ ...INP, maxWidth: "180px", margin: "4px auto 0", display: "block" }} />
          </div>
          <button onClick={initPhases} style={BTN()}>🚀 צור תוכנית</button>
        </div>
      ) : (() => {
        const { minDate, totalDays } = getGanttRange();
        const months = [];
        const d = new Date(minDate);
        while (d <= new Date(addDays(minDate, totalDays))) {
          months.push({ label: d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" }), offset: daysBetween(minDate, d.toISOString().split("T")[0]) / totalDays * 100 });
          d.setMonth(d.getMonth() + 1); d.setDate(1);
        }
        const todayOff = clamp(daysBetween(minDate, todayStr()) / totalDays * 100, 0, 100);
        return (
          <>
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {Object.entries(stLabels).map(([k, v]) => { const n = phases.filter((p) => p.status === k).length; return n > 0 ? <div key={k} style={TAG(stColors[k] + "20", stColors[k])}>{v}: {n}</div> : null; })}
              <div style={{ flex: 1 }} />
              <button onClick={() => { const np = { name: "שלב חדש", start: phases[phases.length - 1]?.end || todayStr(), end: addDays(phases[phases.length - 1]?.end || todayStr(), 21), color: "#6366f1", status: "pending", contractor: "", progress: 0, id: uid() }; setPhases((p) => [...p, np]); setEditPhase(np); }} style={{ ...BTN(), fontSize: "12px", padding: "5px 12px" }}>+ שלב</button>
              {ganttVersions.length > 0 && (
                <button onClick={() => setShowGanttHistory((v) => !v)} style={{ ...BTN(showGanttHistory ? "#7c3aed" : "#8b5cf620", showGanttHistory ? "#fff" : "#7c3aed"), fontSize: "12px", padding: "5px 12px", border: "1px solid #8b5cf640" }}>🕐 גרסאות ({ganttVersions.length})</button>
              )}
            </div>
            {showGanttHistory && ganttVersions.length > 0 && (
              <div style={{ ...CARD, marginBottom: "10px", border: "1px solid #8b5cf630", background: "#faf8ff" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#7c3aed", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>🕐 היסטוריית גרסאות</span>
                  <button onClick={() => { if (confirm("למחוק את כל היסטוריית הגרסאות?")) setGanttVersions([]); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#999" }}>🗑️ נקה</button>
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {[...ganttVersions].reverse().map((v, i) => (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", borderBottom: "1px solid #e5e0f0", fontSize: "12px" }}>
                      <span style={{ color: "#8b5cf6", fontWeight: 600, whiteSpace: "nowrap", minWidth: "110px", direction: "ltr", textAlign: "right" }}>{v.date}</span>
                      <span style={{ flex: 1, color: "#555" }}>{v.label}</span>
                      <button onClick={() => {
                        if (confirm(`לשחזר את הגאנט לגרסה מ-${v.date}?\n(הגרסה הנוכחית תישמר אוטומטית)`)) {
                          setGanttVersions((prev) => [...prev, {
                            id: uid(),
                            date: new Date().toLocaleString("he-IL"),
                            label: "שמירה אוטומטית לפני שחזור",
                            phases: JSON.parse(JSON.stringify(phases)),
                          }]);
                          setPhases(v.phases);
                        }
                      }} style={{ ...BTN("#8b5cf6"), fontSize: "10px", padding: "3px 8px", whiteSpace: "nowrap" }}>↩ שחזר</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={ganttScrollRef} style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <div style={{ minWidth: Math.max(600, totalDays * 2.5) }}>
                {/* Month headers */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: "4px", borderBottom: "1px solid #e5e5e5" }}>
                  <div style={{ width: "120px", flexShrink: 0, position: "sticky", right: 0, zIndex: 3, background: "#f5f0eb" }} />
                  <div style={{ flex: 1, position: "relative", height: "22px" }}>
                    {months.map((m, i) => <div key={i} style={{ position: "absolute", right: `${m.offset}%`, fontSize: "10px", color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</div>)}
                    <div style={{ position: "absolute", right: `${todayOff}%`, top: 0, bottom: "-4px", width: "1.5px", background: "#ef4444", zIndex: 2, opacity: 0.6 }} />
                    <div style={{ position: "absolute", right: `${todayOff}%`, top: "-2px", transform: "translateX(50%)", fontSize: "8px", color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap", background: "#f5f0eb", padding: "0 2px", borderRadius: "2px" }}>היום</div>
                  </div>
                </div>
                {phases.map((phase, idx) => {
                  const sOff = clamp(daysBetween(minDate, phase.start) / totalDays * 100, 0, 100);
                  const w = clamp(daysBetween(phase.start, phase.end) / totalDays * 100, 0.5, 100 - sOff);
                  const isDragging = dragPhaseId === phase.id;
                  const isOver = dragOverIdx === idx && dragPhaseId !== phase.id;
                  const isHighlighted = highlightPhaseId === phase.id;
                  return (
                    <div
                      key={phase.id}
                      ref={(el) => { phaseRowRefs.current[phase.id] = el; }}
                      draggable
                      onDragStart={(e) => { setDragPhaseId(phase.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", phase.id); }}
                      onDragEnd={() => { setDragPhaseId(null); setDragOverIdx(null); }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverIdx(idx); }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = dragPhaseId;
                        if (!fromId || fromId === phase.id) { setDragPhaseId(null); setDragOverIdx(null); return; }
                        setPhases((prev) => {
                          const fromIdx = prev.findIndex((p) => p.id === fromId);
                          if (fromIdx === -1) return prev;
                          const item = prev[fromIdx];
                          const without = prev.filter((_, i) => i !== fromIdx);
                          const toIdx = without.findIndex((p) => p.id === phase.id);
                          without.splice(toIdx === -1 ? without.length : toIdx, 0, item);
                          return without;
                        });
                        setDragPhaseId(null); setDragOverIdx(null);
                      }}
                      onClick={() => { if (!dragPhaseId) setEditPhase({ ...phase }); }}
                      style={{
                        display: "flex", alignItems: "center", marginBottom: "2px", cursor: isDragging ? "grabbing" : "grab", padding: "3px 0",
                        opacity: isDragging ? 0.4 : 1,
                        borderTop: isOver ? "2px solid #2d8a6e" : "2px solid transparent",
                        transition: "border-top 0.15s, opacity 0.15s, background 0.5s, box-shadow 0.5s",
                        background: isHighlighted ? "#d1fae5" : "transparent",
                        boxShadow: isHighlighted ? "0 0 8px rgba(45,138,110,0.4)" : "none",
                        borderRadius: isHighlighted ? "6px" : "0",
                      }}
                    >
                      <div style={{ width: "120px", flexShrink: 0, paddingLeft: "4px", display: "flex", alignItems: "center", gap: "2px", position: "sticky", right: 0, zIndex: 3, background: "#f5f0eb" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0px", flexShrink: 0 }}
                          onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => { e.stopPropagation(); if (idx === 0) return; setPhases((p) => { const a = [...p]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; }); }}
                            disabled={idx === 0}
                            style={{ background: "none", border: "none", cursor: idx > 0 ? "pointer" : "default", fontSize: "8px", padding: "0 2px", lineHeight: 1, color: idx > 0 ? "#888" : "#ddd" }}>▲</button>
                          <button onClick={(e) => { e.stopPropagation(); if (idx === phases.length - 1) return; setPhases((p) => { const a = [...p]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; }); }}
                            disabled={idx === phases.length - 1}
                            style={{ background: "none", border: "none", cursor: idx < phases.length - 1 ? "pointer" : "default", fontSize: "8px", padding: "0 2px", lineHeight: 1, color: idx < phases.length - 1 ? "#888" : "#ddd" }}>▼</button>
                        </div>
                        <div style={{ overflow: "hidden", flex: 1 }}>
                          <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#1a3a4a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{phase.name}</div>
                          <div style={{ fontSize: "9.5px", color: "#999" }}>{phase.contractor || ""}</div>
                        </div>
                      </div>
                      <div style={{ flex: 1, position: "relative", height: "26px" }}>
                        <div style={{ position: "absolute", right: `${todayOff}%`, top: 0, bottom: 0, width: "1.5px", background: "#ef4444", zIndex: 2, opacity: 0.3 }} />
                        <div style={{ position: "absolute", right: `${sOff}%`, width: `${w}%`, top: "2px", bottom: "2px", borderRadius: "5px", background: phase.color + "20", border: `1.5px solid ${phase.color}35` }}>
                          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${phase.progress || 0}%`, background: phase.color, borderRadius: "4px", opacity: 0.5 }} />
                          <div onClick={(e) => { e.stopPropagation(); const nextSt = stCycle[(stCycle.indexOf(phase.status) + 1) % stCycle.length]; setPhases((prev) => prev.map((p) => p.id === phase.id ? { ...p, status: nextSt, progress: nextSt === "done" ? 100 : p.progress } : p)); }} title={`${stLabels[phase.status]} — לחץ לשנות`} style={{ position: "absolute", left: "3px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", borderRadius: "50%", background: stColors[phase.status], border: "2px solid #fff", cursor: "pointer", zIndex: 4, boxShadow: "0 0 3px rgba(0,0,0,0.2)" }} />
                          <div style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: phase.color, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(phase.start)}-{formatDate(phase.end)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Milestone markers row */}
                {(() => {
                  const milestones = [];
                  phases.forEach((p) => {
                    if (p.start === p.end) milestones.push({ date: p.start, label: p.name, color: p.color });
                  });
                  if (phases.length > 0) {
                    const projEnd = phases.reduce((mx, p) => p.end > mx ? p.end : mx, phases[0].end);
                    milestones.push({ date: projectStart, label: "תחילת פרויקט", color: "#2d8a6e" });
                    milestones.push({ date: projEnd, label: "סיום צפוי", color: "#7c3aed" });
                  }
                  return milestones.length > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", marginTop: "4px" }}>
                      <div style={{ width: "120px", flexShrink: 0, position: "sticky", right: 0, zIndex: 3, background: "#f5f0eb", fontSize: "9px", color: "#888", fontWeight: 600 }}>אבני דרך</div>
                      <div style={{ flex: 1, position: "relative", height: "20px" }}>
                        {milestones.map((m, i) => {
                          const off = clamp(daysBetween(minDate, m.date) / totalDays * 100, 0, 100);
                          return <div key={i} title={`${m.label} (${formatDate(m.date)})`} style={{ position: "absolute", right: `${off}%`, top: "50%", transform: "translate(50%, -50%) rotate(45deg)", width: "8px", height: "8px", background: m.color, border: "1.5px solid #fff", zIndex: 2, boxShadow: "0 0 3px rgba(0,0,0,0.15)", cursor: "default" }} />;
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "10px", color: "#888", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 8, height: 1.5, background: "#ef4444" }} />היום ({formatDate(todayStr())})</span>
                  {Object.entries(stLabels).map(([k, v]) => <span key={k} style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: stColors[k] }} />{v}</span>)}
                  <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 7, height: 7, background: "#7c3aed", transform: "rotate(45deg)" }} />אבן דרך</span>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>

    {/* Gantt inline chat */}
    <div style={{ borderTop: "2px solid #e5e5e5", background: "#fff", flexShrink: 0, display: "flex", flexDirection: "column", maxHeight: ganttChat.length > 0 ? "45%" : "auto" }}>
      {ganttChat.length > 0 && (
        <div ref={ganttChatRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", minHeight: 0 }}>
          {ganttChat.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "4px" }}>
              <div style={{
                background: m.role === "user" ? "#1a3a4a" : m.loading ? "#f5f0eb" : "#f0faf5",
                color: m.role === "user" ? "#fff" : "#2c2c2c",
                borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                padding: "8px 12px", maxWidth: "85%", fontSize: "12.5px", lineHeight: 1.5,
              }}>
                {m.loading ? <span style={{ color: "#999" }}>⏳ חושב...</span> : (
                  <>
                    {m.ganttCmds && <div style={{ ...TAG("#fef3c7", "#92400e"), marginBottom: "4px", fontSize: "10px" }}>📊 {m.ganttCmds.length} {m.ganttCmds.length === 1 ? "שינוי" : "שינויים"} בוצעו</div>}
                    {formatMsg(m.text)}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: "6px", padding: "8px 12px", alignItems: "center", background: "#fafafa", borderTop: ganttChat.length > 0 ? "1px solid #eee" : "none" }}>
        <div style={{ fontSize: "12px", color: "#2d8a6e", fontWeight: 700, flexShrink: 0 }}>📊</div>
        <input
          ref={ganttInputRef}
          value={ganttInput}
          onChange={(e) => setGanttInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendGanttMessage(ganttInput); } }}
          placeholder='עדכן גאנט... (למשל: "הזז שלד לעוד שבועיים", "הוסף שלב בדיקות")'
          disabled={ganttLoading || (!anthropicKey && !openaiKey && !geminiKey)}
          style={{ ...INP, fontSize: "12.5px", padding: "8px 10px", borderRadius: "10px", border: "1.5px solid #e0e0e0" }}
        />
        <button
          onClick={() => sendGanttMessage(ganttInput)}
          disabled={ganttLoading || !ganttInput.trim()}
          style={{ ...BTN(ganttLoading ? "#ccc" : "#2d8a6e"), fontSize: "13px", padding: "8px 14px", flexShrink: 0 }}
        >{ganttLoading ? "⏳" : "🚀"}</button>
        {ganttChat.length > 0 && (
          <button onClick={() => setGanttChat([])} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#999", flexShrink: 0 }} title="נקה צ'אט">✕</button>
        )}
      </div>
    </div>
    </div>
  );
}
