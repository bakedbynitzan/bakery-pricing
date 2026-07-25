import { Ingredient, RecipeIngredient, Unit } from '../types';

// כל יחידה מומרת ל"בסיס" בתוך קבוצתה.
// מסה ונפח מאוחדים לקבוצה אחת (massvol) בהנחת אפייה סטנדרטית: 1 גרם ≈ 1 מ"ל (צפיפות ≈ 1).
// זו בדיוק ההתנהגות שהייתה עד היום עבור המרות גרם↔מ"ל, רק שעכשיו היא מכוונת ומתועדת.
type UnitGroup = 'massvol' | 'count';

const UNIT_TO_BASE: Record<Unit, { group: UnitGroup; factor: number }> = {
  kg: { group: 'massvol', factor: 1000 },
  g: { group: 'massvol', factor: 1 },
  l: { group: 'massvol', factor: 1000 },
  ml: { group: 'massvol', factor: 1 },
  tbsp: { group: 'massvol', factor: 15 },
  tsp: { group: 'massvol', factor: 5 },
  cup: { group: 'massvol', factor: 240 },
  unit: { group: 'count', factor: 1 },
};

/**
 * ממיר כמות מיחידה אחת לאחרת.
 * מחזיר null כאשר ההמרה חסרת משמעות (למשל "יחידה" ↔ גרם) — כדי לא לחשב עלות שגויה בשקט.
 */
export function convertUnit(quantity: number, from: Unit, to: Unit): number | null {
  if (from === to) return quantity;
  const f = UNIT_TO_BASE[from];
  const t = UNIT_TO_BASE[to];
  if (!f || !t) return null;
  if (f.group !== t.group) return null; // המרה בין ספירה למסה/נפח אינה אפשרית
  return quantity * (f.factor / t.factor);
}

export interface IngredientCostResult {
  cost: number;
  valid: boolean; // false כאשר ההמרה בין היחידות אינה אפשרית
}

/**
 * מחשב את עלות חומר גלם בודד בתוך מתכון.
 * valid=false כאשר יחידת המתכון לא ניתנת להמרה ליחידת חומר הגלם.
 */
export function ingredientCost(
  recipeIng: RecipeIngredient,
  ingredientsList: Ingredient[]
): IngredientCostResult {
  const ingredient = ingredientsList.find((i) => i.id === recipeIng.ingredientId);
  if (!ingredient) return { cost: 0, valid: false };

  const convertedQty = convertUnit(recipeIng.quantity, recipeIng.unit, ingredient.unit);
  if (convertedQty === null) return { cost: 0, valid: false };

  return { cost: convertedQty * ingredient.pricePerUnit, valid: true };
}

/** עלות כוללת של רשימת חומרי גלם (מתעלמת מהמרות לא-תקינות, שמסומנות בנפרד ב-UI). */
export function ingredientsTotalCost(
  recipeIngredients: RecipeIngredient[],
  ingredientsList: Ingredient[]
): number {
  return recipeIngredients.reduce(
    (total, ing) => total + ingredientCost(ing, ingredientsList).cost,
    0
  );
}

/** האם יש במתכון לפחות המרת יחידות אחת שאינה תקינה. */
export function hasInvalidUnits(
  recipeIngredients: RecipeIngredient[],
  ingredientsList: Ingredient[]
): boolean {
  return recipeIngredients.some((ing) => !ingredientCost(ing, ingredientsList).valid);
}
