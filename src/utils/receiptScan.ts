// סריקת קבלה: OCR על המכשיר (עברית+אנגלית) וחילוץ סכום/תאריך/ספק.
// התמונה משמשת לחילוץ בלבד ואינה נשמרת בענן — כדי לא לנפח את הסנכרון.

export interface ParsedReceipt {
  text: string;
  amount: string; // מחרוזת לשדה הטופס
  date: string; // YYYY-MM-DD או ''
  vendor: string;
}

// דחיסת תמונה לפני OCR — מאיצה ומשפרת זיהוי במובייל
function fileToCanvasDataUrl(file: File, maxWidth = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// חילוץ הסכום, התאריך והספק מהטקסט המזוהה
export function parseReceiptText(text: string): { amount: string; date: string; vendor: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // מילות מפתח של סכום סופי (סה"כ / לתשלום / total)
  const totalKw = /(סה["'`\s]*כ|סך[\s.]*הכל|לתשלום|לתשל|total|grand\s*total|סכום\s*כולל)/i;
  // שורות תשלום/עודף — לא הסכום הסופי (הסכום שנמסר/עודף עלול להטעות)
  const skipKw = /(עודף|change|מזומן|אשראי|ויזה|cash|כרטיס|תשלום\s*ב)/i;

  const candidates: { val: number; weight: number }[] = [];
  for (const line of lines) {
    const hasTotal = totalKw.test(line);
    // מדלגים על שורות תשלום/עודף — אלא אם הן גם שורת "סה\"כ"
    if (skipKw.test(line) && !hasTotal) continue;
    const nums = line.match(/\d+(?:[.,]\d{1,2})?/g) || [];
    for (const raw of nums) {
      const val = parseFloat(raw.replace(',', '.'));
      if (!isFinite(val) || val <= 0) continue;
      // התעלמות משנים (2020 וכו') ומספרים שלמים חשודים כתאריך/כמות
      const isInt = !/[.,]/.test(raw);
      if (isInt && val >= 1900 && val <= 2100) continue;
      candidates.push({ val, weight: hasTotal ? 1000 : 0 });
    }
  }

  let amount = '';
  if (candidates.length) {
    // עדיפות לשורות עם מילת-מפתח, ואז הסכום הגבוה ביותר (סה"כ הוא בד"כ הגדול)
    candidates.sort((a, b) => b.weight - a.weight || b.val - a.val);
    const best = candidates[0].val;
    amount = Number.isInteger(best) ? String(best) : best.toFixed(2);
  }

  // תאריך: dd/mm/yyyy · dd.mm.yy · dd-mm-yyyy
  let date = '';
  const dm = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (dm) {
    const d = dm[1].padStart(2, '0');
    const mo = dm[2].padStart(2, '0');
    let y = dm[3];
    if (y.length === 2) y = '20' + y;
    if (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31) date = `${y}-${mo}-${d}`;
  }

  // ספק: שורת הטקסט הראשונה עם אותיות (עברית או אנגלית) ובלי רצף ספרות ארוך
  let vendorLine = lines.find((l) => /[א-ת]{2,}/.test(l) && !/\d{4,}/.test(l));
  if (!vendorLine) vendorLine = lines.find((l) => /[A-Za-z]{3,}/.test(l) && !/\d{4,}/.test(l));
  const vendor = (vendorLine || '').replace(/\s+/g, ' ').slice(0, 40).trim();

  return { amount, date, vendor };
}

// סריקה מלאה: דחיסה → OCR → פרסור
export async function scanReceipt(
  file: File,
  onProgress?: (p: number) => void
): Promise<ParsedReceipt> {
  const dataUrl = await fileToCanvasDataUrl(file);
  // טעינה דינמית — כדי לא לנפח את חבילת הטעינה הראשונית.
  // עמיד לשתי צורות ה-interop (named / default) בין CJS ל-ESM.
  const mod: any = await import('tesseract.js');
  const recognize = mod.recognize || (mod.default && mod.default.recognize);
  const { data } = await recognize(dataUrl, 'heb+eng', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
    },
  });
  const text: string = data.text || '';
  return { text, ...parseReceiptText(text) };
}
