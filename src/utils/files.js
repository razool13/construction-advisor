export async function extractPdfText(ab) {
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

export const toB64 = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result.split(",")[1]); x.onerror = e; x.readAsDataURL(f); });
export const toAB = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = e; x.readAsArrayBuffer(f); });
export const toTxt = f => new Promise((r, e) => { const x = new FileReader(); x.onload = () => r(x.result); x.onerror = e; x.readAsText(f); });
