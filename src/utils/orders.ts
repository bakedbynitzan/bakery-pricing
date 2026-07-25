import { Ingredient, Order, OrderItem, Product, Recipe } from '../types';
import { ingredientsTotalCost } from './units';

/** עלות חומרי הגלם ליחידת מארז (לפי המתכונים והמחירים הנוכחיים). */
export function productMaterialCost(
  product: Product,
  recipes: Recipe[],
  ingredients: Ingredient[]
): number {
  if (!product.components || product.components.length === 0) {
    return product.ingredientsCost || 0;
  }
  return product.components.reduce((total, comp) => {
    const recipe = recipes.find((r) => r.id === comp.recipeId);
    if (!recipe) return total;
    const perUnit = recipe.yield
      ? ingredientsTotalCost(recipe.ingredients, ingredients) / recipe.yield
      : 0;
    return total + perUnit * comp.quantity;
  }, 0);
}

export interface CatalogPricing {
  cost: number; // עלות חומרי הגלם של הפריט
  hasCost: boolean; // האם הוזנה עלות (קשרי מוצרים או עלות ידנית)
  netProfit: number | null; // רווח נקי בשקלים (null כשלא הוזנה עלות)
  profitPercent: number | null; // אחוז רווח (null כשלא הוזנה עלות)
}

/**
 * מחשב את תמחור פריט בקטלוג (עלות, רווח נקי ואחוז רווח).
 * כאשר לא הוזנה עלות חומרים (cost = 0) — הרווח לא מוגדר (null),
 * כדי לא להציג "רווח" מטעה השווה למחיר המלא.
 */
export function catalogItemPricing(
  product: Product,
  recipes: Recipe[],
  ingredients: Ingredient[]
): CatalogPricing {
  const cost = productMaterialCost(product, recipes, ingredients);
  const hasCost = cost > 0;
  return {
    cost,
    hasCost,
    netProfit: hasCost ? product.sellingPrice - cost : null,
    profitPercent: hasCost ? ((product.sellingPrice - cost) / cost) * 100 : null,
  };
}

/**
 * עלות חומרי גלם ליחידה של פריט בהזמנה.
 * מעדיף את צילום העלות ששמור בהזמנה; אחרת מחשב מהמארז הנוכחי (הערכה).
 */
export function orderItemUnitCost(
  item: OrderItem,
  products: Product[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): number {
  if (typeof item.costPerUnit === 'number') return item.costPerUnit;
  if (item.productId === 'custom') return 0; // פריט מותאם — אין עלות ידועה
  const product = products.find((p) => p.id === item.productId);
  return product ? productMaterialCost(product, recipes, ingredients) : 0;
}

export interface OrderProfit {
  revenue: number; // סה"כ שהלקוח משלם (כולל אריזה/משלוח, פחות הנחה)
  itemsRevenue: number; // הכנסה מהמוצרים בלבד
  materialCost: number; // עלות חומרי הגלם (COGS)
  profit: number; // רווח אחרי חומרי גלם (אריזה ומשלוח = פס-דרך)
  profitPercent: number | null; // אחוז רווח מתוך הכנסת המוצרים
  hasSnapshot: boolean; // האם העלות מבוססת על צילום שמור (true) או הערכה נוכחית (false)
}

/** מחשב רווח להזמנה: מחיר לפני חומרי גלם מול אחרי. */
export function orderProfit(
  order: Order,
  products: Product[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): OrderProfit {
  const itemsRevenue = order.items.reduce((s, i) => s + i.totalPrice, 0);

  let materialCost: number;
  let hasSnapshot: boolean;
  if (typeof order.totalCost === 'number') {
    materialCost = order.totalCost;
    hasSnapshot = true;
  } else {
    materialCost = order.items.reduce(
      (s, i) => s + orderItemUnitCost(i, products, recipes, ingredients) * i.quantity,
      0
    );
    hasSnapshot = order.items.every((i) => typeof i.costPerUnit === 'number');
  }

  // אריזה ומשלוח נחשבים פס-דרך (נגבים ומשולמים). רווח = הכנסת מוצרים − הנחה − חומרי גלם.
  const profit = itemsRevenue - (order.discount || 0) - materialCost;
  const profitPercent = itemsRevenue > 0 ? (profit / itemsRevenue) * 100 : null;

  return {
    revenue: order.totalAmount,
    itemsRevenue,
    materialCost,
    profit,
    profitPercent,
    hasSnapshot,
  };
}
