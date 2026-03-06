import React, { useState, useRef } from 'react';
import { Overlay } from '../../ui/Overlay.jsx';
import { BTN } from '../../ui/styles.js';
import { formatDate, todayStr } from '../../utils/dates.js';
import { stLabels, GOOGLE_CLIENT_ID } from '../../utils/constants.js';

export function BackupPanel({ onClose, knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList, setKnowledgeBase, setPhases, setContractors, setDocuments, setProjectStart, setBudget, setDailyLogs, setPunchList, lastBackup, updateLastBackup }) {
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef(null);

  const [gToken, setGToken] = useState(() => sessionStorage.getItem("drive-token") || "");
  const [gUser, setGUser] = useState(() => localStorage.getItem("drive-user") || "");
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveStatus, setDriveStatus] = useState("");
  const [loadingDrive, setLoadingDrive] = useState(false);

  const buildSummaryText = () => {
    let t = `# סיכום פרויקט בנייה\nתאריך: ${new Date().toLocaleString("he-IL")}\n\n`;
    t += `## שלבי הפרויקט\n`;
    phases.forEach(p => { t += `- ${p.name}: ${formatDate(p.start)} - ${formatDate(p.end)} | ${stLabels[p.status] || p.status} | ${p.progress || 0}% | קבלן: ${p.contractor || "-"}\n`; });
    t += `\n## קבלנים\n`;
    contractors.forEach(c => { t += `- ${c.name} (${c.role}): ${c.phone}${c.notes ? " | " + c.notes : ""}\n`; });
    t += `\n## בסיס ידע (${knowledgeBase.length})\n`;
    knowledgeBase.forEach(k => { t += `\n### ${k.title}\n${k.content}\n`; });
    t += `\n## מסמכים (${documents.length})\n`;
    documents.forEach(d => {
      t += `\n### ${d.title} [${d.status}] - ${d.date}\n${d.analysis?.slice(0, 500) || ""}\n`;
      if (d.actionItems?.length) { t += `צעדים:\n`; d.actionItems.forEach(a => { t += `  ${a.done ? "V" : " "} ${a.text}\n`; }); }
      if (d.notes) t += `הערות: ${d.notes}\n`;
    });
    if (budget.length) {
      const totalP = budget.reduce((s, b) => s + (b.planned || 0), 0);
      const totalA = budget.reduce((s, b) => s + (b.actual || 0), 0);
      t += `\n## תקציב\nסה"כ מתוכנן: ₪${totalP.toLocaleString()} | בפועל: ₪${totalA.toLocaleString()} | ${totalA <= totalP ? "בתקציב" : "חריגה: ₪" + (totalA - totalP).toLocaleString()}\n`;
      budget.forEach(b => { t += `- ${b.category}: ₪${(b.planned || 0).toLocaleString()} / ₪${(b.actual || 0).toLocaleString()}${b.notes ? " | " + b.notes : ""}\n`; });
    }
    if (punchList.length) {
      t += `\n## ליקויים (${punchList.filter(p => !p.resolved).length} פתוחים)\n`;
      punchList.forEach(p => { t += `- ${p.resolved ? "[V]" : "[ ]"} ${p.title} (${p.phase || "-"}) ${p.severity}\n`; });
    }
    if (dailyLogs.length) {
      t += `\n## יומן אתר (${dailyLogs.length} רשומות)\n`;
      dailyLogs.slice(-5).forEach(l => { t += `- ${l.date} ${l.weather} | ${l.workers} עובדים | ${l.notes || ""}\n`; });
    }
    return t;
  };

  const loadGIS = () => new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve;
    document.head.appendChild(s);
  });

  const getOrCreateFolder = async (token) => {
    const folderName = "גיבויי פרויקט בנייה";
    const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await r.json();
    if (data.files?.length > 0) return data.files[0].id;
    const cr = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
    });
    const fd = await cr.json();
    return fd.id;
  };

  const loadDriveFiles = async (token) => {
    setLoadingDrive(true);
    try {
      const folderId = await getOrCreateFolder(token);
      const q = `'${folderId}' in parents and name contains 'גיבוי_' and trashed=false`;
      const r = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=createdTime+desc&pageSize=10&fields=files(id,name,createdTime)`,
        { headers: { Authorization: "Bearer " + token } }
      );
      const data = await r.json();
      setDriveFiles(data.files || []);
    } catch (e) { setDriveStatus("❌ " + e.message); }
    setLoadingDrive(false);
  };

  const signIn = async () => {
    if (!GOOGLE_CLIENT_ID) { setDriveStatus("❌ Client ID לא מוגדר בקוד"); return; }
    setDriveStatus("⏳ טוען...");
    try {
      await loadGIS();
      setDriveStatus("");
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: async (response) => {
          if (response.error) { setDriveStatus("❌ " + response.error); return; }
          const token = response.access_token;
          sessionStorage.setItem("drive-token", token);
          setGToken(token);
          try {
            const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: "Bearer " + token },
            });
            const u = await r.json();
            const email = u.email || "מחובר";
            localStorage.setItem("drive-user", email);
            setGUser(email);
          } catch {}
          setDriveStatus("");
          loadDriveFiles(token);
        },
      });
      client.requestAccessToken();
    } catch (e) { setDriveStatus("❌ " + e.message); }
  };

  const signOut = () => {
    try { if (gToken) window.google?.accounts?.oauth2?.revoke(gToken, () => {}); } catch {}
    sessionStorage.removeItem("drive-token");
    localStorage.removeItem("drive-user");
    setGToken(""); setGUser(""); setDriveFiles([]); setDriveStatus("");
  };

  const saveToDrive = async () => {
    if (!gToken) return;
    setLoadingDrive(true); setDriveStatus("⏳ שומר ב-Drive...");
    try {
      const folderId = await getOrCreateFolder(gToken);
      const ts = new Date();
      const dateStr = ts.toLocaleDateString("he-IL").replace(/\./g, "-");
      const timeStr = ts.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }).replace(":", "-");
      const stamp = `${dateStr}_${timeStr}`;
      const backup = { version: 3, exportDate: ts.toISOString(), knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList };
      const uploadFile = async (name, content, mimeType) => {
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify({ name, parents: [folderId] })], { type: "application/json" }));
        form.append("file", new Blob([content], { type: mimeType }));
        return fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: { Authorization: "Bearer " + gToken },
          body: form,
        });
      };
      await uploadFile(`גיבוי_${stamp}.json`, JSON.stringify(backup, null, 2), "application/json");
      await uploadFile(`סיכום_${stamp}.txt`, buildSummaryText(), "text/plain");
      setDriveStatus("✅ נשמר ב-Drive!");
      if (updateLastBackup) updateLastBackup();
      loadDriveFiles(gToken);
    } catch (e) { setDriveStatus("❌ " + e.message); }
    setLoadingDrive(false);
  };

  const restoreFromDrive = async (fileId) => {
    if (!window.confirm("לשחזר גיבוי זה? הנתונים הנוכחיים יוחלפו.")) return;
    setLoadingDrive(true); setDriveStatus("⏳ משחזר...");
    try {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: "Bearer " + gToken },
      });
      const data = await r.json();
      if (!data.version) { setDriveStatus("❌ קובץ לא תקין"); setLoadingDrive(false); return; }
      if (data.knowledgeBase?.length) setKnowledgeBase(data.knowledgeBase);
      if (data.phases?.length) setPhases(data.phases);
      if (data.contractors?.length) setContractors(data.contractors);
      if (data.documents?.length) setDocuments(data.documents);
      if (data.projectStart) setProjectStart(data.projectStart);
      if (data.budget?.length) setBudget(data.budget);
      if (data.dailyLogs?.length) setDailyLogs(data.dailyLogs);
      if (data.punchList?.length) setPunchList(data.punchList);
      setDriveStatus("✅ שוחזר!");
    } catch (e) { setDriveStatus("❌ " + e.message); }
    setLoadingDrive(false);
  };

  const deleteDriveFile = async (fileId) => {
    if (!window.confirm("למחוק גיבוי זה?")) return;
    setLoadingDrive(true);
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + gToken },
      });
      setDriveFiles((p) => p.filter((f) => f.id !== fileId));
      setDriveStatus("✅ נמחק");
    } catch (e) { setDriveStatus("❌ " + e.message); }
    setLoadingDrive(false);
  };

  const exportAll = () => {
    const data = { version: 3, exportDate: new Date().toISOString(), knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `backup-project-${new Date().toLocaleDateString("he-IL").replace(/\./g, "-")}.json`;
    a.click(); URL.revokeObjectURL(url);
    if (updateLastBackup) updateLastBackup();
  };

  const exportSummary = () => {
    const blob = new Blob([buildSummaryText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `summary-project-${new Date().toLocaleDateString("he-IL").replace(/\./g, "-")}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.version) { setImportStatus("❌ קובץ לא תקין"); return; }
        let c = 0;
        if (data.knowledgeBase?.length) { setKnowledgeBase(data.knowledgeBase); c += data.knowledgeBase.length; }
        if (data.phases?.length) { setPhases(data.phases); c += data.phases.length; }
        if (data.contractors?.length) { setContractors(data.contractors); c += data.contractors.length; }
        if (data.documents?.length) { setDocuments(data.documents); c += data.documents.length; }
        if (data.projectStart) setProjectStart(data.projectStart);
        if (data.budget?.length) { setBudget(data.budget); c += data.budget.length; }
        if (data.dailyLogs?.length) { setDailyLogs(data.dailyLogs); c += data.dailyLogs.length; }
        if (data.punchList?.length) { setPunchList(data.punchList); c += data.punchList.length; }
        setImportStatus(`✅ יובאו ${c} פריטים!`);
      } catch { setImportStatus("❌ שגיאה בקריאת הקובץ"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>💾 גיבוי ושחזור</span>
          <button onClick={onClose} style={BTN("#f0f0f0", "#555")}>✕</button>
        </div>
        {lastBackup ? (
          <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px" }}>
            גיבוי אחרון: {new Date(lastBackup).toLocaleString("he-IL")}
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "6px" }}>
            ⚠️ טרם בוצע גיבוי
          </div>
        )}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          {[["📚", "ידע", knowledgeBase.length], ["📊", "שלבים", phases.length], ["👷", "קבלנים", contractors.length], ["📄", "מסמכים", documents.length]].map(([icon, label, n]) => (
            <div key={label} style={{ background: "#f5f0eb", borderRadius: "10px", padding: "8px 14px", flex: 1, minWidth: "65px", textAlign: "center" }}>
              <div style={{ fontSize: "15px" }}>{icon}</div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#1a3a4a" }}>{n}</div>
              <div style={{ fontSize: "10px", color: "#888" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Google Drive Card */}
        <div style={{ background: "#f0f7ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e40af", marginBottom: "10px" }}>☁️ Google Drive</div>

          {!gToken ? (
            <button onClick={signIn} disabled={loadingDrive} style={{ ...BTN("#4285f4"), opacity: loadingDrive ? 0.6 : 1 }}>
              🔐 התחבר עם Google
            </button>
          ) : (
            <>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>✅ {gUser}</span>
                <button onClick={saveToDrive} disabled={loadingDrive} style={{ ...BTN("#4285f4"), fontSize: "12px", padding: "6px 12px", opacity: loadingDrive ? 0.6 : 1 }}>
                  {loadingDrive ? "⏳" : "☁️ שמור ב-Drive"}
                </button>
                <button onClick={() => loadDriveFiles(gToken)} disabled={loadingDrive} style={{ ...BTN("#f5f0eb", "#1a3a4a"), fontSize: "12px", padding: "6px 10px" }}>🔄</button>
                <button onClick={signOut} style={{ ...BTN("#f0f0f0", "#555"), fontSize: "12px", padding: "6px 10px" }}>התנתק</button>
              </div>
              {driveFiles.length > 0 && (
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>גיבויים אחרונים:</div>
                  {driveFiles.map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: "11px", color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: "8px" }}>{f.name}</span>
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button onClick={() => restoreFromDrive(f.id)} disabled={loadingDrive} style={{ ...BTN("#f0faf5", "#16a34a"), fontSize: "11px", padding: "3px 8px" }}>שחזר</button>
                        <button onClick={() => deleteDriveFile(f.id)} disabled={loadingDrive} style={{ ...BTN("#fee2e2", "#dc2626"), fontSize: "11px", padding: "3px 8px" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {driveFiles.length === 0 && !loadingDrive && (
                <div style={{ fontSize: "12px", color: "#888" }}>אין גיבויים עדיין. לחץ "שמור ב-Drive" ליצירת הראשון.</div>
              )}
            </>
          )}

          {driveStatus && (
            <div style={{ fontSize: "12px", marginTop: "8px", fontWeight: 600, color: driveStatus.startsWith("✅") ? "#16a34a" : driveStatus.startsWith("⏳") ? "#1d4ed8" : "#dc2626" }}>
              {driveStatus}
            </div>
          )}
        </div>

        {/* Local Export */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "8px" }}>📤 ייצוא מקומי</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={exportAll} style={BTN()}>💾 גיבוי מלא (JSON)</button>
            <button onClick={exportSummary} style={BTN("#1a3a4a")}>📝 סיכום טקסט</button>
          </div>
        </div>

        {/* Local Import */}
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "8px" }}>📥 שחזור מקומי</div>
          <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={importData} />
          <button onClick={() => fileRef.current?.click()} style={{ ...BTN("#f5f0eb", "#1a3a4a"), border: "1px solid #ddd" }}>📂 בחר קובץ גיבוי</button>
          {importStatus && <div style={{ marginTop: "6px", fontSize: "13px", fontWeight: 600, color: importStatus.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{importStatus}</div>}
        </div>

        {/* Reset */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: "12px" }}>
          <button onClick={() => {
            if (window.confirm("למחוק הכל? גיבוי אוטומטי יורד לפני המחיקה.")) {
              exportAll();
              setKnowledgeBase([]); setPhases([]); setContractors([]); setDocuments([]); setProjectStart(todayStr()); setBudget([]); setDailyLogs([]); setPunchList([]); onClose();
            }
          }} style={BTN("#fee2e2", "#dc2626")}>🗑️ איפוס מלא</button>
        </div>
      </div>
    </Overlay>
  );
}
