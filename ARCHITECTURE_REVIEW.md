# סקירת ארכיטקטורה - יועץ בנייה

## מצב נוכחי: ניתוח ביקורתי

### מה עובד טוב
- **פשטות הפריסה**: קובץ HTML + JSX אחד, טעינה מ-CDN, אפס build tools
- **פונקציונליות עשירה**: צ'אט AI, גאנט, מסמכים, תקציב, יומן, ליקויים, בסיס ידע, קבלנים
- **useStorage hook**: דפוס חכם של debounced persistence ל-localStorage
- **גיבוי ל-Google Drive**: שכבת שרידות מעבר ל-localStorage

### בעיות קריטיות

#### 1. מונוליט אחד (2,477 שורות)
- **קומפוננטת `App`** מכילה ~1,950 שורות - כולל לוגיקה, UI, API calls, ו-state
- 27+ משתני state ב-`useState` - אף מפתח לא יכול להבין את ה-flow
- **אי-אפשר לבדוק** שום דבר באופן מבודד (unit test)
- **אי-אפשר לשתף** פיצ'ר בודד עם אפליקציה אחרת

#### 2. הפרות של שלמות נתונים (Data Integrity)
- **הפניות מבוססות שם-מחרוזת** במקום ID:
  - `phase.contractor = "יוסי"` (לא contractor ID)
  - `budget.phase = "שלד ובנייה"` (לא phase ID)
  - `dailyLog.phase = "טיח"` (לא phase ID)
  - `punchList.phase = "חשמל"` (לא phase ID)
- **שינוי שם** של קבלן/שלב שובר את כל ההפניות
- **מחיקה** לא עושה cascade - נשארים רשומות יתומות
- **Knowledge Base** בלי ID - מבוסס על אינדקס מערך

#### 3. שכפול קוד AI Provider
- אותו קוד API call כתוב **פעמיים** (צ'אט ראשי + צ'אט גאנט)
- לכל provider (Anthropic, OpenAI, Gemini) יש בלוק `if/else` שלם
- **6 מקומות** שצריך לעדכן כשמוסיפים provider חדש
- אין abstraction - כל provider מוטמע ישירות ב-business logic

#### 4. אין הפרדה בין שכבות
- **UI ↔ לוגיקה ↔ נתונים** מעורבבים לחלוטין
- `sendMessage` (שורות 706-934) = 228 שורות שעושות: בניית UI, קריאת API, פרסור תגובה, עדכון מסמכים, חילוץ טקסט, retry logic
- סגנונות inline בכל מקום - אין design system

#### 5. Gantt Command Matching שברירי
- `ph.name.includes(p0)` - חיפוש חלקי שיכול לתפוס שלבים לא נכונים
- "טיח" יתפוס גם "טיח וריצוף" וגם "טיח כללי"
- פקודות AI מבוססות על שמות - שינוי שם שובר את כל ההיסטוריה

---

## ארכיטקטורה מוצעת: Building Blocks

### עיקרון מנחה
**כל מודול = חבילה עצמאית** שאפשר להשתמש בה באפליקציה אחרת.
מפתח שרוצה רק "צ'אט AI עם בסיס ידע" לוקח את המודול הזה.
מפתח שרוצה "ניהול גאנט" לוקח את מודול הגאנט.

### מבנה תיקיות מוצע

```
construction-advisor/
  index.html
  src/
    app.jsx                     # Shell - routing, layout, theme

    # --- שכבת נתונים (Data Layer) ---
    core/
      store.js                  # State management (Zustand)
      schema.js                 # Entity schemas + validation
      relations.js              # Foreign key management + cascade
      persistence.js            # localStorage adapter (useStorage generalized)
      backup.js                 # Export/Import/Google Drive backup

    # --- שכבת AI (AI Layer) ---
    ai/
      provider.js               # Unified AI interface
      providers/
        anthropic.js            # Anthropic adapter
        openai.js               # OpenAI adapter
        gemini.js               # Gemini adapter
      context-builder.js        # Builds project context for AI
      gantt-commands.js         # Parse + apply GANTT commands
      system-prompt.js          # System prompt management

    # --- מודולים פונקציונליים (Feature Modules) ---
    features/
      chat/
        ChatPanel.jsx           # Main chat UI
        ChatInput.jsx           # Input + attachments + drag & drop
        MessageList.jsx         # Message rendering
        useChat.js              # Chat state + send logic

      gantt/
        GanttPanel.jsx          # Gantt chart UI
        GanttBar.jsx            # Single phase bar
        GanttChat.jsx           # Inline gantt chat
        GanttHistory.jsx        # Version history overlay
        useGantt.js             # Gantt state + manipulation

      contractors/
        ContractorList.jsx      # Contractor cards
        ContractorForm.jsx      # Add/Edit overlay
        WhatsAppCompose.jsx     # WhatsApp template composer
        useContractors.js       # Contractor CRUD

      documents/
        DocumentList.jsx        # Document cards
        DocumentDetail.jsx      # Full document view + conversation
        useDocuments.js         # Document state + AI analysis

      budget/
        BudgetPanel.jsx         # Budget table + charts
        BudgetForm.jsx          # Add/Edit budget item
        useBudget.js            # Budget calculations

      daily-log/
        DailyLogPanel.jsx       # Log list + form
        useDailyLog.js          # Log CRUD

      punch-list/
        PunchListPanel.jsx      # Punch list + form
        usePunchList.js         # Punch CRUD

      knowledge-base/
        KBPanel.jsx             # Knowledge base list
        KBForm.jsx              # Add/Edit KB item
        useKnowledgeBase.js     # KB CRUD

    # --- רכיבי UI משותפים (Shared UI) ---
    ui/
      Overlay.jsx               # Modal overlay (exists today)
      Button.jsx                # Standard button variants
      Input.jsx                 # Input + Textarea
      Card.jsx                  # Card container
      Tag.jsx                   # Status/severity tags
      TabBar.jsx                # Bottom navigation
      FAB.jsx                   # Floating action button
      SearchBar.jsx             # Global search
      Markdown.jsx              # formatMsg renderer

    # --- Utilities ---
    utils/
      dates.js                  # formatDate, addDays, daysBetween, etc.
      files.js                  # PDF extraction, base64, file reading
      formatting.js             # Number formatting, phone formatting
```

### 1. שכבת נתונים (Data Layer)

#### `core/schema.js` - סכמות ו-Validation

```javascript
// כל entity מוגדר פעם אחת - סכמה אחת שמשרתת validation, forms, ו-AI context

export const PhaseSchema = {
  id: { type: 'string', auto: true },
  name: { type: 'string', required: true },
  start: { type: 'date', required: true },
  end: { type: 'date', required: true },
  status: { type: 'enum', values: ['pending', 'active', 'done', 'delayed'], default: 'pending' },
  contractorId: { type: 'ref', entity: 'contractors', nullable: true },  // ID, not name!
  progress: { type: 'number', min: 0, max: 100, default: 0 },
  color: { type: 'string', default: '#6366f1' },
};

export const ContractorSchema = {
  id: { type: 'string', auto: true },
  name: { type: 'string', required: true },
  role: { type: 'string', required: true },
  phone: { type: 'string', required: true },
  notes: { type: 'string', default: '' },
};

export const BudgetSchema = {
  id: { type: 'string', auto: true },
  category: { type: 'string', required: true },
  phaseId: { type: 'ref', entity: 'phases', nullable: true },  // ID, not name!
  planned: { type: 'number', default: 0 },
  actual: { type: 'number', default: 0 },
  notes: { type: 'string', default: '' },
};

// ... DailyLogSchema, PunchItemSchema, DocumentSchema, KnowledgeBaseSchema
```

**למה זה חשוב?**
- מקור אמת אחד לצורת הנתונים
- הפניות הן **ID-based** - שינוי שם לא שובר כלום
- Validation אוטומטי בכל שמירה
- אפשר לייצר forms אוטומטית מהסכמה

#### `core/relations.js` - ניהול קשרים

```javascript
// הגדרת קשרים בין entities

export const RELATIONS = {
  phases: {
    contractorId: { target: 'contractors', onDelete: 'nullify' },
  },
  budget: {
    phaseId: { target: 'phases', onDelete: 'nullify' },
  },
  dailyLogs: {
    phaseId: { target: 'phases', onDelete: 'nullify' },
  },
  punchList: {
    phaseId: { target: 'phases', onDelete: 'nullify' },
  },
};

// When deleting a contractor:
// - All phases with that contractorId get contractorId=null
// - No orphaned data

// When deleting a phase:
// - Budget items, logs, and punch items that reference it get phaseId=null
// - User sees them as "unlinked" instead of broken
```

#### `core/store.js` - State Management עם Zustand

```javascript
// Zustand: 1KB, zero boilerplate, works without build tools
// vs Context API: avoids prop drilling and unnecessary re-renders

import { createStore } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = createStore(
  persist(
    (set, get) => ({
      // --- Entities ---
      phases: [],
      contractors: [],
      budget: [],
      dailyLogs: [],
      punchList: [],
      documents: [],
      knowledgeBase: [],
      projectStart: todayStr(),

      // --- CRUD with referential integrity ---
      addPhase: (phase) => set(state => ({
        phases: [...state.phases, { ...phase, id: uid() }]
      })),

      deleteContractor: (id) => set(state => ({
        contractors: state.contractors.filter(c => c.id !== id),
        // Cascade: nullify references
        phases: state.phases.map(p =>
          p.contractorId === id ? { ...p, contractorId: null } : p
        ),
      })),

      deletePhase: (id) => set(state => ({
        phases: state.phases.filter(p => p.id !== id),
        budget: state.budget.map(b =>
          b.phaseId === id ? { ...b, phaseId: null } : b
        ),
        dailyLogs: state.dailyLogs.map(l =>
          l.phaseId === id ? { ...l, phaseId: null } : l
        ),
        punchList: state.punchList.map(p =>
          p.phaseId === id ? { ...p, phaseId: null } : p
        ),
      })),

      // --- Computed ---
      getBudgetTotal: () => {
        const { budget } = get();
        return {
          planned: budget.reduce((s, b) => s + (b.planned || 0), 0),
          actual: budget.reduce((s, b) => s + (b.actual || 0), 0),
        };
      },

      getContractorPhases: (contractorId) => {
        return get().phases.filter(p => p.contractorId === contractorId);
      },
    }),
    { name: 'myhouse-project' }  // Single localStorage key, atomic saves
  )
);
```

**יתרונות על פני המצב הנוכחי:**
- **Cascading deletes** - מחיקת קבלן מנקה הפניות אוטומטית
- **Key אחד ב-localStorage** - במקום 9 keys נפרדים
- **Zero prop drilling** - כל קומפוננטה מושכת מה שצריך ישירות
- **Computed values** - חישובי תקציב וכו' מוגדרים פעם אחת

### 2. שכבת AI (AI Layer)

#### `ai/provider.js` - ממשק אחיד

```javascript
// כל provider חייב לממש interface אחד פשוט

class AIProvider {
  async chat({ systemPrompt, messages, attachments }) {
    // Returns: { text: string, usedSearch: boolean }
    throw new Error('Not implemented');
  }
}

// Usage - anywhere in the app:
const ai = getProvider();  // Returns current active provider
const response = await ai.chat({
  systemPrompt: buildSystemPrompt() + buildCtx(),
  messages: chatHistory,
  attachments: currentFiles,
});
```

#### `ai/providers/anthropic.js` - Anthropic Adapter

```javascript
export class AnthropicProvider extends AIProvider {
  constructor(apiKey) { this.apiKey = apiKey; }

  async chat({ systemPrompt, messages, attachments }) {
    const body = this.buildBody(systemPrompt, messages, attachments);
    const resp = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2025-04-14',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
    return this.parseResponse(resp);
  }

  buildBody(systemPrompt, messages, attachments) { /* ... */ }
  parseResponse(resp) { /* ... */ }
}
```

**למה זה חשוב?**
- הוספת provider חדש = קובץ אחד חדש
- הצ'אט הראשי והצ'אט של הגאנט משתמשים באותו provider
- בדיקות (tests) יכולות להחליף ב-mock provider
- אפשר לחלוק את שכבת ה-AI עם אפליקציה אחרת

#### `ai/gantt-commands.js` - מנוע פקודות גאנט

```javascript
// במקום matching לפי שם חלקי - matching לפי ID

export function parseGanttCommands(text) {
  // Same regex, cleaner separation
  const commands = [];
  const regex = /\[GANTT:(ADD|UPDATE|DELETE|MOVE|REORDER)\|(.+?)\]/g;
  // ...
  return { cleanText, commands };
}

export function applyGanttCommands(commands, phases) {
  // Pure function - receives phases, returns new phases
  // No side effects, easily testable
  let updated = [...phases];

  for (const cmd of commands) {
    switch (cmd.action) {
      case 'DELETE':
        // Use exact match or ID when possible
        updated = updated.filter(p => p.name !== cmd.params[0]);
        break;
      // ...
    }
  }

  return updated;
}
```

### 3. מודולים פונקציונליים (Feature Modules)

כל פיצ'ר הוא **תיקייה עצמאית** עם:
- **UI Components** - רק rendering
- **Custom Hook** - לוגיקה + state
- **Types/Constants** - הגדרות ספציפיות לפיצ'ר

#### דוגמה: `features/chat/useChat.js`

```javascript
import { useProjectStore } from '../../core/store';
import { getProvider } from '../../ai/provider';
import { buildContext } from '../../ai/context-builder';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pull only what's needed from store
  const { phases, contractors, budget, knowledgeBase } = useProjectStore();

  const send = async (text, attachments) => {
    setLoading(true);
    const ai = getProvider();
    const context = buildContext({ phases, contractors, budget, knowledgeBase });

    try {
      const response = await ai.chat({
        systemPrompt: buildSystemPrompt() + context,
        messages: messages.map(toAPIFormat),
        attachments,
      });

      // Handle gantt commands if present
      const { cleanText, commands } = parseGanttCommands(response.text);
      if (commands.length > 0) {
        applyAndSaveGanttChanges(commands);
      }

      setMessages(prev => [...prev,
        { role: 'user', text },
        { role: 'assistant', text: cleanText }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, send };
}
```

**מה השתנה?**
- מ-228 שורות `sendMessage` → ~40 שורות `send`
- Hook נפרד שאפשר לבדוק ולשתף
- AI provider abstracted - לא יודע אם זה Anthropic או Gemini

### 4. רכיבי UI משותפים

#### `ui/Overlay.jsx` - כבר קיים, רק צריך להוציא
#### `ui/Button.jsx`

```javascript
// במקום BTN function שמייצרת style objects:
const VARIANTS = {
  primary: { bg: '#2d8a6e', color: '#fff' },
  danger: { bg: '#fee2e2', color: '#dc2626' },
  ghost: { bg: '#f5f0eb', color: '#1a3a4a' },
};

export function Button({ variant = 'primary', children, ...props }) {
  const v = VARIANTS[variant];
  return (
    <button style={{
      background: v.bg, color: v.color,
      border: 'none', borderRadius: '10px',
      padding: '8px 16px', cursor: 'pointer',
      fontSize: '13px', fontWeight: 600,
    }} {...props}>
      {children}
    </button>
  );
}
```

---

## נתיב מיגרציה - צעד אחר צעד

### שלב 0: תשתית (1-2 ימים)
1. הוסף Vite כ-build tool (שומר על CDN fallback)
2. העבר ל-TypeScript (אפשר להתחיל עם `.jsx` ולשדרג בהדרגה)
3. הגדר `package.json` עם dependencies

### שלב 1: הוצא utilities (חצי יום)
- `utils/dates.js`, `utils/files.js`
- `ui/Overlay.jsx`
- **לא שובר כלום** - רק מעביר קוד קיים לקבצים נפרדים

### שלב 2: הוצא את שכבת ה-AI (1 יום)
- `ai/provider.js` + 3 adapters
- `ai/gantt-commands.js`
- `ai/system-prompt.js`
- **התיקון הכי משמעותי** - מבטל שכפול קוד

### שלב 3: בנה את ה-Store (1 יום)
- `core/store.js` עם Zustand
- מעבר מ-9 `useStorage` calls ל-store אחד
- **תקן הפניות** מ-name-based ל-ID-based
- כתוב migration function לנתונים קיימים:

```javascript
function migrateV3toV4(data) {
  // For each phase, find contractor by name and replace with ID
  const contractorMap = {};
  data.contractors.forEach(c => { contractorMap[c.name] = c.id; });

  data.phases = data.phases.map(p => ({
    ...p,
    contractorId: contractorMap[p.contractor] || null,
  }));

  // Same for budget.phase -> budget.phaseId, etc.
}
```

### שלב 4: פרק את ה-UI לפיצ'רים (2-3 ימים)
- פיצ'ר אחד בכל פעם
- התחל מהקטנים: KnowledgeBase, PunchList
- סיים בגדולים: Chat, Gantt

### שלב 5: Design System (1 יום)
- הוצא רכיבי UI משותפים
- החלף inline styles ב-CSS Modules או Tailwind

---

## סיכום: מה הארכיטקטורה הנוכחית עושה לא נכון

| בעיה | מצב נוכחי | מצב מוצע |
|-------|-----------|----------|
| **קובץ אחד** | 2,477 שורות, אי-אפשר לנהל | ~40 קבצים, כל אחד 50-150 שורות |
| **הפניות** | שם-מחרוזת (שברירי) | ID-based (חסין) |
| **מחיקה** | משאירה יתומים | cascade אוטומטי |
| **AI providers** | כתוב 6 פעמים | כתוב פעם אחת, 3 adapters |
| **בדיקות** | בלתי אפשרי | כל מודול בר-בדיקה |
| **שימוש חוזר** | הכל או כלום | כל מודול עצמאי |
| **State** | 27+ useState, prop drilling | Store מרכזי, zero drilling |
| **סגנונות** | inline בכל מקום | Design system מוגדר |

**השורה התחתונה**: הארכיטקטורה הנוכחית עובדת כ-MVP מצוין, אבל היא לא מתאימה לצמיחה. כ"אבני בניין למפתחים" - צריך לפרק את המונוליט ל-modules עם ממשקים ברורים, לתקן את שלמות הנתונים, ולהפשיט את שכבת ה-AI.
