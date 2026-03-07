import React, { useState, useRef, useEffect, useCallback } from 'react';

// Utils
import { formatDate, addDays, daysBetween, todayStr, clamp, uid } from './utils/dates.js';
import { extractPdfText, toB64, toAB, toTxt } from './utils/files.js';
import {
  APP_VERSION, GOOGLE_CLIENT_ID,
  stColors, stLabels, stCycle, docStColors,
  PHASES_TEMPLATE, WA_TEMPLATES, CATEGORIES
} from './utils/constants.js';

// UI
import { BTN, INP, CARD, TAG } from './ui/styles.js';
import { Overlay } from './ui/Overlay.jsx';
import { formatMsg } from './ui/Markdown.jsx';

// AI
import { buildSystemPrompt } from './ai/system-prompt.js';
import { parseGanttCommands, applyGanttCommandsToPhases } from './ai/gantt-commands.js';
import { sendToProvider, sendToProviderSimple, createFetchWithTimeout, createSimpleFetch, extractText } from './ai/provider.js';

// Core
import { useStorage } from './core/useStorage.js';

// Features
import { BackupPanel } from './features/backup/BackupPanel.jsx';
import { SettingsPanel } from './features/settings/SettingsPanel.jsx';
import { DashboardTab } from './features/dashboard/DashboardTab.jsx';
import { ChatTab } from './features/chat/ChatTab.jsx';
import { DocsTab } from './features/documents/DocsTab.jsx';
import { ContractorsTab } from './features/contractors/ContractorsTab.jsx';
import { BudgetTab } from './features/budget/BudgetTab.jsx';
import { DailyLogTab } from './features/daily-log/DailyLogTab.jsx';
import { GanttTab } from './features/gantt/GanttTab.jsx';

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
  const [ganttChat, setGanttChat] = useState([]);
  const [ganttInput, setGanttInput] = useState("");
  const [ganttLoading, setGanttLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [editLog, setEditLog] = useState(null);
  const [editPunch, setEditPunch] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [settingsTab, setSettingsTab] = useState("anthropic");
  const [fabOpen, setFabOpen] = useState(false);

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

  /* ─── Shared: parse & apply Gantt commands ─── */
  const applyGanttCommands = useCallback((aText) => {
    const { cleanText, ganttCmds } = parseGanttCommands(aText);

    if (ganttCmds.length > 0) {
      setGanttVersions((prev) => [...prev.slice(-19), {
        id: uid(), date: new Date().toLocaleString("he-IL"),
        label: ganttCmds.map((c) => `${c.action}: ${c.params[0]}`).join(", "),
        phases: JSON.parse(JSON.stringify(phases)),
      }]);
      setPhases((prev) => applyGanttCommandsToPhases(ganttCmds, prev));
    }
    return { cleanText, ganttCmds };
  }, [phases, setPhases, setGanttVersions]);

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

    // Create fetch helper with timeout (longer for media/PDF)
    const timeoutMs = curAttach.length > 0 ? 120000 : 60000;
    const fetchWithTimeout = createFetchWithTimeout(timeoutMs);

    try {
      const systemPrompt = buildSystemPrompt() + buildCtx();
      const { text: aText, usedSearch } = await sendToProvider({
        provider, apiKey: activeKey, systemPrompt,
        messages, userContent, fullText, curAttach, fetchWithTimeout,
      });

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
      const errMsg = e.message?.includes("שניות ללא תגובה")
        ? e.message
        : e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")
          ? "❌ שגיאת רשת — בדוק את החיבור לאינטרנט ונסה שוב."
          : "❌ שגיאה בחיבור: " + e.message;
      setMessages([...newMsgs, { role: "assistant", content: errMsg }]);
    }
    setLoading(false);
  }, [attachments, messages, buildCtx, setDocuments, provider, activeKey, applyGanttCommands]);

  /* ─── Gantt inline chat ─── */
  const sendGanttMessage = useCallback(async (text) => {
    if (!text.trim() || ganttLoading) return;
    const userMsg = { role: "user", text };
    const newChat = [...ganttChat, userMsg];
    setGanttChat([...newChat, { role: "assistant", text: "", loading: true }]);
    setGanttInput(""); setGanttLoading(true);

    try {
      const sysPrompt = buildSystemPrompt() + "\n\n⚡ אתה עכשיו בצ'אט של עריכת גאנט. תשובות קצרות ולעניין. כשצריך שינוי - בצע אותו עם פקודות GANTT." + buildCtx();
      const chatHistory = ganttChat.filter((m) => !m.loading).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text }));

      const doFetch = createSimpleFetch(60000);
      const aText = await sendToProviderSimple({
        provider, apiKey: activeKey, systemPrompt: sysPrompt, chatHistory, text, doFetch,
      });

      const { cleanText, ganttCmds } = applyGanttCommands(aText);
      setGanttChat([...newChat, { role: "assistant", text: cleanText, ganttCmds: ganttCmds.length > 0 ? ganttCmds : undefined }]);
    } catch (e) {
      setGanttChat([...newChat, { role: "assistant", text: "❌ " + e.message }]);
    }
    setGanttLoading(false);
  }, [ganttChat, ganttLoading, provider, activeKey, buildCtx, applyGanttCommands]);

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

  /* ═══ SMART SUGGESTIONS ═══ */
  const smartSuggestions = (() => {
    const s = [];
    const today = todayStr();
    // Phases pending but start date passed
    phases.forEach((p) => { if (p.status === "pending" && p.start <= today) s.push({ icon: "🚀", text: `"${p.name}" אמור היה להתחיל (${formatDate(p.start)}) — עדכן סטטוס לביצוע`, action: () => { setPhases((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "active" } : x)); }, btn: "התחל" }); });
    // Active phase at 100% but not done
    phases.forEach((p) => { if (p.status === "active" && p.progress >= 100) s.push({ icon: "✅", text: `"${p.name}" ב-100% — סמן כהושלם?`, action: () => { setPhases((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "done" } : x)); }, btn: "הושלם" }); });
    // No contractor assigned to upcoming phase
    phases.forEach((p) => { if (p.status === "pending" && !p.contractor && p.start <= addDays(today, 14)) s.push({ icon: "👷", text: `"${p.name}" מתחיל ב-${formatDate(p.start)} ללא קבלן — שייך קבלן`, action: () => { setActiveTab("gantt"); setEditPhase({ ...p }); }, btn: "עריכה" }); });
    // No budget items
    if (phases.length > 0 && budget.length === 0) s.push({ icon: "💰", text: "טרם הוגדר תקציב — הגדר סעיפי תקציב", action: () => setActiveTab("budget"), btn: "תקציב" });
    // Budget overrun
    budget.forEach((b) => { if (b.actual > b.planned && b.planned > 0) s.push({ icon: "📊", text: `חריגת תקציב ב"${b.category}": ₪${(b.actual - b.planned).toLocaleString()} מעל התקציב`, action: () => setActiveTab("budget"), btn: "צפה" }); });
    // No daily log today
    if (phases.some((p) => p.status === "active") && !dailyLogs.some((l) => l.date === today)) s.push({ icon: "📝", text: "טרם נרשם יומן לעבודה היום", action: () => { setActiveTab("log"); setEditLog({ date: today, weather: "☀️", workers: 0, phase: "", notes: "", issues: "" }); }, btn: "רשום" });
    return s.slice(0, 5);
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
        <SettingsPanel onClose={() => setShowSettings(false)}
          provider={provider} setProvider={setProvider}
          anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
          openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
          geminiKey={geminiKey} setGeminiKey={setGeminiKey} />
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
              {WA_TEMPLATES.map((t) => {
                const cp = phases.find((p) => p.contractor === waCompose.name) || {};
                return (
                <button key={t.id} onClick={() => setWaText(t.text.replace("{name}", waCompose.name).replace("{phase}", cp.name || "השלב").replace("{progress}", cp.progress || 0).replace("{startDate}", formatDate(cp.start)).replace("{endDate}", formatDate(cp.end)))}
                  style={{ ...BTN("#f5f0eb", "#2c2c2c"), fontSize: "11.5px", padding: "5px 9px", fontWeight: 500 }}>{t.icon} {t.label}</button>
                );
              })}
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
          <DashboardTab dashData={dashData} notifications={notifications} smartSuggestions={smartSuggestions}
            phases={phases} exportCSV={exportCSV} quickExport={quickExport} setActiveTab={setActiveTab} />
        )}

        {/* ═══ CHAT TAB ═══ */}
        {activeTab === "chat" && (
          <ChatTab activeKey={activeKey} provider={provider} setShowSettings={setShowSettings}
            showIntro={showIntro} setShowIntro={setShowIntro}
            messages={messages} messagesEndRef={messagesEndRef}
            input={input} setInput={setInput} textareaRef={textareaRef}
            loading={loading} sendMessage={sendMessage}
            attachments={attachments} removeAttachment={removeAttachment} processingFile={processingFile}
            dragOver={dragOver} setDragOver={setDragOver} handleDrop={handleDrop}
            fileInputRef={fileInputRef} processFile={processFile} />
        )}

        {/* ═══ DOCS TAB ═══ */}
        {activeTab === "docs" && (
          <DocsTab documents={documents} setDocuments={setDocuments} setViewDoc={setViewDoc} />
        )}

        {/* ═══ GANTT TAB ═══ */}
        {activeTab === "gantt" && (
          <GanttTab phases={phases} setPhases={setPhases}
            projectStart={projectStart} setProjectStart={setProjectStart}
            ganttVersions={ganttVersions} setGanttVersions={setGanttVersions}
            ganttChat={ganttChat} setGanttChat={setGanttChat}
            ganttInput={ganttInput} setGanttInput={setGanttInput} ganttLoading={ganttLoading}
            sendGanttMessage={sendGanttMessage} setEditPhase={setEditPhase}
            anthropicKey={anthropicKey} openaiKey={openaiKey} geminiKey={geminiKey} />
        )}

        {/* ═══ CONTRACTORS TAB ═══ */}
        {activeTab === "contractors" && (
          <ContractorsTab contractors={contractors} phases={phases}
            setEditContractor={setEditContractor} setWaCompose={setWaCompose}
            setWaText={setWaText} openWhatsApp={openWhatsApp} />
        )}

        {/* ═══ BUDGET TAB ═══ */}
        {activeTab === "budget" && (
          <BudgetTab budget={budget} setBudget={setBudget} dashData={dashData}
            phases={phases} setEditBudget={setEditBudget} />
        )}

        {/* ═══ DAILY LOG TAB ═══ */}
        {activeTab === "log" && (
          <DailyLogTab dailyLogs={dailyLogs} punchList={punchList}
            setEditLog={setEditLog} setEditPunch={setEditPunch} />
        )}
      </div>

      {/* ═══ FLOATING ACTION BUTTON ═══ */}
      {activeTab !== "chat" && (
        <div style={{ position: "fixed", bottom: "80px", left: "16px", zIndex: 900, direction: "ltr" }}>
          {fabOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
              {[
                { icon: "💬", label: "צ'אט", action: () => { setActiveTab("chat"); setFabOpen(false); } },
                { icon: "📊", label: "גאנט", action: () => { setActiveTab("gantt"); setFabOpen(false); } },
                { icon: "📝", label: "יומן", action: () => { setActiveTab("log"); setEditLog({ date: todayStr(), weather: "☀️", workers: 0, phase: "", notes: "", issues: "" }); setFabOpen(false); } },
                { icon: "🔧", label: "ליקוי", action: () => { setActiveTab("log"); setEditPunch({ title: "", phase: "", severity: "medium", notes: "", resolved: false, date: todayStr() }); setFabOpen(false); } },
                { icon: "💾", label: "גיבוי", action: () => { quickExport(); setFabOpen(false); } },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{
                  display: "flex", alignItems: "center", gap: "6px", background: "#fff", border: "1px solid #e5e5e5",
                  borderRadius: "20px", padding: "7px 14px 7px 10px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  fontSize: "12.5px", fontFamily: "inherit", fontWeight: 600, color: "#1a3a4a", whiteSpace: "nowrap",
                  animation: `fabSlide 0.2s ease ${i * 0.04}s both`,
                }}><span style={{ fontSize: "15px" }}>{item.icon}</span> {item.label}</button>
              ))}
            </div>
          )}
          <button onClick={() => setFabOpen((v) => !v)} style={{
            width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
            background: fabOpen ? "#ef4444" : "#2d8a6e", color: "#fff", fontSize: "22px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.2s, background 0.2s", transform: fabOpen ? "rotate(45deg)" : "none",
          }}>+</button>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }
        @keyframes fabSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; }
        textarea::placeholder, input::placeholder { color: #aaa; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
      `}</style>
    </div>
  );
}

export { App };
