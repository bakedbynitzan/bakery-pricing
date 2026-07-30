// סריקת קבלה: OCR על המכשיר (עברית+אנגלית) וחילוץ סכום/תאריך/ספק.
// התמונה משמשת לחילוץ בלבד ואינה נשמרת בענן — כדי לא לנפח את הסנכרון.

export interface ParsedReceipt {
  text: string;
  amount: string; // מחרוזת לשדה הטופס
  date: string; // YYYY-MM-DD או ''
  vendor: string;
}

export type ExpenseCat = 'ingredients' | 'fixed' | 'equipment' | 'other';

export interface GeminiItem {
  name: string;
  quantity?: number;
  total: number;
}

export interface GeminiReceipt {
  amount: string;
  date: string;
  vendor: string;
  description: string;
  category: ExpenseCat | '';
  items: GeminiItem[];
}

// המרת קובץ תמונה ל-base64 (עם הקטנה) עבור שליחה ל-AI
function fileToBase64(file: File, maxWidth = 1600, quality = 0.85): Promise<{ base64: string; mime: string }> {
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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mime: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// סריקת קבלה באמצעות Google Gemini (דיוק גבוה, כולל עברית)
// רשימת מודלים לניסיון לפי סדר — עמידות לשינויי זמינות/מכסה
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];

export async function scanReceiptGemini(file: File, apiKey: string): Promise<GeminiReceipt> {
  const { base64, mime } = await fileToBase64(file);

  const prompt = [
    'אתה קורא קבלות/חשבוניות בעברית מישראל.',
    'חלץ מהתמונה את הפרטים הבאים והחזר JSON בלבד:',
    '- amount: הסכום הסופי ששולם (השורה "לתשלום" / "סה\\"כ"), כמספר בלבד ללא סימן מטבע.',
    '- date: תאריך הקנייה בפורמט YYYY-MM-DD.',
    '- vendor: שם העסק/החנות.',
    '- description: תיאור קצר (שם העסק או הפריטים העיקריים).',
    '- category: אחת מהערכים: ingredients (חומרי גלם/מכולת/אפייה), fixed (הוצאות קבועות), equipment (ציוד/כלים), other.',
    '- items: מערך שורות הפריטים בקבלה. כל פריט: { "name": שם הפריט, "quantity": כמות (מספר, אם קיים), "total": סכום השורה (מספר) }.',
    '  כלול רק שורות פריט אמיתיות — אל תכלול שורות הנחה/מבצע, מע"מ, או סיכומים.',
    'אם שדה לא ברור, החזר מחרוזת ריקה (או מערך ריק). אל תמציא ערכים.',
  ].join('\n');

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mime, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };

  // ניסיון לפי סדר המודלים; אם אחד נכשל במכסה/זמינות (404/429) — עוברים לבא
  let json: any = null;
  let lastErr: Error | null = null;
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      json = await res.json();
      break;
    }
    const errText = await res.text().catch(() => '');
    if (res.status === 400 && /API key not valid/i.test(errText)) throw new Error('INVALID_KEY');
    if (res.status === 403) throw new Error('FORBIDDEN');
    // 404 (מודל לא זמין) או 429 (מכסה) — ננסה את המודל הבא
    lastErr = new Error(res.status === 429 ? 'QUOTA' : `HTTP ${res.status}`);
  }
  if (!json) throw lastErr || new Error('HTTP 500');

  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // לפעמים המודל עוטף ב-```json ... ``` — ננקה ונְנַסה שוב
    const m = text.match(/\{[\s\S]*\}/);
    if (m) parsed = JSON.parse(m[0]);
  }

  const amountNum = typeof parsed.amount === 'number'
    ? parsed.amount
    : parseFloat(String(parsed.amount ?? '').replace(/[^\d.]/g, ''));
  const validCats: ExpenseCat[] = ['ingredients', 'fixed', 'equipment', 'other'];
  const category = validCats.includes(parsed.category) ? parsed.category : '';

  const items: GeminiItem[] = Array.isArray(parsed.items)
    ? parsed.items
        .map((it: any) => {
          const total = typeof it?.total === 'number' ? it.total : parseFloat(String(it?.total ?? '').replace(/[^\d.]/g, ''));
          const qtyRaw = it?.quantity;
          const quantity = typeof qtyRaw === 'number' ? qtyRaw : parseFloat(String(qtyRaw ?? '').replace(/[^\d.]/g, ''));
          return {
            name: (it?.name || '').toString().slice(0, 60).trim(),
            quantity: isFinite(quantity) && quantity > 0 ? quantity : undefined,
            total: isFinite(total) ? total : 0,
          } as GeminiItem;
        })
        .filter((it: GeminiItem) => it.name)
        .slice(0, 100)
    : [];

  return {
    amount: isFinite(amountNum) && amountNum > 0 ? String(amountNum) : '',
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : '',
    vendor: (parsed.vendor || '').toString().slice(0, 60),
    description: (parsed.description || parsed.vendor || '').toString().slice(0, 80),
    category,
    items,
  };
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
