export const formatDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "");
export const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
export const todayStr = () => new Date().toISOString().split("T")[0];
export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));
export const uid = () => Math.random().toString(36).slice(2, 9);
