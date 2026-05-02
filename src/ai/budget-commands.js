import { uid } from '../utils/dates.js';

/**
 * Parse BUDGET commands from AI response text.
 * Returns { cleanText, budgetCmds } where cleanText has commands stripped.
 */
export function parseBudgetCommands(aText) {
  const budgetCmds = [];
  const budgetRegex = /\[BUDGET:(ADD|UPDATE|DELETE)\|(.+?)\]/g;
  let bMatch;
  while ((bMatch = budgetRegex.exec(aText)) !== null) {
    budgetCmds.push({ action: bMatch[1], params: bMatch[2].split("|").map((s) => s.trim()) });
  }
  const cleanText = budgetCmds.length > 0 ? aText.replace(/\n?\[BUDGET:[^\]]+\]/g, "").trim() : aText;
  return { cleanText, budgetCmds };
}

const toNum = (v) => {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

/**
 * Apply parsed BUDGET commands to a budget array.
 * Pure function - returns new budget array.
 *
 * Commands:
 *   ADD    | category | planned | actual? | phase? | notes?
 *   UPDATE | category | field=value | field=value | ...
 *     fields: category, planned, actual, phase, notes
 *   DELETE | category
 *
 * Matching for UPDATE/DELETE is by case-insensitive substring on category.
 */
export function applyBudgetCommandsToBudget(commands, budget) {
  let updated = [...budget];
  commands.forEach((cmd) => {
    const [p0, p1, p2, p3, p4] = cmd.params;
    if (cmd.action === "ADD") {
      updated.push({
        id: uid(),
        category: p0 || "סעיף חדש",
        planned: toNum(p1),
        actual: toNum(p2),
        phase: p3 || "",
        notes: p4 || "",
      });
    } else if (cmd.action === "DELETE") {
      const needle = (p0 || "").toLowerCase();
      updated = updated.filter((b) => !(b.category || "").toLowerCase().includes(needle));
    } else if (cmd.action === "UPDATE") {
      const needle = (p0 || "").toLowerCase();
      const fields = cmd.params.slice(1);
      updated = updated.map((b) => {
        if (!(b.category || "").toLowerCase().includes(needle)) return b;
        const copy = { ...b };
        fields.forEach((f) => {
          const eq = f.indexOf("=");
          if (eq < 0) return;
          const key = f.slice(0, eq).trim();
          const val = f.slice(eq + 1).trim();
          if (key === "planned" || key === "actual") copy[key] = toNum(val);
          else if (key === "category" || key === "phase" || key === "notes") copy[key] = val;
        });
        return copy;
      });
    }
  });
  return updated;
}
