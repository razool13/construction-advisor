import { uid } from '../utils/dates.js';

/**
 * Parse GANTT commands from AI response text.
 * Returns { cleanText, ganttCmds } where cleanText has commands stripped.
 */
export function parseGanttCommands(aText) {
  const ganttCmds = [];
  const ganttRegex = /\[GANTT:(ADD|UPDATE|DELETE|MOVE|REORDER)\|(.+?)\]/g;
  let gMatch;
  while ((gMatch = ganttRegex.exec(aText)) !== null) {
    ganttCmds.push({ action: gMatch[1], params: gMatch[2].split("|").map((s) => s.trim()) });
  }
  const cleanText = ganttCmds.length > 0 ? aText.replace(/\n?\[GANTT:[^\]]+\]/g, "").trim() : aText;
  return { cleanText, ganttCmds };
}

/**
 * Apply parsed GANTT commands to a phases array.
 * Pure function - returns new phases array.
 */
export function applyGanttCommandsToPhases(commands, phases) {
  let updated = [...phases];
  commands.forEach((cmd) => {
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
      updated.forEach((ph) => { if (!reordered.find((r) => r.id === ph.id)) reordered.push(ph); });
      updated = reordered;
    }
  });
  return updated;
}
