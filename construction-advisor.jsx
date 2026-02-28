const { useState, useRef, useEffect, useCallback } = React;
const APP_VERSION = "2.0.1";

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
const SYSTEM_PROMPT_BASE = `אתה יועץ בנייה מקצועי ומנוסה מאוד עם ניסיון של מעל 20 שנה בתחום הבנייה הפרטית בישראל.

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
כללים: 1) עברית 2) ישיר אך מכבד 3) אינטרס בעל הבית 4) מספרים 5) דיפלומטי 6) תמציתי - תשובות קצרות וממוקדות, ללא חזרות מיותרות

🔧 עריכת גאנט מהצ'אט:
כשהמשתמש מבקש לשנות את לוח הזמנים, להזיז שלב, להוסיף שלב, למחוק שלב, או לעדכן סטטוס/קבלן - הוסף בסוף התשובה פקודות בפורמט הבא (שורה חדשה לכל פקודה):
[GANTT:ADD|שם שלב|YYYY-MM-DD|YYYY-MM-DD|צבע-hex]
[GANTT:UPDATE|שם שלב קיים|שדה=ערך|שדה=ערך]
  שדות: name, start, end, status(pending/active/done/delayed), contractor, progress(0-100), color
[GANTT:DELETE|שם שלב]
[GANTT:MOVE|שם שלב|YYYY-MM-DD-התחלה|YYYY-MM-DD-סיום]
[GANTT:REORDER|שם שלב 1|שם שלב 2|שם שלב 3|...] - סדר מחדש את כל השלבים לפי הרשימה הזו
דוגמאות:
- "הוסף שלב בדיקות" → חשב תאריכים מהשלבים הקיימים, הוסף [GANTT:ADD|בדיקות|2026-03-15|2026-04-05|#f97316]
- "הקדם את הטיח ב-2 שבועות" → קח את התאריכים הנוכחיים מההקשר, חסר 14 יום, הוסף [GANTT:MOVE|טיח וריצוף|תאריך-חדש|תאריך-חדש]
- "עדכן שלד ל-60%" → [GANTT:UPDATE|שלד ובנייה|progress=60]
- "העבר שלד ובנייה לפני אינסטלציה" → [GANTT:REORDER|...|שלד ובנייה|אינסטלציה וחשמל|...]  (רשימה מלאה של כל השלבים בסדר הרצוי)
חשוב: השתמש בשמות השלבים בדיוק כפי שמופיעים בהקשר. אל תמציא שלבים. תאריכים תמיד בפורמט YYYY-MM-DD.`;

// Dynamic system prompt with live date injected at the top
const buildSystemPrompt = () => {
  const today = new Date();
  const isoDate = today.toISOString().split("T")[0];
  const hebDate = today.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `📅 התאריך היום: ${isoDate} (${hebDate}). השתמש תמיד בתאריך הזה כתאריך הנוכחי. אל תנחש תאריך אחר.\n\n` + SYSTEM_PROMPT_BASE;
};

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

const GOOGLE_CLIENT_ID = "536306909343-ttqpfvm7bpqia6f94lnetk17e0sv9v7m.apps.googleusercontent.com";

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
function BackupPanel({ onClose, knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList, setKnowledgeBase, setPhases, setContractors, setDocuments, setProjectStart, setBudget, setDailyLogs, setPunchList, lastBackup, updateLastBackup }) {
  const [importStatus, setImportStatus] = useState("");
  const fileRef = useRef(null);

  // Google Drive state (token in sessionStorage so it survives panel close/reopen within same session)
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

  /* ─── GIS helpers ─── */
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
  const [ganttVersions, setGanttVersions] = useStorage("myhouse-gantt-versions", []);
  const [budget, setBudget] = useStorage("myhouse-budget", []);
  const [dailyLogs, setDailyLogs] = useStorage("myhouse-daily-logs", []);
  const [punchList, setPunchList] = useStorage("myhouse-punch-list", []);

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
  const [showSettings, setShowSettings] = useState(false);
  const [showGanttHistory, setShowGanttHistory] = useState(false);
  const [ganttChat, setGanttChat] = useState([]);
  const [ganttInput, setGanttInput] = useState("");
  const [ganttLoading, setGanttLoading] = useState(false);
  const [dragPhaseId, setDragPhaseId] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const [editPunch, setEditPunch] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const ganttChatRef = useRef(null);
  const ganttInputRef = useRef(null);
  const [settingsTab, setSettingsTab] = useState("anthropic");

  // Backup tracking
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem("myhouse-last-backup") || "");
  const updateLastBackup = useCallback(() => {
    const ts = new Date().toISOString();
    localStorage.setItem("myhouse-last-backup", ts);
    setLastBackup(ts);
  }, []);

  // AI provider state
  const [provider, setProvider] = useState(() => localStorage.getItem("ai-provider") || "anthropic");
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("anthropic-api-key") || "");
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("openai-api-key") || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("gemini-api-key") || "");
  const activeKey = provider === "openai" ? openaiKey : provider === "gemini" ? geminiKey : anthropicKey;

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
    if (phases.length) {
      c += "\n--- שלבי הגאנט (תאריכים בפורמט YYYY-MM-DD) ---\n";
      phases.forEach((p) => { c += `${p.name}: ${p.start} עד ${p.end}, סטטוס: ${stLabels[p.status] || p.status}, קבלן: ${p.contractor || "-"}, התקדמות: ${p.progress || 0}%\n`; });
      c += `תאריך התחלת פרויקט: ${projectStart}\n`;
    }
    if (contractors.length) { c += "\n--- קבלנים ---\n"; contractors.forEach((x) => { c += `${x.name} (${x.role}): ${x.phone}\n`; }); }
    if (budget.length) {
      const totalP = budget.reduce((s, b) => s + (b.planned || 0), 0);
      const totalA = budget.reduce((s, b) => s + (b.actual || 0), 0);
      c += `\n--- תקציב ---\nסה"כ מתוכנן: ₪${totalP.toLocaleString()}, בפועל: ₪${totalA.toLocaleString()}, ${totalA <= totalP ? "בתקציב" : "חריגה של ₪" + (totalA - totalP).toLocaleString()}\n`;
    }
    return c;
  }, [knowledgeBase, phases, contractors, projectStart, budget]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() && attachments.length === 0) return;
    setShowIntro(false);
    const curAttach = [...attachments];
    const textParts = [];
    curAttach.forEach((a) => { if (a.extractedText) textParts.push(a.extractedText); });
    if (text.trim()) textParts.push(text);
    const fullText = textParts.join("\n\n");
    const hasMedia = curAttach.some((a) => a.type === "image" || (a.type === "pdf" && a.data));

    // Build Anthropic-format user content (used for Anthropic and as display reference)
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

    // Helper to extract text from potentially array apiContent
    const extractText = (content) => {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) return content.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "";
      return "";
    };

    // Helper: fetch with timeout (longer for media/PDF) and single retry on 429
    const timeoutMs = curAttach.length > 0 ? 120000 : 60000;
    const fetchWithTimeout = async (url, options, ms = timeoutMs) => {
      const doFetch = async () => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        try {
          const resp = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return resp;
        } catch (e) {
          clearTimeout(id);
          if (e.name === "AbortError") throw new Error(`הבקשה נכשלה — עברו ${ms / 1000} שניות ללא תגובה. בדוק את החיבור לאינטרנט ונסה שוב.`);
          throw e;
        }
      };
      const resp = await doFetch();
      if (resp.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        return doFetch();
      }
      return resp;
    };

    // Helper: human-readable API error from HTTP status
    const handleApiError = async (resp, providerName) => {
      if (resp.ok) return null;
      let detail = "";
      try { const d = await resp.json(); detail = d.error?.message || ""; } catch {}
      if (resp.status === 400)
        return `❌ בקשה שגויה ל-${providerName}: ${detail || "בדוק הגדרות API."}`;
      if (resp.status === 401 || resp.status === 403)
        return `❌ מפתח ה-API של ${providerName} שגוי או שפג תוקפו. עדכן בהגדרות.`;
      if (resp.status === 429)
        return `⏳ חריגה ממגבלת בקשות ${providerName} (גם אחרי ניסיון חוזר). ${providerName === "Gemini" ? "ב-Gemini חינמי יש מגבלה של 15 בקשות לדקה. " : ""}המתן דקה ונסה שוב.`;
      if (resp.status >= 500)
        return `❌ שגיאת שרת ${providerName} (${resp.status}). נסה שוב בעוד מספר דקות.`;
      return `❌ שגיאה מ-${providerName} (${resp.status}): ${detail || "נסה שוב."}`;
    };

    try {
      let aText = "";
      let usedSearch = false;

      if (provider === "anthropic") {
        const apiMsgs = [
          ...messages.map((m) => ({ role: m.role, content: m.apiContent || m.displayText || m.content || "" })),
          { role: "user", content: userContent },
        ];
        const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2025-04-14",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6", max_tokens: 4000,
            system: buildSystemPrompt() + buildCtx(),
            messages: apiMsgs,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }),
        });
        const apiErr = await handleApiError(resp, "Anthropic");
        if (apiErr) { aText = apiErr; }
        else {
          const data = await resp.json();
          if (data.error) { aText = `❌ שגיאת Anthropic: ${data.error.message || JSON.stringify(data.error)}`; }
          else {
            aText = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "❌ Anthropic לא החזיר תשובה. נסה שוב.";
            usedSearch = data.content?.some((b) => b.type === "web_search_tool_result" || b.type === "server_tool_use");
          }
        }

      } else if (provider === "openai") {
        // Build OpenAI-format current message content
        const oaiUserContent = [];
        curAttach.forEach((a) => {
          if (a.type === "image") oaiUserContent.push({ type: "image_url", image_url: { url: `data:${a.mediaType};base64,${a.data}` } });
        });
        oaiUserContent.push({ type: "text", text: fullText || "נתח" });
        const oaiMsgs = [
          { role: "system", content: buildSystemPrompt() + buildCtx() },
          ...messages.map((m) => ({
            role: m.role,
            content: extractText(m.apiContent) || m.displayText || m.content || "",
          })),
          { role: "user", content: oaiUserContent.length === 1 ? oaiUserContent[0].text : oaiUserContent },
        ];
        const resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: "gpt-4o", max_tokens: 4000, messages: oaiMsgs }),
        });
        const apiErr = await handleApiError(resp, "OpenAI");
        if (apiErr) { aText = apiErr; }
        else {
          const data = await resp.json();
          if (data.error) { aText = `❌ שגיאת OpenAI: ${data.error.message || JSON.stringify(data.error)}`; }
          else { aText = data.choices?.[0]?.message?.content || "❌ OpenAI לא החזיר תשובה. נסה שוב."; }
        }

      } else if (provider === "gemini") {
        // Build Gemini-format contents
        const geminiHistory = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: extractText(m.apiContent) || m.displayText || m.content || "" }],
        }));
        const currentParts = [];
        curAttach.forEach((a) => {
          if (a.type === "image") currentParts.push({ inlineData: { mimeType: a.mediaType, data: a.data } });
          else if (a.type === "pdf" && a.data) currentParts.push({ inlineData: { mimeType: "application/pdf", data: a.data } });
        });
        currentParts.push({ text: fullText || "נתח" });
        const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: buildSystemPrompt() + "\n\n⚡ חשוב: היה תמציתי וממוקד. תשובות קצרות עם עיקרי הדברים. אל תחזור על עצמך. השתמש בנקודות תמציתיות." + buildCtx() }] },
            contents: [...geminiHistory, { role: "user", parts: currentParts }],
            tools: [{ googleSearch: {} }],
          }),
        });
        const apiErr = await handleApiError(resp, "Gemini");
        if (apiErr) { aText = apiErr; }
        else {
          const data = await resp.json();
          if (data.error) {
            aText = `❌ שגיאת Gemini: ${data.error.message || JSON.stringify(data.error)}`;
          } else {
            aText = data.candidates?.[0]?.content?.parts?.filter((p) => p.text).map((p) => p.text).join("\n") || "❌ Gemini לא החזיר תשובה. נסה שוב.";
            // Check if Gemini used Google Search grounding
            const grounding = data.candidates?.[0]?.groundingMetadata;
            if (grounding?.searchEntryPoint || grounding?.groundingChunks?.length) usedSearch = true;
          }
        }
      }

      // Parse and apply Gantt commands from AI response
      const { cleanText, ganttCmds } = applyGanttCommands(aText);

      const aMsg = { role: "assistant", content: cleanText, apiContent: aText, usedSearch, ganttCmds: ganttCmds.length > 0 ? ganttCmds : undefined };
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

      // Append follow-up Q&A to matching document conversation + timeline summary
      const followUpMatch = displayText.match(/^לגבי "(.+?)" - (.+)/);
      if (followUpMatch) {
        const docTitle = followUpMatch[1];
        const question = followUpMatch[2].trim();
        // Create a concise timeline entry: date + question + first line of answer
        const firstLine = aText.split("\n").find((l) => l.trim().length > 10) || aText.slice(0, 120);
        const timelineEntry = {
          date: new Date().toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }),
          question: question.slice(0, 80),
          summary: firstLine.replace(/^[#*\-•]+\s*/, "").slice(0, 150),
        };
        setDocuments((prev) => prev.map((d) =>
          d.title === docTitle
            ? {
                ...d,
                conversation: [...(d.conversation || []), { role: "user", text: displayText }, { role: "assistant", text: aText }],
                timeline: [...(d.timeline || []), timelineEntry],
              }
            : d
        ));
      }
    } catch (e) {
      const errMsg = e.message?.includes("30 שניות")
        ? e.message
        : e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")
          ? "❌ שגיאת רשת — בדוק את החיבור לאינטרנט ונסה שוב."
          : "❌ שגיאה בחיבור: " + e.message;
      setMessages([...newMsgs, { role: "assistant", content: errMsg }]);
    }
    setLoading(false);
  }, [attachments, messages, buildCtx, setDocuments, provider, anthropicKey, openaiKey, geminiKey, applyGanttCommands]);

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
    const today = new Date(todayStr());
    const dates = phases.flatMap((p) => [new Date(p.start), new Date(p.end)]);
    // Include today in the range so the "today" line is always visible
    dates.push(today);
    const min = new Date(Math.min(...dates)); const max = new Date(Math.max(...dates));
    min.setDate(min.getDate() - 7); max.setDate(max.getDate() + 14);
    return { minDate: min.toISOString().split("T")[0], totalDays: daysBetween(min.toISOString().split("T")[0], max.toISOString().split("T")[0]) };
  }, [phases]);

  /* ─── Shared: parse & apply Gantt commands ─── */
  const applyGanttCommands = useCallback((aText) => {
    const ganttCmds = [];
    const ganttRegex = /\[GANTT:(ADD|UPDATE|DELETE|MOVE|REORDER)\|(.+?)\]/g;
    let gMatch;
    while ((gMatch = ganttRegex.exec(aText)) !== null) {
      ganttCmds.push({ action: gMatch[1], params: gMatch[2].split("|").map((s) => s.trim()) });
    }
    const cleanText = ganttCmds.length > 0 ? aText.replace(/\n?\[GANTT:[^\]]+\]/g, "").trim() : aText;

    if (ganttCmds.length > 0) {
      setGanttVersions((prev) => [...prev.slice(-19), {
        id: uid(), date: new Date().toLocaleString("he-IL"),
        label: ganttCmds.map((c) => `${c.action}: ${c.params[0]}`).join(", "),
        phases: JSON.parse(JSON.stringify(phases)),
      }]);
      setPhases((prev) => {
        let updated = [...prev];
        ganttCmds.forEach((cmd) => {
          const [p0, p1, p2, p3] = cmd.params;
          if (cmd.action === "ADD") {
            updated.push({ id: uid(), name: p0, start: p1, end: p2, color: p3 || "#6366f1", status: "pending", contractor: "", progress: 0 });
          } else if (cmd.action === "DELETE") {
            updated = updated.filter((ph) => !ph.name.includes(p0));
          } else if (cmd.action === "MOVE") {
            updated = updated.map((ph) => ph.name.includes(p0) ? { ...ph, start: p1, end: p2 } : ph);
          } else if (cmd.action === "UPDATE") {
            const fields = cmd.params.slice(1);
            updated = updated.map((ph) => {
              if (!ph.name.includes(p0)) return ph;
              const copy = { ...ph };
              fields.forEach((f) => {
                const [key, ...rest] = f.split("=");
                const val = rest.join("=");
                if (key === "progress") copy.progress = parseInt(val, 10) || 0;
                else if (key && val) copy[key.trim()] = val.trim();
              });
              return copy;
            });
          } else if (cmd.action === "REORDER") {
            const names = cmd.params;
            const reordered = [];
            names.forEach((n) => {
              const found = updated.find((ph) => ph.name.includes(n));
              if (found) reordered.push(found);
            });
            // Append any phases not mentioned in the reorder list
            updated.forEach((ph) => { if (!reordered.find((r) => r.id === ph.id)) reordered.push(ph); });
            updated = reordered;
          }
        });
        return updated;
      });
    }
    return { cleanText, ganttCmds };
  }, [phases, setPhases, setGanttVersions]);

  /* ─── Gantt inline chat ─── */
  const sendGanttMessage = useCallback(async (text) => {
    if (!text.trim() || ganttLoading) return;
    const userMsg = { role: "user", text };
    const newChat = [...ganttChat, userMsg];
    setGanttChat([...newChat, { role: "assistant", text: "", loading: true }]);
    setGanttInput(""); setGanttLoading(true);
    setTimeout(() => ganttChatRef.current?.scrollTo(0, ganttChatRef.current.scrollHeight), 50);

    try {
      const sysPrompt = buildSystemPrompt() + "\n\n⚡ אתה עכשיו בצ'אט של עריכת גאנט. תשובות קצרות ולעניין. כשצריך שינוי - בצע אותו עם פקודות GANTT." + buildCtx();
      const chatHistory = ganttChat.filter((m) => !m.loading).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

      let aText = "";
      const doFetch = async (url, opts) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 60000);
        try { const r = await fetch(url, { ...opts, signal: ctrl.signal }); clearTimeout(t); return r; }
        catch (e) { clearTimeout(t); throw e; }
      };

      if (provider === "anthropic") {
        const resp = await doFetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2025-04-14", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, system: sysPrompt, messages: [...chatHistory, { role: "user", content: text }] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        aText = data.content?.filter((b) => b.type === "text").map((b) => b.text).join("\n") || "שגיאה";
      } else if (provider === "openai") {
        const resp = await doFetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: "gpt-4o", max_tokens: 2000, messages: [{ role: "system", content: sysPrompt }, ...chatHistory.map((m) => ({ role: m.role, content: m.content })), { role: "user", content: text }] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        aText = data.choices?.[0]?.message?.content || "שגיאה";
      } else if (provider === "gemini") {
        const gemHist = chatHistory.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
        const resp = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sysPrompt }] }, contents: [...gemHist, { role: "user", parts: [{ text }] }], tools: [{ googleSearch: {} }] }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        aText = data.candidates?.[0]?.content?.parts?.filter((p) => p.text).map((p) => p.text).join("\n") || "שגיאה";
      }

      const { cleanText, ganttCmds } = applyGanttCommands(aText);
      setGanttChat([...newChat, { role: "assistant", text: cleanText, ganttCmds: ganttCmds.length > 0 ? ganttCmds : undefined }]);
    } catch (e) {
      setGanttChat([...newChat, { role: "assistant", text: "❌ " + e.message }]);
    }
    setGanttLoading(false);
    setTimeout(() => ganttChatRef.current?.scrollTo(0, ganttChatRef.current.scrollHeight), 50);
  }, [ganttChat, ganttLoading, provider, anthropicKey, openaiKey, geminiKey, buildCtx, applyGanttCommands]);

  const openWhatsApp = useCallback((phone, text) => {
    const c = phone.replace(/[^0-9]/g, "");
    const intl = c.startsWith("0") ? "972" + c.slice(1) : c;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, "_blank");
  }, []);

  /* ═══ QUICK EXPORT ═══ */
  const quickExport = useCallback(() => {
    const data = { version: 3, exportDate: new Date().toISOString(), knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `backup-project-${new Date().toLocaleDateString("he-IL").replace(/\./g, "-")}.json`;
    a.click(); URL.revokeObjectURL(url);
    updateLastBackup();
  }, [knowledgeBase, phases, contractors, documents, projectStart, budget, dailyLogs, punchList, updateLastBackup]);

  // Backup age indicator
  const backupAge = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : -1;
  const backupColor = backupAge < 0 ? "#ef4444" : backupAge < 1 ? "#22c55e" : backupAge < 7 ? "#f59e0b" : "#ef4444";
  const backupLabel = backupAge < 0 ? "לא גובה" : backupAge < 1 ? "גובה היום" : `גובה לפני ${backupAge} ימים`;

  /* ═══ UNDO SYSTEM ═══ */
  const pushUndo = useCallback((label, restore) => {
    setUndoStack((prev) => [...prev.slice(-9), { label, restore, time: Date.now() }]);
  }, []);

  /* ═══ SEARCH ═══ */
  const searchResults = searchQuery.trim().length < 2 ? [] : (() => {
    const q = searchQuery.trim().toLowerCase();
    const results = [];
    phases.forEach((p) => { if (p.name.toLowerCase().includes(q) || (p.contractor || "").toLowerCase().includes(q)) results.push({ type: "phase", icon: "📊", title: p.name, sub: `${stLabels[p.status]} | ${p.contractor || "-"}`, data: p }); });
    contractors.forEach((c) => { if (c.name.toLowerCase().includes(q) || (c.role || "").toLowerCase().includes(q) || (c.phone || "").includes(q)) results.push({ type: "contractor", icon: "👷", title: c.name, sub: `${c.role} | ${c.phone}`, data: c }); });
    documents.forEach((d) => { if (d.title.toLowerCase().includes(q) || (d.analysis || "").toLowerCase().includes(q)) results.push({ type: "doc", icon: "📄", title: d.title, sub: `${d.status} | ${d.date}`, data: d }); });
    knowledgeBase.forEach((k) => { if (k.title.toLowerCase().includes(q) || k.content.toLowerCase().includes(q)) results.push({ type: "kb", icon: "📚", title: k.title, sub: k.content.slice(0, 60), data: k }); });
    budget.forEach((b) => { if (b.category.toLowerCase().includes(q) || (b.notes || "").toLowerCase().includes(q)) results.push({ type: "budget", icon: "💰", title: b.category, sub: `תקציב: ₪${(b.planned || 0).toLocaleString()} | בפועל: ₪${(b.actual || 0).toLocaleString()}`, data: b }); });
    punchList.forEach((p) => { if (p.title.toLowerCase().includes(q) || (p.phase || "").toLowerCase().includes(q)) results.push({ type: "punch", icon: "🔧", title: p.title, sub: `${p.phase || "-"} | ${p.resolved ? "טופל" : "פתוח"}`, data: p }); });
    return results.slice(0, 15);
  })();

  /* ═══ NOTIFICATIONS ═══ */
  const notifications = (() => {
    const n = [];
    const today = todayStr();
    // Overdue phases
    phases.forEach((p) => { if (p.status !== "done" && p.end < today) n.push({ icon: "⚠️", text: `${p.name} - מעבר לדד-ליין (${formatDate(p.end)})`, type: "danger" }); });
    // Starting soon
    phases.forEach((p) => { if (p.status === "pending" && p.start <= addDays(today, 7) && p.start >= today) n.push({ icon: "📅", text: `${p.name} - מתחיל ב-${formatDate(p.start)}`, type: "info" }); });
    // Overdue action items
    documents.forEach((d) => { (d.actionItems || []).forEach((a) => { if (!a.done && a.dueDate && a.dueDate < today) n.push({ icon: "🔴", text: `משימה: "${a.text}" (${d.title})`, type: "danger" }); }); });
    // Open punch items
    const openPunch = punchList.filter((p) => !p.resolved).length;
    if (openPunch > 0) n.push({ icon: "🔧", text: `${openPunch} ליקויים פתוחים לטיפול`, type: "warn" });
    // Backup reminder
    const backupDays = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000) : -1;
    if (backupDays < 0 || backupDays >= 7) n.push({ icon: "💾", text: backupDays < 0 ? "לא בוצע גיבוי מעולם" : `גיבוי אחרון לפני ${backupDays} ימים`, type: "warn" });
    return n;
  })();

  /* ═══ DASHBOARD DATA ═══ */
  const dashData = (() => {
    const totalPhases = phases.length;
    const donePhases = phases.filter((p) => p.status === "done").length;
    const activePhases = phases.filter((p) => p.status === "active").length;
    const delayedPhases = phases.filter((p) => p.status === "delayed").length;
    const overallProgress = totalPhases > 0 ? Math.round(phases.reduce((s, p) => s + (p.progress || 0), 0) / totalPhases) : 0;
    const totalBudget = budget.reduce((s, b) => s + (b.planned || 0), 0);
    const totalActual = budget.reduce((s, b) => s + (b.actual || 0), 0);
    const budgetDiff = totalBudget - totalActual;
    const openDocs = documents.filter((d) => d.status !== "הושלם").length;
    const openPunch = punchList.filter((p) => !p.resolved).length;
    return { totalPhases, donePhases, activePhases, delayedPhases, overallProgress, totalBudget, totalActual, budgetDiff, openDocs, openPunch };
  })();

  /* ═══ EXPORT ═══ */
  const exportCSV = useCallback(() => {
    let csv = "\uFEFF"; // BOM for Hebrew
    csv += "סוג,שם,תאריך התחלה,תאריך סיום,סטטוס,קבלן,התקדמות,תקציב מתוכנן,תקציב בפועל\n";
    phases.forEach((p) => { csv += `שלב,"${p.name}",${p.start},${p.end},${stLabels[p.status]},${p.contractor || "-"},${p.progress || 0}%,,\n`; });
    budget.forEach((b) => { csv += `תקציב,"${b.category}",,,${b.phase || "-"},,,${b.planned || 0},${b.actual || 0}\n`; });
    punchList.forEach((p) => { csv += `ליקוי,"${p.title}",${p.date || ""},,"${p.resolved ? "טופל" : "פתוח"}","${p.phase || "-"}",,,\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `project-report-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(url);
  }, [phases, budget, punchList]);

  /* ═══ TABS CONFIG ═══ */
  const tabs = [
    { id: "dash", icon: "🏠", label: "דשבורד" },
    { id: "chat", icon: "💬", label: "יועץ" },
    { id: "docs", icon: "📄", label: `מסמכים${documents.length ? ` (${documents.length})` : ""}` },
    { id: "gantt", icon: "📊", label: "גאנט" },
    { id: "budget", icon: "💰", label: "תקציב" },
    { id: "contractors", icon: "👷", label: "קבלנים" },
    { id: "log", icon: "📝", label: "יומן" },
  ];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div style={{ direction: "rtl", fontFamily: "'Noto Sans Hebrew', 'Segoe UI', sans-serif", height: "100vh", display: "flex", flexDirection: "column", background: "#f5f0eb", color: "#2c2c2c" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══════════ OVERLAYS ══════════ */}

      {showSettings && (
        <Overlay onClose={() => setShowSettings(false)}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>⚙️ הגדרות AI</span>
            <button onClick={() => setShowSettings(false)} style={BTN("#f0f0f0", "#555")}>✕</button>
          </div>
          {/* Provider tabs */}
          <div style={{ display: "flex", borderBottom: "2px solid #eee", padding: "0 20px" }}>
            {[
              { id: "anthropic", label: "Anthropic" },
              { id: "openai", label: "ChatGPT" },
              { id: "gemini", label: "Gemini" },
            ].map((p) => (
              <button key={p.id} onClick={() => setSettingsTab(p.id)}
                style={{
                  flex: 1, padding: "10px 4px", border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "13px", fontWeight: settingsTab === p.id ? 700 : 400,
                  color: settingsTab === p.id ? "#1a3a4a" : "#888",
                  background: "transparent",
                  borderBottom: settingsTab === p.id ? "2px solid #2d8a6e" : "2px solid transparent",
                  marginBottom: "-2px",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}>
                {p.label}
                {provider === p.id && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2d8a6e", display: "inline-block", flexShrink: 0 }} />}
              </button>
            ))}
          </div>
          <div style={{ padding: "16px 20px" }}>
            {settingsTab === "anthropic" && (
              <>
                <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "8px" }}>
                  🔑 API Key — <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: "#2d8a6e" }}>console.anthropic.com ↗</a>
                </div>
                <input type="password" value={anthropicKey}
                  onChange={e => { setAnthropicKey(e.target.value); localStorage.setItem("anthropic-api-key", e.target.value); }}
                  placeholder="sk-ant-..." style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
                {anthropicKey
                  ? <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "6px", fontWeight: 600 }}>✅ מפתח מוגדר</div>
                  : <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px", fontWeight: 600 }}>❌ נדרש מפתח</div>}
                {provider === "anthropic"
                  ? <div style={{ fontSize: "12px", color: "#2d8a6e", marginTop: "8px", fontWeight: 600 }}>✓ ספק פעיל</div>
                  : <button onClick={() => { setProvider("anthropic"); localStorage.setItem("ai-provider", "anthropic"); }} style={{ ...BTN(), marginTop: "8px", fontSize: "12px", padding: "6px 14px" }}>בחר ספק זה</button>}
              </>
            )}
            {settingsTab === "openai" && (
              <>
                <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "8px" }}>
                  🔑 API Key — <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: "#2d8a6e" }}>platform.openai.com ↗</a>
                </div>
                <input type="password" value={openaiKey}
                  onChange={e => { setOpenaiKey(e.target.value); localStorage.setItem("openai-api-key", e.target.value); }}
                  placeholder="sk-..." style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
                {openaiKey
                  ? <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "6px", fontWeight: 600 }}>✅ מפתח מוגדר</div>
                  : <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px", fontWeight: 600 }}>❌ נדרש מפתח</div>}
                {provider === "openai"
                  ? <div style={{ fontSize: "12px", color: "#2d8a6e", marginTop: "8px", fontWeight: 600 }}>✓ ספק פעיל</div>
                  : <button onClick={() => { setProvider("openai"); localStorage.setItem("ai-provider", "openai"); }} style={{ ...BTN(), marginTop: "8px", fontSize: "12px", padding: "6px 14px" }}>בחר ספק זה</button>}
              </>
            )}
            {settingsTab === "gemini" && (
              <>
                <div style={{ fontSize: "11.5px", color: "#888", marginBottom: "8px" }}>
                  🔑 API Key — <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#2d8a6e" }}>aistudio.google.com ↗</a>
                </div>
                <input type="password" value={geminiKey}
                  onChange={e => { setGeminiKey(e.target.value); localStorage.setItem("gemini-api-key", e.target.value); }}
                  placeholder="AIza..." style={{ ...INP, direction: "ltr", fontFamily: "monospace" }} />
                {geminiKey
                  ? <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "6px", fontWeight: 600 }}>✅ מפתח מוגדר</div>
                  : <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px", fontWeight: 600 }}>❌ נדרש מפתח</div>}
                {provider === "gemini"
                  ? <div style={{ fontSize: "12px", color: "#2d8a6e", marginTop: "8px", fontWeight: 600 }}>✓ ספק פעיל</div>
                  : <button onClick={() => { setProvider("gemini"); localStorage.setItem("ai-provider", "gemini"); }} style={{ ...BTN(), marginTop: "8px", fontSize: "12px", padding: "6px 14px" }}>בחר ספק זה</button>}
              </>
            )}
          </div>
        </Overlay>
      )}

      {showBackup && (
        <BackupPanel onClose={() => setShowBackup(false)}
          knowledgeBase={knowledgeBase} phases={phases} contractors={contractors} documents={documents} projectStart={projectStart}
          budget={budget} dailyLogs={dailyLogs} punchList={punchList}
          setKnowledgeBase={setKnowledgeBase} setPhases={setPhases} setContractors={setContractors} setDocuments={setDocuments} setProjectStart={setProjectStart}
          setBudget={setBudget} setDailyLogs={setDailyLogs} setPunchList={setPunchList}
          lastBackup={lastBackup} updateLastBackup={updateLastBackup} />
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

            {viewDoc.timeline?.length > 0 && (
              <div style={{ background: "#fef9ef", borderRadius: "12px", padding: "14px", marginBottom: "12px", border: "1px solid #f0dca0" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#8a6d1b", marginBottom: "8px" }}>📋 השתלשלות עניינים</div>
                <div style={{ fontSize: "12px", color: "#1a3a4a" }}>
                  {viewDoc.timeline.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: i < viewDoc.timeline.length - 1 ? "1px solid #f0dca060" : "none", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "11px", color: "#8a6d1b", fontWeight: 600, whiteSpace: "nowrap", minWidth: "80px", direction: "ltr", textAlign: "right" }}>{t.date}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "2px" }}>❓ {t.question}</div>
                        <div style={{ fontSize: "11.5px", color: "#555", lineHeight: 1.5 }}>💡 {t.summary}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewDoc.conversation?.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "6px" }}>💬 שיחה מלאה</div>
                {viewDoc.conversation.map((m, i) => (
                  <div key={i} style={{ background: m.role === "user" ? "#1a3a4a" : "#f8f6f3", color: m.role === "user" ? "#fff" : "#2c2c2c", borderRadius: "10px", padding: "10px 14px", marginBottom: "4px", fontSize: "12.5px" }}>
                    <div style={{ fontWeight: 600, fontSize: "11px", marginBottom: "2px", opacity: 0.7 }}>{m.role === "user" ? "אני" : "יועץ"}</div>
                    <div style={{ maxHeight: "150px", overflowY: "auto" }}>{m.text}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#1a3a4a", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <span>✅ צעדים הבאים</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => {
                    const item = prompt("הוסף צעד:");
                    if (item) {
                      const updated = { ...viewDoc, actionItems: [...(viewDoc.actionItems || []), { text: item, done: false, id: uid(), dueDate: "" }] };
                      setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                      setViewDoc(updated);
                    }
                  }} style={{ ...BTN(), fontSize: "11px", padding: "3px 10px" }}>+ הוסף</button>
                  {(viewDoc.actionItems || []).length > 0 && (
                    <button onClick={() => {
                      const items = (viewDoc.actionItems || []).filter((a) => !a.done);
                      if (!items.length) { alert("אין משימות פתוחות לייצוא"); return; }
                      const calEvents = items.map((a) => {
                        const d = a.dueDate || new Date().toISOString().split("T")[0];
                        const clean = d.replace(/-/g, "");
                        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(a.text + " - " + viewDoc.title)}&dates=${clean}/${clean}&details=${encodeURIComponent("משימה מיועץ הבנייה: " + viewDoc.title)}`;
                      });
                      calEvents.forEach((url) => window.open(url, "_blank"));
                    }} style={{ ...BTN("#4285f4"), fontSize: "11px", padding: "3px 8px" }} title="ייצוא ל-Google Calendar">📅 GCal</button>
                  )}
                  {(viewDoc.actionItems || []).length > 0 && (
                    <button onClick={() => {
                      const items = (viewDoc.actionItems || []).filter((a) => !a.done);
                      if (!items.length) { alert("אין משימות פתוחות לייצוא"); return; }
                      const taskLines = items.map((a) => (a.dueDate ? `${a.text} (עד ${a.dueDate})` : a.text)).join("\n");
                      const url = `https://tasks.google.com/embed/?origin=https://calendar.google.com`;
                      navigator.clipboard.writeText(taskLines).then(() => {
                        alert("המשימות הועתקו ללוח!\n\nלחץ OK לפתיחת Google Tasks.\nשם תוכל להדביק ולהוסיף את המשימות.");
                        window.open(url, "_blank");
                      }).catch(() => {
                        alert("לא ניתן להעתיק. המשימות:\n\n" + taskLines);
                      });
                    }} style={{ ...BTN("#0d9d58"), fontSize: "11px", padding: "3px 8px" }} title="ייצוא ל-Google Tasks">✅ Tasks</button>
                  )}
                </div>
              </div>
              {(viewDoc.actionItems || []).length === 0 ? (
                <div style={{ fontSize: "12px", color: "#999" }}>אין צעדים. לחץ "הוסף" להוסיף.</div>
              ) : (viewDoc.actionItems || []).map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
                  <button onClick={() => {
                    const updated = { ...viewDoc, actionItems: viewDoc.actionItems.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) };
                    setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                    setViewDoc(updated);
                  }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>{a.done ? "✅" : "⬜"}</button>
                  <span style={{ fontSize: "13px", textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.5 : 1, flex: 1, minWidth: "100px" }}>{a.text}</span>
                  <input type="date" value={a.dueDate || ""} onChange={(e) => {
                    const updated = { ...viewDoc, actionItems: viewDoc.actionItems.map((x) => (x.id === a.id ? { ...x, dueDate: e.target.value } : x)) };
                    setDocuments((p) => p.map((d) => (d.id === viewDoc.id ? updated : d)));
                    setViewDoc(updated);
                  }} style={{ border: "1px solid #ddd", borderRadius: "6px", padding: "2px 4px", fontSize: "11px", fontFamily: "inherit", direction: "ltr", width: "120px", color: a.dueDate ? (a.dueDate < new Date().toISOString().split("T")[0] && !a.done ? "#e74c3c" : "#333") : "#aaa" }}
                    title="תאריך יעד" />
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

      {/* ══════════ BUDGET EDIT OVERLAY ══════════ */}
      {editBudget && (
        <Overlay onClose={() => setEditBudget(null)}>
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>💰 {editBudget.id ? "ערוך" : "הוסף"} סעיף תקציב</h3>
              <button onClick={() => setEditBudget(null)} style={BTN("#f0f0f0", "#555")}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input value={editBudget.category} onChange={(e) => setEditBudget({ ...editBudget, category: e.target.value })} placeholder="שם סעיף (למשל: עבודות חשמל)" style={INP} />
              <select value={editBudget.phase || ""} onChange={(e) => setEditBudget({ ...editBudget, phase: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
                <option value="">-- שלב --</option>
                {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>תקציב מתוכנן (₪)</label>
                  <input type="number" value={editBudget.planned} onChange={(e) => setEditBudget({ ...editBudget, planned: parseInt(e.target.value) || 0 })} style={INP} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>בפועל (₪)</label>
                  <input type="number" value={editBudget.actual} onChange={(e) => setEditBudget({ ...editBudget, actual: parseInt(e.target.value) || 0 })} style={INP} />
                </div>
              </div>
              <textarea value={editBudget.notes || ""} onChange={(e) => setEditBudget({ ...editBudget, notes: e.target.value })} placeholder="הערות..." rows={2} style={{ ...INP, resize: "vertical" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => {
                  if (!editBudget.category.trim()) return;
                  if (editBudget.id) { setBudget((p) => p.map((b) => b.id === editBudget.id ? editBudget : b)); }
                  else { setBudget((p) => [...p, { ...editBudget, id: uid() }]); }
                  setEditBudget(null);
                }} style={{ ...BTN(), flex: 1 }}>💾 שמור</button>
                {editBudget.id && <button onClick={() => {
                  const removed = editBudget;
                  pushUndo("סעיף תקציב נמחק", () => setBudget((p) => [...p, removed]));
                  setBudget((p) => p.filter((b) => b.id !== editBudget.id));
                  setEditBudget(null);
                }} style={BTN("#fee2e2", "#dc2626")}>🗑️</button>}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══════════ DAILY LOG EDIT OVERLAY ══════════ */}
      {editLog && (
        <Overlay onClose={() => setEditLog(null)}>
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>📝 {editLog.id ? "ערוך" : "הוסף"} רשומת יומן</h3>
              <button onClick={() => setEditLog(null)} style={BTN("#f0f0f0", "#555")}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>תאריך</label>
                  <input type="date" value={editLog.date} onChange={(e) => setEditLog({ ...editLog, date: e.target.value })} style={INP} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>מזג אוויר</label>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {["☀️", "⛅", "🌧️", "🌪️", "❄️"].map((w) => (
                      <button key={w} onClick={() => setEditLog({ ...editLog, weather: w })} style={{ background: editLog.weather === w ? "#2d8a6e" : "#f5f0eb", border: "none", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", fontSize: "16px" }}>{w}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>מספר עובדים</label>
                  <input type="number" value={editLog.workers} onChange={(e) => setEditLog({ ...editLog, workers: parseInt(e.target.value) || 0 })} style={INP} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>שלב</label>
                  <select value={editLog.phase || ""} onChange={(e) => setEditLog({ ...editLog, phase: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
                    <option value="">-- שלב --</option>
                    {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <textarea value={editLog.notes || ""} onChange={(e) => setEditLog({ ...editLog, notes: e.target.value })} placeholder="מה נעשה היום..." rows={3} style={{ ...INP, resize: "vertical" }} />
              <textarea value={editLog.issues || ""} onChange={(e) => setEditLog({ ...editLog, issues: e.target.value })} placeholder="בעיות / עיכובים (אופציונלי)" rows={2} style={{ ...INP, resize: "vertical", borderColor: "#fecaca" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => {
                  if (editLog.id) { setDailyLogs((p) => p.map((l) => l.id === editLog.id ? editLog : l)); }
                  else { setDailyLogs((p) => [...p, { ...editLog, id: uid() }]); }
                  setEditLog(null);
                }} style={{ ...BTN(), flex: 1 }}>💾 שמור</button>
                {editLog.id && <button onClick={() => {
                  const removed = editLog;
                  pushUndo("רשומת יומן נמחקה", () => setDailyLogs((p) => [...p, removed]));
                  setDailyLogs((p) => p.filter((l) => l.id !== editLog.id));
                  setEditLog(null);
                }} style={BTN("#fee2e2", "#dc2626")}>🗑️</button>}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══════════ PUNCH-LIST EDIT OVERLAY ══════════ */}
      {editPunch && (
        <Overlay onClose={() => setEditPunch(null)}>
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1a3a4a" }}>🔧 {editPunch.id ? "ערוך" : "הוסף"} ליקוי</h3>
              <button onClick={() => setEditPunch(null)} style={BTN("#f0f0f0", "#555")}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input value={editPunch.title} onChange={(e) => setEditPunch({ ...editPunch, title: e.target.value })} placeholder="תיאור הליקוי" style={INP} />
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>שלב</label>
                  <select value={editPunch.phase || ""} onChange={(e) => setEditPunch({ ...editPunch, phase: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
                    <option value="">-- שלב --</option>
                    {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>חומרה</label>
                  <select value={editPunch.severity} onChange={(e) => setEditPunch({ ...editPunch, severity: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                  </select>
                </div>
              </div>
              <input type="date" value={editPunch.date || todayStr()} onChange={(e) => setEditPunch({ ...editPunch, date: e.target.value })} style={INP} />
              <textarea value={editPunch.notes || ""} onChange={(e) => setEditPunch({ ...editPunch, notes: e.target.value })} placeholder="הערות..." rows={2} style={{ ...INP, resize: "vertical" }} />
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "#1a3a4a", cursor: "pointer" }}>
                <input type="checkbox" checked={editPunch.resolved || false} onChange={(e) => setEditPunch({ ...editPunch, resolved: e.target.checked })} />
                טופל ✅
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => {
                  if (!editPunch.title.trim()) return;
                  if (editPunch.id) { setPunchList((p) => p.map((x) => x.id === editPunch.id ? editPunch : x)); }
                  else { setPunchList((p) => [...p, { ...editPunch, id: uid() }]); }
                  setEditPunch(null);
                }} style={{ ...BTN(), flex: 1 }}>💾 שמור</button>
                {editPunch.id && <button onClick={() => {
                  const removed = editPunch;
                  pushUndo("ליקוי נמחק", () => setPunchList((p) => [...p, removed]));
                  setPunchList((p) => p.filter((x) => x.id !== editPunch.id));
                  setEditPunch(null);
                }} style={BTN("#fee2e2", "#dc2626")}>🗑️</button>}
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══════════ HEADER ══════════ */}
      <div style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #2d6b5a 50%, #3a8b6e 100%)", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 2px 16px rgba(0,0,0,0.15)", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🏠</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontSize: "15px", fontWeight: 700 }}>יועץ הבנייה שלי</div>
        </div>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", fontWeight: 400 }}>v{APP_VERSION}</span>
        <button onClick={() => setShowSearch((v) => !v)} style={{ background: showSearch ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>🔍</button>
        {notifications.length > 0 && (
          <button onClick={() => setActiveTab("dash")} style={{ background: "rgba(239,68,68,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", position: "relative" }}>
            🔔<span style={{ position: "absolute", top: -3, left: -3, background: "#ef4444", borderRadius: "50%", width: 15, height: 15, fontSize: "9px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifications.length}</span>
          </button>
        )}
        <button onClick={() => { setSettingsTab(provider); setShowSettings(true); }} style={{ background: activeKey ? "rgba(255,255,255,0.15)" : "rgba(239,68,68,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>⚙️</button>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={quickExport} title="ייצוא מהיר" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px 0 0 8px", color: "#fff", padding: "5px 8px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}>💾</button>
          <button onClick={() => setShowBackup(true)} title={backupLabel} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderLeft: "none", borderRadius: "0 8px 8px 0", color: "#fff", padding: "5px 8px", cursor: "pointer", fontSize: "10px", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "3px" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: backupColor, display: "inline-block" }}></span>
            <span style={{ opacity: 0.85 }}>☁️</span>
          </button>
        </div>
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

      {/* ══════════ SEARCH BAR ══════════ */}
      {showSearch && (
        <div style={{ background: "#fff", padding: "8px 12px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus placeholder="חפש בכל המערכת..." style={{ ...INP, fontSize: "13px", padding: "8px 12px" }} />
          {searchResults.length > 0 && (
            <div style={{ maxHeight: "250px", overflowY: "auto", marginTop: "6px" }}>
              {searchResults.map((r, i) => (
                <div key={i} onClick={() => {
                  if (r.type === "doc") { setViewDoc(r.data); }
                  else if (r.type === "contractor") { setEditContractor({ ...r.data }); }
                  else if (r.type === "phase") { setEditPhase({ ...r.data }); }
                  setShowSearch(false); setSearchQuery("");
                }} style={{ display: "flex", gap: "8px", padding: "8px 6px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", alignItems: "center" }}>
                  <span style={{ fontSize: "16px" }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a3a4a" }}>{r.title}</div>
                    <div style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div style={{ fontSize: "12px", color: "#999", textAlign: "center", padding: "12px" }}>לא נמצאו תוצאות</div>
          )}
        </div>
      )}

      {/* ══════════ UNDO TOAST ══════════ */}
      {undoStack.length > 0 && Date.now() - undoStack[undoStack.length - 1].time < 8000 && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", background: "#1a3a4a", color: "#fff", borderRadius: "12px", padding: "8px 16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px", zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          <span>↩ {undoStack[undoStack.length - 1].label}</span>
          <button onClick={() => { const action = undoStack[undoStack.length - 1]; action.restore(); setUndoStack((p) => p.slice(0, -1)); }} style={{ ...BTN("#fff", "#1a3a4a"), fontSize: "11px", padding: "4px 10px" }}>בטל</button>
        </div>
      )}

      {/* ══════════ CONTENT ══════════ */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* ═══ DASHBOARD TAB ═══ */}
        {activeTab === "dash" && (
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
        )}

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

            {!activeKey && (
              <div style={{ background: "#fef3c7", borderBottom: "1px solid #f59e0b", padding: "10px 16px", fontSize: "13px", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>⚠️ לא הוגדר API Key — היועץ לא יעבוד</span>
                <button onClick={() => { setSettingsTab(provider); setShowSettings(true); }} style={{ background: "none", border: "none", color: "#2d8a6e", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", fontSize: "13px" }}>הגדר עכשיו ←</button>
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
                            {msg.ganttCmds && <div style={TAG("#fef3c7", "#92400e")}>📊 הגאנט עודכן ({msg.ganttCmds.length} {msg.ganttCmds.length === 1 ? "שינוי" : "שינויים"})</div>}
                            <div style={{ marginTop: (msg.usedSearch || msg.ganttCmds) ? "8px" : 0 }}>{formatMsg(msg.content || "")}</div>
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
                                // Save current as version before restoring
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

                  <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <div style={{ minWidth: Math.max(600, totalDays * 2.5) }}>
                      {/* Month headers - same flex layout as phase rows for alignment */}
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
                        return (
                          <div
                            key={phase.id}
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
                              transition: "border-top 0.15s, opacity 0.15s",
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
                                <div style={{ position: "absolute", left: "5px", top: "50%", transform: "translateY(-50%)", width: "6px", height: "6px", borderRadius: "50%", background: stColors[phase.status] }} />
                                <div style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", fontSize: "9px", color: phase.color, fontWeight: 600, whiteSpace: "nowrap" }}>{formatDate(phase.start)}-{formatDate(phase.end)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "10px", color: "#888" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 8, height: 1.5, background: "#ef4444" }} />היום ({formatDate(todayStr())})</span>
                        {Object.entries(stLabels).map(([k, v]) => <span key={k} style={{ display: "flex", alignItems: "center", gap: "3px" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: stColors[k] }} />{v}</span>)}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* ─── Gantt inline chat ─── */}
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

        {/* ═══ BUDGET TAB ═══ */}
        {activeTab === "budget" && (
          <div style={{ flex: 1, padding: "14px", overflowY: "auto" }}>
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
        )}

        {/* ═══ DAILY LOG TAB ═══ */}
        {activeTab === "log" && (
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
