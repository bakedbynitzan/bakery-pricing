// היסטוריית מחירים והתראות — מחושבת מתוך שורות הפריטים של ההוצאות השמורות.
import { Expense, Unit } from '../types';

export function normName(s: string): string {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// מחיר ליחידה משורת פריט (סכום חלקי כמות; אם אין כמות — הסכום עצמו)
export function unitPriceOf(total: number, quantity?: number): number {
  return quantity && quantity > 0 ? total / quantity : total;
}

export interface LastPrice {
  price: number;
  date: string;
}

// המחיר האחרון שידוע לפריט לפי שם (לא כולל הוצאה מסוימת, למשל בעריכה)
export function lastKnownPrice(
  expenses: Expense[],
  name: string,
  excludeExpenseId?: string
): LastPrice | null {
  const key = normName(name);
  let best: LastPrice | null = null;
  for (const ex of expenses) {
    if (excludeExpenseId && ex.id === excludeExpenseId) continue;
    if (!ex.items) continue;
    for (const it of ex.items) {
      if (normName(it.name) !== key) continue;
      const up = unitPriceOf(it.total, it.quantity);
      if (!isFinite(up) || up <= 0) continue;
      if (!best || ex.date > best.date) best = { price: up, date: ex.date };
    }
  }
  return best;
}

export type PriceDir = 'up' | 'down' | 'same';

export interface PriceChange {
  prev: number;
  prevDate: string;
  current: number;
  pct: number; // אחוז שינוי (חיובי=התייקר)
  dir: PriceDir;
}

// השוואת מחיר נוכחי למחיר האחרון הידוע
export function comparePrice(
  expenses: Expense[],
  name: string,
  currentUnitPrice: number,
  excludeExpenseId?: string
): PriceChange | null {
  const last = lastKnownPrice(expenses, name, excludeExpenseId);
  if (!last || last.price <= 0 || !isFinite(currentUnitPrice) || currentUnitPrice <= 0) return null;
  const pct = ((currentUnitPrice - last.price) / last.price) * 100;
  const dir: PriceDir = Math.abs(pct) < 0.5 ? 'same' : pct > 0 ? 'up' : 'down';
  return { prev: last.price, prevDate: last.date, current: currentUnitPrice, pct, dir };
}

// ניחוש יחידת מידה משם הפריט (לצורך יצירת חומר גלם)
export function guessUnit(name: string): Unit {
  const n = name || '';
  if (/ק["'`]?\s?ג|קילו|kg/i.test(n)) return 'kg';
  if (/מ["'`]?\s?ל|ml/i.test(n)) return 'ml';
  if (/ליטר|\bl\b/i.test(n)) return 'l';
  if (/גרם|גר['`]|\bg\b/i.test(n)) return 'g';
  return 'unit';
}
