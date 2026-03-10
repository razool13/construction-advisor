export const APP_VERSION = "2.1.0";

export const GOOGLE_CLIENT_ID = "536306909343-ttqpfvm7bpqia6f94lnetk17e0sv9v7m.apps.googleusercontent.com";

export const stColors = { pending: "#94a3b8", active: "#f59e0b", done: "#22c55e", delayed: "#ef4444" };
export const stLabels = { pending: "טרם התחיל", active: "בביצוע", done: "הושלם", delayed: "מעוכב" };
export const stCycle = ["pending", "active", "done", "delayed"];
export const docStColors = { "חדש": "#3b82f6", "בטיפול": "#f59e0b", "הושלם": "#22c55e", "לבירור": "#ef4444" };

export const PHASES_TEMPLATE = [
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

export const WA_TEMPLATES = [
  { id: "status", label: "סטטוס", icon: "📊", text: 'שלום {name}, מה שלומך? רציתי לבדוק מה הסטטוס של {phase} ({progress}% בוצע, תאריך יעד: {endDate}). האם צפויים עיכובים? אשמח לעדכון.' },
  { id: "schedule", label: "תיאום", icon: "📅", text: "שלום {name}, רציתי לתאם מועד להמשך עבודות {phase}. לפי התוכנית ההתחלה ב-{startDate}. מתי נוח?" },
  { id: "issue", label: "בירור", icon: "💡", text: "שלום {name}, שמתי לב לנקודה שרציתי לברר: [תאר]. מה דעתך?" },
  { id: "payment", label: "תשלום", icon: "💰", text: "שלום {name}, איך עומדים עם אבן הדרך? {phase} ב-{progress}% השלמה. אשמח לתאם בדיקה ולהתקדם." },
  { id: "reminder", label: "תזכורת", icon: "🔔", text: 'שלום {name}, תזכורת ידידותית - {phase} אמור להתקדם בקרוב (מ-{startDate} עד {endDate}). הכל בתוקף?' },
  { id: "thanks", label: "תודה", icon: "🙏", text: "שלום {name}, רציתי להגיד תודה על העבודה המקצועית!" },
];

export const CATEGORIES = [
  { id: "quote", icon: "📋", label: "ניתוח הצעת מחיר" },
  { id: "negotiate", icon: "🤝", label: "אסטרטגיית שיחה" },
  { id: "technical", icon: "🔧", label: "שאלה טכנית" },
  { id: "budget", icon: "💰", label: "תקציב ומימון" },
  { id: "research", icon: "🔍", label: "מחקר מוצרים" },
  { id: "chat", icon: "💬", label: "שיחה חופשית" },
];

export const CONTRACTOR_DOC_TEMPLATES = [
  { id: "quote",     icon: "📋", label: "הצעת מחיר" },
  { id: "contract",  icon: "📝", label: "חוזה" },
  { id: "insurance", icon: "🛡️", label: "ביטוח" },
  { id: "license",   icon: "📜", label: "רישיון" },
  { id: "invoice",   icon: "🧾", label: "חשבונית" },
  { id: "warranty",  icon: "✅", label: "אחריות" },
];
