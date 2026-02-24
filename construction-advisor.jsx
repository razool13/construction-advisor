const { useState, useRef, useEffect, useCallback } = React;

/* ═══════════════════════════════════════════
   FIX #1: Overlay defined OUTSIDE main component
   so React doesn't remount it on every state change
   ═══════════════════════════════════════════ */
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)", zIndex: 1000,
        display: "flex", justifyContent: "center", alignItems: "center",
        direction: "rtl", padding: "12px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: "18px", width: "100%",
          maxWidth: 600, maxHeight: "88vh", overflow: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FIX #2: Debounced storage hook
   Saves only after 500ms of inactivity, not on every keystroke
   ═══════════════════════════════════════════ */
function useStorage(key, initial) {
  const [data, setData] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = localStorage.getItem(key);
      if (!cancelled && stored) setData(JSON.parse(stored));
    } catch {}
    if (!cancelled) setLoaded(true);
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, loaded, key]);

  return [data, setData, loaded];
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */
const SYSTEM_PROMPT = `אתה יועץ בנייה מקצועי ומנוסה מאוד עם ניסיון של מעל 20 שנה בתחום הבנייה הפרטית בישראל.

🎯 גישה - "דרך המלך":
- חפש פתרונות win-win. המטרה לבנות יחסים ארוכי טווח עם בעלי מקצוע.
- כשמנתח הצעת מחיר - התחל מנקודות חיוביות, אח"כ נקודות לבירור.
- נסח תגובות בצורה מכבדת: "שמתי לב ש..." לא "זה מנופח".
- הצע אלטרנטיבות ופשרות: "מה דעתך ש..." לא "אני דורש".
- קבלן טוב שווה זהב - שמירה על יחסים חשובה לא פחות ממחיר.
- כשיש בעיה - הצע נתיב לפתרון, לא רק תיאור.
- הוסף "שאלות לבירור" לפני מסקנות - יכול להיות הסבר טוב.

💡 פורמט ניתוח מסמכים:
1. סיכום כללי - מי, מה, סכום
2. נקודות חיוביות
3. נקודות לבירור (לא "בעיות")
4. השוואה לשוק
5. המלצות לשיחה (ניסוח מכבד)
6. שאלות מומלצות
7. צעדים הבאים

ידע: בנייה, אינסטלציה, חשמל, גמרים, בידוד, איטום, תקנים, היתרים, חוזים, משכנתאות.
כללים: 1) עברית 2) ישיר אך מכבד 3) אינטרס בעל הבית 4) מספרים 5) דיפלומטי`;

const PHASES_TEMPLATE = [
  { name: "תכנון ואדריכלות", duration: 60, color: "#6366f1" },
  { name: "היתר בנייה", duration: 90, color: "#8b5cf6" },
  { name: "עבודות עפר ויסודות", duration: 21, color: "#d97706" },
  { name: "שלד ובנייה", duration: 75, color: "#dc2626" },
  { name: "גג וקונסטרוקציה", duration: 21, color: "#ea580c" },
  { name: "אינסטלציה וחשמל", duration: 30, color: "#0891b2" },
  { name: "טיח וריצוף", duration: 30, color: "#059669" },
  { name: "אלומיניום וחלונות", duration: 21, color: "#2563eb" },
  { name: "נגרות ומטבח", duration: 21, color: "#7c3aed" },
  { name: "צבע וגמרים", duration: 21, color: "#db2777" },
  { name: "פיתוח חוץ וגינה", duration: 21, color: "#16a34a" },
];

const WA_TEMPLATES = [
  { id: "status", label: "סטטוס", icon: "📊", text: 'שלום {name}, מה שלומך? רציתי לבדוק מה הסטטוס ואם צפויים עיכובים. אשמח לעדכון.' },
  { id: "schedule", label: "תיאום", icon: "📅", text: "שלום {name}, רציתי לתאם מועד להמשך. מתי נוח?" },
  { id: "issue", label: "בירור", icon: "💡", text: "שלום {name}, שמתי לב לנקודה שרציתי לברר: [תאר]. מה דעתך?" },
  { id: "payment", label: "תשלום", icon: "💰", text: "שלום {name}, איך עומדים עם אבן הדרך? אשמח לתאם בדיקה ולהתקדם." },
  { id: "reminder", label: "תזכורת", icon: "🔔", text: 'שלום {name}, תזכורת ידידותית - {phase} אמור להתקדם בקרוב. הכל בתוקף?' },
  { id: "thanks", label: "תודה", icon: "🙏", text: "שלום {name}, רציתי להגיד תודה על העבודה המקצועית!" },
];

const CATEGORIES = [
  { id: "quote", icon: "📋", label: "ניתוח הצעת מחיר" },
  { id: "negotiate", icon: "🤝", label: "אסטרטגיית שיחה" },
  { id: "technical", icon: "🔧", label: "שאלה טכנית" },
  { id: "budget", icon: "💰", label: "תקציב ומימון" },
  { id: "research", icon: "🔍", label: "מחקר מוצרים" },
  { id: "chat", icon: "💬", label: "שיחה חופשית" },
];

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "");
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const todayStr = () => new Date().toISOString().split("T")[0];
const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
const uid = () => Math.random().toString(36).slice(2, 9);

const stColors = { pending: "#94a3b8", active: "#f59e0b", done: "#22c55e", delayed: "#ef4444" };
const stLabels = { pending: "טרם התחיל", active: "בביצוע", done: "הושלם", delayed: "מעוכב" };
const docStColors = { "חדש": "#3b82f6", "בטיפול": "#f59e0b", "הושלם": "#22c55e", "לבירור": "#ef4444" };

/* ═══ File helpers ═══ */
async function extractPdfText(ab) {
  try {
    if (!window.pdfjsLib) {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(s);
      await new Promise((r, e) => { s.onload = r; s.onerror = e; });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
    let t = "";
    for (let i = 1; i <= pdf.numPages; i++) { const p = await pdf.getPage(i); const c = await p.getTextContent(); t += c.items.map(x => x.str).join(" ") + "\n"; }
    return t.trim();
  } catch { return null; }
}
const toB64 = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result.split(",")[1]); x.onerror = e; x.readAsDataURL(f); });
const toAB = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = e; x.readAsArrayBuffer(f); });
const toTxt = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = e; x.readAsText(f); });

/* ═══ Styles (stable references) ═══ */
const BTN = (bg = "#2d8a6e", c = "#fff") => ({ background: bg, color: c, border: "none", borderRadius: "10px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "inherit" });
const INP = { width: "100%", border: "2px solid #eee", borderRadius: "10px", padding: "10px 12px", fontSize: "13.5px", outline: "none", fontFamily: "inherit", direction: "rtl", boxSizing: "border-box" };
const CARD = { background: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.04)" };
const TAG = (bg, c) => ({ background: bg, color: c, borderRadius: "8px", padding: "3px 10px", fontSize: "11.5px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" });

const formatMsg = (text) =>
  text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i} style={{ margin: "10px 0 4px", fontSize: "14.5px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} style={{ margin: "12px 0 6px", fontSize: "15.5px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} style={{ margin: "14px 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(2)}</h2>;
    const parts = line.split(/\*\*(.*?)\*\*/g).map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p));
    if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ paddingRight: "14px", margin: "2px 0", display: "flex", gap: "5px" }}><span style={{ color: "#2d8a6e" }}>•</span><span>{parts}</span></div>;
    if (/^\d+[\.\)]/.test(line)) return <div key={i} style={{ paddingRight: "14px", margin: "2px 0" }}>{parts}</div>;
    if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
    return <p key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{parts}</p>;
  });

/* ═══════════════════════════════════════════
   BACKUP / RESTORE - defined outside for stable reference
   ═══════════════════════════════════════════ */
function BackupPanel({ onClose, knowledgeBase, phases, contractors, documents, projectStart, setKnowledgeBase, setPhases, setContractors, setDocuments, setProjectStart }) {
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef(null);

  // Google Drive state
  const [gToken, setGToken] = useState(null);
  const [gUser, setGUser] = useState(null);
  const [gClientId, setGClientId] = useState(() => localStorage.getItem("g-client-id") || "");
  const [editingClientId, setEditingClientId] = useState(false);
  const [clientIdInput, setClientIdInput] = useState("");
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveStatus, setDriveStatus] = useState("");
  const [loadingDrive, setLoadingDrive] = useState(false);
  const tokenClientRef = useRef(null);

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
    return t;
  };

  const loadGIS = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const loadDriveFilesFn = async (token) => {
    setLoadingDrive(true);
    try {
      const folderName = "גיבויי פרויקט בנייה";
      const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const fr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fd = await fr.json();
      if (!fd.files?.length) { setDriveFiles([]); setLoadingDrive(false); return; }
      const folderId = fd.files[0].id;
      const filesQ = `'${folderId}' in parents and name contains 'גיבוי_' and trashed=false`;
      const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(filesQ)}&orderBy=createdTime desc&pageSize=10&fields=files(id,name,createdTime)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await r.json();
      setDriveFiles(d.files || []);
    } catch {}
    setLoadingDrive(false);
  };

  const signIn = async () => {
    if (!gClientId) { setDriveStatus("❌ הגדר Client ID קודם"); return; }
    try {
      await loadGIS();
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: gClientId,
        scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email",
        callback: async (response) => {
          if (response.error) { setDriveStatus("❌ שגיאה בהתחברות"); return; }
          setGToken(response.access_token);
          try {
            const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            const info = await r.json();
            setGUser(info.email);
          } catch {}
          setDriveStatus("✅ מחובר!");
          loadDriveFilesFn(response.access_token);
        },
      });
      tokenClientRef.current.requestAccessToken();
    } catch (e) {
      setDriveStatus("❌ שגיאה בטעינת Google: " + e.message);
    }
  };

  const signOut = () => {
    if (gToken) window.google?.accounts?.oauth2?.revoke(gToken);
    setGToken(null); setGUser(null); setDriveFiles([]); setDriveStatus("");
  };

  const saveClientId = () => {
    localStorage.setItem("g-client-id", clientIdInput);
    setGClientId(clientIdInput);
    setEditingClientId(false);
    setDriveStatus("✅ Client ID נשמר");
  };

  const getOrCreateFolder = async (token) => {
    const folderName = "גיבויי פרויקט בנייה";
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await r.json();
    if (data.files?.length) return data.files[0].id;
    const cr = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" })
    });
    const folder = await cr.json();
    return folder.id;
  };

  const uploadFile = async (token, folderId, name, content, mimeType) => {
    const meta = JSON.stringify({ name, parents: [folderId] });
    const boundary = "-------314159265358979323846";
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n${content}\r\n--${boundary}--`;
    await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary="${boundary}"` },
      body,
    });
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
      const data = { version: 2, exportDate: ts.toISOString(), knowledgeBase, phases, contractors, documents, projectStart };
      await uploadFile(gToken, folderId, `גיבוי_${stamp}.json`, JSON.stringify(data, null, 2), "application/json");
      await uploadFile(gToken, folderId, `סיכום_${stamp}.txt`, buildSummaryText(), "text/plain;charset=utf-8");
      setDriveStatus("✅ נשמר ב-Drive!");
      loadDriveFilesFn(gToken);
    } catch (e) { setDriveStatus("❌ שגיאה: " + e.message); }
    setLoadingDrive(false);
  };

  const restoreFromDrive = async (fileId) => {
    if (!gToken) return;
    if (!window.confirm("לשחזר מהגיבוי? הנתונים הנוכחיים יוחלפו.")) return;
    setLoadingDrive(true); setDriveStatus("⏳ משחזר...");
    try {
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${gToken}` }
      });
      const data = await r.json();
      if (!data.version) { setDriveStatus("❌ קובץ לא תקין"); setLoadingDrive(false); return; }
      if (data.knowledgeBase?.length) setKnowledgeBase(data.knowledgeBase);
      if (data.phases?.length) setPhases(data.phases);
      if (data.contractors?.length) setContractors(data.contractors);
      if (data.documents?.length) setDocuments(data.documents);
      if (data.projectStart) setProjectStart(data.projectStart);
      setDriveStatus("✅ שוחזר בהצלחה!");
    } catch (e) { setDriveStatus("❌ שגיאה: " + e.message); }
    setLoadingDrive(false);
  };

  const deleteDriveFile = async (fileId, fileName) => {
    if (!gToken) return;
    if (!window.confirm(`למחוק ${fileName}?`)) return;
    setLoadingDrive(true);
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${gToken}` }
      });
      loadDriveFilesFn(gToken); setDriveStatus("✅ נמחק");
    } catch (e) { setDriveStatus("❌ שגיאה: " + e.message); }
    setLoadingDrive(false);
  };

  const exportAll = () => {
    const data = { version: 2, exportDate: new Date().toISOString(), knowledgeBase, phases, contractors, documents, projectStart };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `backup-project-${new Date().toLocaleDateString("he-IL").replace(/\./g, "-")}.json`;
    a.click(); URL.revokeObjectURL(url);
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
        setImportStatus(`✅ יובאו ${c} פריטים!`);
      } catch { setImportStatus("❌ שגיאה בקריאת הקובץ"); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const currentOrigin = window.location.origin;

  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>💾 גיבוי ושחזור</span>
        <button onClick={onClose} style={BTN("#f0f0f0", "#555")}>✕</button>
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
            <>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={signIn} disabled={!gClientId} style={{ ...BTN("#4285f4"), opacity: gClientId ? 1 : 0.5 }}>
                  🔐 התחבר עם Google
                </button>
                <button onClick={() => { setEditingClientId(v => !v); setClientIdInput(gClientId); }} style={BTN("#e8f0fe", "#1a73e8")}>
                  ⚙️ הגדרות
                </button>
              </div>
              {!gClientId && <div style={{ fontSize: "11.5px", color: "#1e40af", marginTop: "6px" }}>לחץ ⚙️ כדי להגדיר Client ID</div>}
            </>
          ) : (
            <>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 600 }}>✅ {gUser}</span>
                <button onClick={saveToDrive} disabled={loadingDrive} style={{ ...BTN("#4285f4"), opacity: loadingDrive ? 0.6 : 1 }}>
                  ☁️ שמור ב-Drive
                </button>
                <button onClick={() => loadDriveFilesFn(gToken)} disabled={loadingDrive} style={BTN("#e8f0fe", "#1a73e8")}>🔄</button>
                <button onClick={signOut} style={BTN("#fee2e2", "#dc2626")}>התנתק</button>
              </div>
              {driveFiles.length > 0 && (
                <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                  {driveFiles.map(f => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #dbeafe", fontSize: "12px" }}>
                      <span style={{ color: "#1e3a8a", flex: 1 }}>{f.name}</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => restoreFromDrive(f.id)} style={{ ...BTN("#dcfce7", "#166534"), fontSize: "11px", padding: "3px 8px" }}>שחזר</button>
                        <button onClick={() => deleteDriveFile(f.id, f.name)} style={{ ...BTN("#fee2e2", "#dc2626"), fontSize: "11px", padding: "3px 8px" }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {driveFiles.length === 0 && !loadingDrive && <div style={{ fontSize: "12px", color: "#64748b" }}>אין גיבויים עדיין</div>}
            </>
          )}

          {editingClientId && (
            <div style={{ marginTop: "12px", background: "#fff", borderRadius: "8px", padding: "12px", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: "12px", color: "#374151", marginBottom: "6px", fontWeight: 600 }}>Google OAuth 2.0 Client ID</div>
              <input
                value={clientIdInput}
                onChange={e => setClientIdInput(e.target.value)}
                placeholder="123456789-xxx.apps.googleusercontent.com"
                style={{ ...INP, fontSize: "12px", marginBottom: "8px" }}
              />
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
                Origin נוכחי: <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: "4px" }}>{currentOrigin}</code>
                {" "}<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: "#1a73e8" }}>פתח Google Console ↗</a>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px" }}>
                1. צור פרויקט → הפעל Google Drive API<br />
                2. Credentials → OAuth 2.0 Client ID → Web application<br />
                3. הוסף <strong>{currentOrigin}</strong> ל-Authorized JavaScript origins<br />
                4. הדבק את ה-Client ID למעלה ולחץ שמור
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={saveClientId} style={BTN()}>שמור</button>
                <button onClick={() => setEditingClientId(false)} style={BTN("#f0f0f0", "#555")}>ביטול</button>
              </div>
            </div>
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
          <button onClick={() => { if (window.confirm("למחוק הכל? (עשה גיבוי לפני!)")) { setKnowledgeBase([]); setPhases([]); setContractors([]); setDocuments([]); setProjectStart(todayStr()); onClose(); } }} style={BTN("#fee2e2", "#dc2626")}>🗑️ איפוס מלא</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Persisted data
  const [knowledgeBase, setKnowledgeBase] = useStorage("myhouse-kb", []);
  const [phases, setPhases] = useStorage("myhouse-phases", []);
  const [contractors, setContractors] = useStorage("myhouse-contractors", []);
  const [documents, setDocuments] = useStorage("myhouse-documents", []);
  const [projectStart, setProjectStart] = useStorage("myhouse-start-date", todayStr());

  // UI states
  const [showKB, setShowKB] = useState(false);
  const [showKBPanel, setShowKBPanel] = useState(false);
  const [kbTitle, setKbTitle] = useState("");
  const [kbInput, setKbInput] = useState("");
  const [editingKB, setEditingKB] = useState(null);
  const [editPhase, setEditPhase] = useState(null);
  const [editContractor, setEditContractor] = useState(null);
  const [waCompose, setWaCompose] = useState(null);
  const [waText, setWaText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [showBackup, setShowBackup] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + "px";
    }
  }, [input]);

  /* ─── File Processing ─── */
  const processFile = useCallback(async (file) => {
    setProcessingFile(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const isImg = ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);
      const isPdf = ext === "pdf";
      if (isImg) {
        const b64 = await toB64(file);
        const preview = URL.createObjectURL(file);
        setAttachments((p) => [...p, { type: "image", name: file.name, data: b64, preview, mediaType: `image/${ext === "jpg" ? "jpeg" : ext}` }]);
      } else if (isPdf) {
        const ab = await toAB(file);
        const text = await extractPdfText(ab);
        if (text && text.length > 20) {
          setAttachments((p) => [...p, { type: "text", name: file.name, extractedText: `[PDF: ${file.name}]\n${text}` }]);
        } else {
          const b64 = await toB64(file);
          setAttachments((p) => [...p, { type: "pdf", name: file.name, data: b64, extractedText: text }]);
        }
      } else {
        const text = await toTxt(file);
        if (text) setAttachments((p) => [...p, { type: "text", name: file.name, extractedText: `[${file.name}]\n${text}` }]);
      }
    } catch (e) { alert("שגיאה: " + e.message); }
    setProcessingFile(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const removeAttachment = useCallback((i) => {
    setAttachments((p) => {
      if (p[i]?.preview) URL.revokeObjectURL(p[i].preview);
      return p.filter((_, j) => j !== i);
    });
  }, []);

  /* ─── KB ─── */
  const saveKB = useCallback(() => {
    if (!kbTitle.trim() || !kbInput.trim()) return;
    const ts = new Date().toLocaleString("he-IL");
    if (editingKB !== null) {
      setKnowledgeBase((p) => p.map((x, i) => (i === editingKB ? { ...x, title: kbTitle, content: kbInput, updatedAt: ts } : x)));
    } else {
      setKnowledgeBase((p) => [...p, { title: kbTitle, content: kbInput, createdAt: ts }]);
    }
    setEditingKB(null); setKbTitle(""); setKbInput(""); setShowKB(false);
  }, [kbTitle, kbInput, editingKB, setKnowledgeBase]);

  /* ─── Chat ─── */
  const buildCtx = useCallback(() => {
    let c = "";
    if (knowledgeBase.length) { c += "\n\n--- בסיס ידע ---\n"; knowledgeBase.forEach((x, i) => { c += `[${i + 1}] ${x.title}: ${x.content}\n`; }); }
    if (phases.length) { c += "\n--- שלבים ---\n"; phases.forEach((p) => { c += `${p.name}: ${formatDate(p.start)}-${formatDate(p.end)}, ${stLabels[p.status] || p.status}, קבלן: ${p.contractor || "-"}\n`; }); }
    if (contractors.length) { c += "\n--- קבלנים ---\n"; contractors.forEach((x) => { c += `${x.name} (${x.role}): ${x.phone}\n`; }); }
    return c;
  }, [knowledgeBase, phases, contractors]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() && attachments.length === 0) return;
    setShowIntro(false);
    const curAttach = [...attachments];
    const textParts = [];
    curAttach.forEach((a) => { if (a.extractedText) textParts.push(a.extractedText); });
    if (text.trim()) textParts.push(text);
    const fullText = textParts.join("\n\n");
    const hasMedia = curAttach.some((a) => a.type === "image" || (a.type === "pdf" && a.data));

    let userContent;
    if (hasMedia) {
      userContent = [];
      curAttach.forEach((a) => {
        if (a.type === "image") userContent.push({ type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } });
        else if (a.type === "pdf" && a.data) userContent.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data } });
      });
      userContent.push({ type: "text", text: fullText || "נתח את המסמך. אם זו הצעת מחיר - השתמש בפורמט הניתוח." });
    } else {
      userContent = fullText || "נתח";
    }

    const displayText = text.trim() || (curAttach.length ? `📎 ${curAttach.map((a) => a.name).join(", ")}` : "");
    const displayPreviews = curAttach.filter((a) => a.preview).map((a) => ({ preview: a.preview, name: a.name }));
    const fileNames = curAttach.map((a) => a.name);

    const userDisplayMsg = { role: "user", displayText, displayPreviews, apiContent: userContent };
    const newMsgs = [...messages, userDisplayMsg];
    setMessages([...newMsgs, { role: "assistant", content: "", loading: true }]);
    setInput(""); setAttachments([]); setLoading(true);

    try {
      const apiMsgs = [
        ...messages.map((m) => ({ role: m.role, content: m.apiContent || m.displayText || m.content || "" })),
        { role: "user", content: userContent },
      ];
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 4000,
          system: SYSTEM_PROMPT + buildCtx(),
          messages: apiMsgs,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
        }),
      });
      const data = await resp.json();
      const aText = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "שגיאה, נסה שוב.";
      const usedSearch = data.content?.some((b) => b.type === "web_search_tool_result" || b.type === "server_tool_use");
      const aMsg = { role: "assistant", content: aText, apiContent: aText, usedSearch };
      setMessages([...newMsgs, aMsg]);

      // Auto-save as document
      if (fileNames.length > 0) {
        setDocuments((prev) => [{
          id: uid(), title: fileNames.join(", "), type: curAttach[0]?.type || "text",
          date: new Date().toLocaleString("he-IL"), fileNames,
          preview: displayPreviews[0]?.preview || null,
          extractedContent: textParts.join("\n\n").slice(0, 2000),
          analysis: aText,
          conversation: [{ role: "user", text: displayText }, { role: "assistant", text: aText }],
          actionItems: [], notes: "", status: "חדש",
        }, ...prev]);
      }
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "שגיאה בחיבור." }]);
    }
    setLoading(false);
  }, [attachments, messages, buildCtx, setDocuments]);

  /* ─── Gantt ─── */
  const initPhases = useCallback(() => {
    let s = projectStart;
    setPhases(PHASES_TEMPLATE.map((t) => {
      const e = addDays(s, t.duration);
      const p = { ...t, start: s, end: e, status: "pending", contractor: "", progress: 0, id: uid() };
      s = e; return p;
    }));
  }, [projectStart, setPhases]);

  const getGanttRange = useCallback(() => {
    if (!phases.length) return { minDate: todayStr(), totalDays: 365 };
    const dates = phases.flatMap((p) => [new Date(p.start), new Date(p.end)]);
    const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 7); max.setDate(max.getDate() + 14);
    return { minDate: min.toISOString().split("T")[0], totalDays: daysBetween(min.toISOString().split("T")[0], max.toISOString().split("T")[0]) };
  }, [phases]);

  const openWhatsApp = useCallback((phone, text) => {
    const c = phone.replace(/[^0-9]/g, "");
    const intl = c.startsWith("0") ? "972" + c.slice(1) : c;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  /* ═══ TABS CONFIG ═══ */
  const tabs = [
    { id: "chat", icon: "💬", label: "יועץ" },
    { id: "docs", icon: "📄", label: `מסמכים${documents.length ? ` (${documents.length})` : ""}` },
    { id: "gantt", icon: "📊", label: "גאנט" },
    { id: "contractors", icon: "👷", label: "קבלנים" },
  ];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ direction: "rtl", fontFamily: "'Noto Sans Hebrew', 'Segoe UI', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f5f0eb", color: "#2c2c2c" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══════════ OVERLAYS ══════════ */}

      {showBackup && (
        <BackupPanel onClose={() => setShowBackup(false)}
          knowledgeBase={knowledgeBase} phases={phases} contractors={contractors} documents={documents} projectStart={projectStart}
          setKnowledgeBase={setKnowledgeBase} setPhases={setPhases} setContractors={setContractors} setDocuments={setDocuments} setProjectStart={setProjectStart} />
      )}

      {/* KB Panel */}
      {showKBPanel && (
        <Overlay onClose={() => setShowKBPanel(false)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>📚 בסיס ידע ({knowledgeBase.length})</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => { setShowKBPanel(false); setShowKB(true); setEditingKB(null); setKbTitle(""); setKbInput(""); }} style={BTN()}>+ הוסף</button>
              <button onClick={() => setShowKBPanel(false)} style={BTN("#f0f0f0", "#555")}>✕</button>
            </div>
          </div>
          <div style={{ padding: "12px 20px" }}>
            {knowledgeBase.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px", color: "#999" }}>📦 ריק - הוסף מפרטים, מחירונים, פרטי ספקים</div>
            ) : knowledgeBase.map((x, i) => (
              <div key={i} style={{ ...CARD, marginBottom: "6px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "13.5px", color: "#1a3a4a" }}>{x.title}</span>
                  <div>
                    <button onClick={() => { setKbTitle(x.title); setKbInput(x.content); setEditingKB(i); setShowKB(true); setShowKBPanel(false); }} style={{ background: "none", border: "none", cursor: "pointer" }}>✏️</button>
                    <button onClick={() => setKnowledgeBase((p) => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "3px", maxHeight: "40px", overflow: "hidden", whiteSpace: "pre-wrap" }}>{x.content}</div>
              </div>
            ))}
          </div>
        </Overlay>
      )}

      {/* KB Editor */}
      {showKB && (
        <Overlay onClose={() => { setShowKB(false); setEditingKB(null); }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>{editingKB !== null ? "✏️ עריכה" : "📝 הוספה"}</span>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <input value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} placeholder="כותרת" style={{ ...INP, marginBottom: "8px" }} onFocus={(e) => { e.target.style.borderColor = "#2d8a6e"; }} onBlur={(e) => { e.target.style.borderColor = "#eee"; }} />
            <textarea value={kbInput} onChange={(e) => setKbInput(e.target.value)} placeholder="תוכן - מפרט, הצעה, מידע..." rows={5} style={{ ...INP, resize: "vertical", lineHeight: 1.6 }} onFocus={(e) => { e.target.style.borderColor = "#2d8a6e"; }} onBlur={(e) => { e.target.style.borderColor = "#eee"; }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <button onClick={saveKB} disabled={!kbTitle.trim() || !kbInput.trim()} style={BTN(kbTitle.trim() && kbInput.trim() ? "#2d8a6e" : "#ddd")}>{editingKB !== null ? "עדכן" : "הוסף"}</button>
              <button onClick={() => { setShowKB(false); setEditingKB(null); }} style={BTN("#f0f0f0", "#555")}>ביטול</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Phase Editor */}
      {editPhase && (
        <Overlay onClose={() => setEditPhase(null)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>עריכת שלב</span>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input value={editPhase.name} onChange={(e) => setEditPhase((p) => ({ ...p, name: e.target.value }))} style={INP} placeholder="שם שלב" />
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>התחלה</label><input type="date" value={editPhase.start} onChange={(e) => setEditPhase((p) => ({ ...p, start: e.target.value }))} style={INP} /></div>
              <div style={{ flex: 1 }}><label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>סיום</label><input type="date" value={editPhase.end} onChange={(e) => setEditPhase((p) => ({ ...p, end: e.target.value }))} style={INP} /></div>
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {Object.entries(stLabels).map(([k, v]) => (
                <button key={k} onClick={() => setEditPhase((p) => ({ ...p, status: k }))} style={BTN(editPhase.status === k ? stColors[k] : "#f0f0f0", editPhase.status === k ? "#fff" : "#555")}>{v}</button>
              ))}
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>התקדמות: {editPhase.progress || 0}%</label>
              <input type="range" min="0" max="100" value={editPhase.progress || 0} onChange={(e) => setEditPhase((p) => ({ ...p, progress: +e.target.value }))} style={{ width: "100%", accentColor: "#2d8a6e" }} />
            </div>
            <select value={editPhase.contractor || ""} onChange={(e) => setEditPhase((p) => ({ ...p, contractor: e.target.value }))} style={{ ...INP, cursor: "pointer" }}>
              <option value="">ללא קבלן</option>
              {contractors.map((c) => <option key={c.id} value={c.name}>{c.name} ({c.role})</option>)}
            </select>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => { setPhases((p) => p.map((x) => (x.id === editPhase.id ? editPhase : x))); setEditPhase(null); }} style={BTN()}>שמור</button>
              <button onClick={() => setEditPhase(null)} style={BTN("#f0f0f0", "#555")}>ביטול</button>
              <button onClick={() => { setPhases((p) => p.filter((x) => x.id !== editPhase.id)); setEditPhase(null); }} style={BTN("#fee2e2", "#dc2626")}>מחק</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Contractor Editor */}
      {editContractor && (
        <Overlay onClose={() => setEditContractor(null)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>{editContractor.id ? "עריכת קבלן" : "קבלן חדש"}</span>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input value={editContractor.name || ""} onChange={(e) => setEditContractor((p) => ({ ...p, name: e.target.value }))} style={INP} placeholder="שם" />
            <input value={editContractor.role || ""} onChange={(e) => setEditContractor((p) => ({ ...p, role: e.target.value }))} style={INP} placeholder="תפקיד" />
            <input value={editContractor.phone || ""} onChange={(e) => setEditContractor((p) => ({ ...p, phone: e.target.value }))} style={{ ...INP, direction: "ltr", textAlign: "right" }} placeholder="050-1234567" />
            <textarea value={editContractor.notes || ""} onChange={(e) => setEditContractor((p) => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...INP, resize: "vertical" }} placeholder="הערות..." />
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => {
                if (!editContractor.name?.trim()) return;
                if (editContractor.id) setContractors((p) => p.map((c) => (c.id === editContractor.id ? editContractor : c)));
                else setContractors((p) => [...p, { ...editContractor, id: uid() }]);
                setEditContractor(null);
              }} style={BTN()}>שמור</button>
              <button onClick={() => setEditContractor(null)} style={BTN("#f0f0f0", "#555")}>ביטול</button>
              {editContractor.id && <button onClick={() => { setContractors((p) => p.filter((c) => c.id !== editContractor.id)); setEditContractor(null); }} style={BTN("#fee2e2", "#dc2626")}>מחק</button>}
            </div>
          </div>
        </Overlay>
      )}

      {/* WhatsApp */}
      {waCompose && (
        <Overlay onClose={() => setWaCompose(null)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>📱 {waCompose.name}</div>
          </div>
          <div style={{ padding: "12px 20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
              {WA_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setWaText(t.text.replace("{name}", waCompose.name).replace("{phase}", phases.find((p) => p.contractor === waCompose.name)?.name || "השלב"))}
                  style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "11.5px", padding: "5px 9px", fontWeight: 500 }}>{t.icon} {t.label}</button>
              ))}
            </div>
            <textarea value={waText} onChange={(e) => setWaText(e.target.value)} rows={4} style={{ ...INP, resize: "vertical", lineHeight: 1.5 }} />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={() => { openWhatsApp(waCompose.phone, waText); setWaCompose(null); }} disabled={!waText.trim()} style={BTN(waText.trim() ? "#25d366" : "#ddd")}>📱 פתח בוואטסאפ</button>
              <button onClick={() => setWaCompose(null)} style={BTN("#f0f0f0", "#555")}>ביטול</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Document Detail */}
      {viewDoc && (
        <Overlay onClose={() => setViewDoc(null)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>📄 {viewDoc.title}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{viewDoc.date}</div>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <select value={viewDoc.status} onChange={(e) => {
                const s = e.target.value;
                setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? { ...d, status: s } : d)));
                setViewDoc((p) => ({ ...p, status: s }));
              }} style={{ border: `2px solid ${docStColors[viewDoc.status] || "#888"}`, borderRadius: "8px", padding: "4px 8px", fontSize: "12px", fontWeight: 600, color: docStColors[viewDoc.status], background: "#fff", fontFamily: "inherit", cursor: "pointer", outline: "none" }}>
                {Object.keys(docStColors).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => setViewDoc(null)} style={BTN("#f0f0f0", "#555")}>✕</button>
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {viewDoc.preview && <img src={viewDoc.preview} alt="" style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "10px", border: "1px solid #eee", marginBottom: "12px", display: "block" }} />}

            <div style={{ background: "#f0faf5", borderRadius: "12px", padding: "14px", marginBottom: "12px", border: "1px solid #2d8a6e20" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "8px" }}>🔍 ניתוח</div>
              <div style={{ fontSize: "13px", lineHeight: 1.65, maxHeight: "300px", overflowY: "auto" }}>{formatMsg(viewDoc.analysis || "")}</div>
            </div>

            {viewDoc.conversation?.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "6px" }}>💬 שיחה</div>
                {viewDoc.conversation.map((m, i) => (
                  <div key={i} style={{ background: m.role === "user" ? "#1a3a4a" : "#f8f6f3", color: m.role === "user" ? "#fff" : "#2c2c2c", borderRadius: "10px", padding: "10px 14px", marginBottom: "4px", fontSize: "12.5px" }}>
                    <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "2px", opacity: 0.7 }}>{m.role === "user" ? "אני" : "יועץ"}</div>
                    <div style={{ maxHeight: "80px", overflow: "hidden" }}>{m.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <span>✅ צעדים הבאים</span>
                <button onClick={() => {
                  const item = prompt("הוסף צעד:");
                  if (item) {
                    const updated = { ...viewDoc, actionItems: [...(viewDoc.actionItems || []), { text: item, done: false, id: uid() }] };
                    setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                    setViewDoc(updated);
                  }
                }} style={{ ...BTN(), fontSize: "11px", padding: "3px 10px" }}>+ הוסף</button>
              </div>
              {(viewDoc.actionItems || []).length === 0 ? (
                <div style={{ fontSize: "12px", color: "#999" }}>אין צעדים. לחץ "הוסף" להוסיף.</div>
              ) : (viewDoc.actionItems || []).map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                  <button onClick={() => {
                    const updated = { ...viewDoc, actionItems: viewDoc.actionItems.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) };
                    setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                    setViewDoc(updated);
                  }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>{a.done ? "✅" : "⬜"}</button>
                  <span style={{ fontSize: "13px", textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.5 : 1, flex: 1 }}>{a.text}</span>
                  <button onClick={() => {
                    const updated = { ...viewDoc, actionItems: viewDoc.actionItems.filter((x) => x.id !== a.id) };
                    setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                    setViewDoc(updated);
                  }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "6px" }}>📝 הערות</div>
              <textarea value={viewDoc.notes || ""} onChange={(e) => {
                const val = e.target.value;
                setViewDoc((p) => ({ ...p, notes: val }));
                setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? { ...d, notes: val } : d)));
              }} rows={3} style={{ ...INP, resize: "vertical", fontSize: "13px" }} placeholder="הערות..." />
            </div>

            <button onClick={() => { setViewDoc(null); setActiveTab("chat"); setInput(`לגבי "${viewDoc.title}" - `); setTimeout(() => textareaRef.current?.focus(), 100); }}
              style={{ ...BTN(), width: "100%" }}>💬 שאל המשך על המסמך</button>
          </div>
        </Overlay>
      )}

      {/* ══════════ HEADER ══════════ */}
      <div style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #2d6b5a 50%, #3a8b6e 100%)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 16px rgba(0,0,0,0.15)", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🏠</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: "15px", fontWeight: 700 }}>יועץ הבנייה שלי</div>
        </div>
        <button onClick={() => setShowBackup(true)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>💾</button>
        <button onClick={() => setShowKBPanel(true)} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "4px" }}>
          📚{knowledgeBase.length > 0 && <span style={{ background: "#ff6b35", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>{knowledgeBase.length}</span>}
        </button>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setShowIntro(true); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>🔄</button>
        )}
      </div>

      {/* ══════════ TAB BAR ══════════ */}
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)", flexShrink: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: "9px 4px", border: "none", cursor: "pointer",
            background: activeTab === t.id ? "#f0faf5" : "transparent",
            borderBottom: activeTab === t.id ? "3px solid #2d8a6e" : "3px solid transparent",
            fontFamily: "inherit", fontSize: "12.5px", fontWeight: activeTab === t.id ? 700 : 500,
            color: activeTab === t.id ? "#1a3a4a" : "#888", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ══════════ CONTENT ══════════ */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* ═══ CHAT TAB ═══ */}
        {activeTab === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}
            onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}>

            {dragOver && (
              <div style={{ position: "absolute", inset: 8, background: "rgba(45,138,110,0.12)", border: "3px dashed #2d8a6e", borderRadius: "12px", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ background: "#fff", borderRadius: "16px", padding: "20px 36px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", textAlign: "center" }}>
                  <div style={{ fontSize: "32px", marginBottom: "6px" }}>📎</div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#1a3a4a" }}>שחרר כאן</div>
                  <div style={{ fontSize: "12px", color: "#666" }}>תמונות • PDF • טקסט</div>
                </div>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {showIntro ? (
                <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
                  <div style={{ ...CARD, textAlign: "center", marginBottom: "14px", padding: "22px" }}>
                    <div style={{ fontSize: "34px", marginBottom: "8px" }}>🏗️</div>
                    <h2 style={{ margin: "0 0 6px", fontSize: "19px", fontWeight: 800, color: "#1a3a4a" }}>ברוך הבא לפרויקט הבנייה</h2>
                    <p style={{ margin: "0 0 12px", color: "#666", fontSize: "13.5px" }}>שאל, צרף הצעות מחיר, בקש מחקר - בגישה דיפלומטית ומקצועית</p>
                    <div style={{ background: "#f0faf5", border: "2px dashed #2d8a6e40", borderRadius: "12px", padding: "14px", maxWidth: "380px", margin: "0 auto" }}>
                      <div style={{ fontSize: "22px", marginBottom: "4px" }}>📎</div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#2d6b5a" }}>גרור קובץ או לחץ 📎</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>תמונות • PDF • הצעות מחיר</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px", marginBottom: "14px" }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => { setShowIntro(false); setInput(c.label + ": "); setTimeout(() => textareaRef.current?.focus(), 50); }}
                        style={{ ...CARD, cursor: "pointer", textAlign: "center", padding: "12px 8px", fontFamily: "inherit", border: "1px solid rgba(0,0,0,0.06)" }}>
                        <div style={{ fontSize: "18px" }}>{c.icon}</div>
                        <div style={{ fontSize: "11.5px", fontWeight: 600, marginTop: "4px" }}>{c.label}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {["מה חייב להיות בחוזה?", "מחיר למ״ר?", "איך בוחרים אדריכל?"].map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", fontWeight: 500 }}>{q}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-start" : "flex-end" }}>
                      <div style={{
                        maxWidth: msg.role === "assistant" ? "88%" : "78%",
                        background: msg.role === "user" ? "linear-gradient(135deg, #1a3a4a, #2d5a4a)" : "#fff",
                        color: msg.role === "user" ? "#fff" : "#2c2c2c",
                        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: msg.role === "user" ? "12px 16px" : "14px 18px",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.08)", fontSize: "13.5px", lineHeight: 1.65,
                        border: msg.role === "assistant" ? "1px solid rgba(0,0,0,0.04)" : "none",
                      }}>
                        {msg.loading ? (
                          <div style={{ display: "flex", gap: "5px", padding: "6px 2px", alignItems: "center" }}>
                            {[0, 1, 2].map((j) => <div key={j} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d8a6e", animation: `pulse 1.4s ease-in-out ${j * 0.2}s infinite` }} />)}
                            <span style={{ fontSize: "11px", color: "#999", marginRight: "6px" }}>מנתח...</span>
                          </div>
                        ) : msg.role === "assistant" ? (
                          <>
                            {msg.usedSearch && <div style={TAG("#f0faf5", "#2d8a6e")}>🔍 כולל חיפוש</div>}
                            <div style={{ marginTop: msg.usedSearch ? "8px" : 0 }}>{formatMsg(msg.content || "")}</div>
                          </>
                        ) : (
                          <>
                            {msg.displayPreviews?.length > 0 && (
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                {msg.displayPreviews.map((a, j) => <img key={j} src={a.preview} alt="" style={{ maxWidth: "160px", maxHeight: "100px", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.3)" }} />)}
                              </div>
                            )}
                            <div style={{ whiteSpace: "pre-wrap" }}>{msg.displayText || ""}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
              <div style={{ padding: "8px 14px 0", background: "#fff", borderTop: "1px solid rgba(0,0,0,0.04)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {attachments.map((a, i) => (
                  <div key={i} style={{ background: "#f5f0eb", borderRadius: "10px", padding: "5px 10px", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", border: "1px solid rgba(0,0,0,0.06)" }}>
                    {a.preview ? <img src={a.preview} alt="" style={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }} /> : <span>{a.type === "pdf" ? "📄" : "📝"}</span>}
                    <span style={{ fontWeight: 500, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <button onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: "13px", padding: "0 2px" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {processingFile && <div style={{ padding: "4px 14px", background: "#fff", textAlign: "center", fontSize: "12px", color: "#2d8a6e", fontWeight: 600 }}>⏳ מעבד...</div>}

            {/* Input */}
            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", padding: "10px 14px", background: "#fff", flexShrink: 0 }}>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.csv,.json,.md,.html" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files?.length) Array.from(e.target.files).forEach(processFile); e.target.value = ""; }} />
              <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", gap: "6px", alignItems: "flex-end" }}>
                <button onClick={() => fileInputRef.current?.click()} title="צרף קובץ" style={{ width: 36, height: 36, borderRadius: "10px", background: "#f5f0eb", border: "1px solid rgba(0,0,0,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>📎</button>
                <div style={{ flex: 1, background: "#f5f0eb", borderRadius: "14px", border: "2px solid transparent", padding: "1px", transition: "border-color 0.2s" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#2d8a6e"; }} onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; }}>
                  <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder={attachments.length ? "הוסף הוראות (אופציונלי)..." : "שאל, הדבק הצעה, או גרור קובץ..."}
                    rows={1} style={{ width: "100%", border: "none", background: "transparent", padding: "9px 12px", resize: "none", outline: "none", fontSize: "13.5px", lineHeight: 1.5, fontFamily: "inherit", direction: "rtl", maxHeight: "180px" }} />
                </div>
                <button onClick={() => sendMessage(input)} disabled={(!input.trim() && !attachments.length) || loading}
                  style={{ width: 36, height: 36, borderRadius: "10px", background: (input.trim() || attachments.length) && !loading ? "linear-gradient(135deg, #1a3a4a, #2d6b5a)" : "#ddd", border: "none", cursor: (input.trim() || attachments.length) && !loading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleX(-1)" }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#fff" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ DOCS TAB ═══ */}
        {activeTab === "docs" && (
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
        )}

        {/* ═══ GANTT TAB ═══ */}
        {activeTab === "gantt" && (
          <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
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
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: Math.max(500, totalDays * 2.5) }}>
                      <div style={{ position: "relative", height: "22px", marginBottom: "4px", borderBottom: "1px solid #e5e5e5" }}>
                        {months.map((m, i) => <div key={i} style={{ position: "absolute", right: `${m.offset}%`, fontSize: "10px", color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</div>)}
                      </div>
                      {phases.map((phase) => {
                        const sOff = clamp(daysBetween(minDate, phase.start) / totalDays * 100, 0, 100);
                        const w = clamp(daysBetween(phase.start, phase.end) / totalDays * 100, 0.5, 100 - sOff);
                        return (
                          <div key={phase.id} onClick={() => setEditPhase({ ...phase })} style={{ display: "flex", alignItems: "center", marginBottom: "2px", cursor: "pointer", padding: "3px 0" }}>
                            <div style={{ width: "115px", flexShrink: 0, paddingLeft: "6px" }}>
                              <div style={{ fontSize: "11.5px", fontWeight: 600, color: "#1a3a4a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{phase.name}</div>
                              <div style={{ fontSize: "9.5px", color: "#999" }}>{phase.contractor || ""}</div>
                            </div>
                            <div style={{ flex: 1, position: "relative", height: "26px" }}>
                              <div style={{ position: "absolute", right: `${todayOff}%`, top: 0, bottom: 0, width: "1.5px", background: "#ef4444", zIndex: 2, opacity: 0.4 }} />
                              <div style={{ position: "absolute", right: `${sOff}%`, width: `${w}%`, top: "2px", bottom: "2px", borderRadius: "5px", background: phase.color + "20", border: `1.5px solid ${phase.color}35` }}>
                                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${phase.progress || 0}%`, background: phase.color, borderRadius: "4px", opacity: 0.5 }} />
                                <div style={{ position: "absolute", left: "5px", top: "50%", transform: "translateY(-50%)", width: "6px", height: "6px", borderRadius: "50%", background: stColors[phase.status] }} />
                                <div style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: phase.color, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(phase.start)}-{formatDate(phase.end)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "10px", color: "#888" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 8, height: 1.5, background: "#ef4444" }} />היום</span>
                        {Object.entries(stLabels).map(([k, v]) => <span key={k} style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: stColors[k] }} />{v}</span>)}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ═══ CONTRACTORS TAB ═══ */}
        {activeTab === "contractors" && (
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
                      {ap.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>{ap.map((p) => <span key={p.id} style={TAG(stColors[p.status] + "20", stColors[p.status])}>{p.name} ({p.progress || 0}%)</span>)}</div>}
                      {c.phone && (
                        <div style={{ display: "flex", gap: "5px", marginTop: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => { setWaCompose(c); setWaText(WA_TEMPLATES[0].text.replace("{name}", c.name)); }} style={{ ...BTN("#25d366", "#fff"), fontSize: "12px", padding: "5px 10px" }}>📱 וואטסאפ</button>
                          {["סטטוס", "תיאום", "תזכורת", "תודה"].map((label, idx) => (
                            <button key={label} onClick={() => { setWaCompose(c); setWaText(WA_TEMPLATES[[0, 1, 4, 5][idx]].text.replace("{name}", c.name).replace("{phase}", ap[0]?.name || "השלב")); }}
                              style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "11px", padding: "5px 8px" }}>{[WA_TEMPLATES[0], WA_TEMPLATES[1], WA_TEMPLATES[4], WA_TEMPLATES[5]][[0, 1, 2, 3][idx]].icon} {label}</button>
                          ))}
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
                  {contractors.filter((c) => c.phone).map((c) => (
                    <button key={c.id} onClick={() => openWhatsApp(c.phone, WA_TEMPLATES[0].text.replace("{name}", c.name))}
                      style={{ ...BTN("#25d36620", "#25d366"), fontSize: "11px", padding: "4px 8px", border: "1px solid #25d36640" }}>📱 {c.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }
        * { box-sizing: border-box; margin: 0; }
        textarea::placeholder, input::placeholder { color: #aaa; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
      `}</style>
    </div>
  );
}
