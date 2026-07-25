// טיפוסים לאפליקציית תמחור קונדיטוריה

export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unit' | 'tsp' | 'tbsp' | 'cup';

export interface Ingredient {
  id: string;
  name: string;
  pricePerUnit: number; // מחיר לפי יחידת מידה (מחושב)
  packagePrice: number; // מחיר האריזה המקורי
  packageQuantity: number; // כמות באריזה
  unit: Unit;
  supplier?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: Unit;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'cake' | 'cookie' | 'dessert' | 'bread' | 'other';
  ingredients: RecipeIngredient[];
  yield: number; // כמות יחידות שיוצאות מהמתכון
  yieldUnit: string; // לדוגמה: "יחידות", "פרוסות", "עוגות"
  laborMinutes: number; // זמן עבודה בדקות
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Packaging {
  id: string;
  name: string;
  cost: number;
  notes?: string;
}

export interface PricingSettings {
  laborCostPerHour: number; // עלות שעת עבודה
  profitMarginPercent: number; // אחוז רווח רצוי
  deliveryCost: number; // עלות משלוח ברירת מחדל
  overheadPercent: number; // אחוז הוצאות כלליות (חשמל, גז וכו')
}

export interface PricingResult {
  ingredientsCost: number;
  laborCost: number;
  overheadCost: number;
  packagingCost: number;
  totalCost: number;
  suggestedPrice: number;
  grossProfit: number;
  grossProfitPercent: number;
  netProfit: number;
  netProfitPercent: number;
}

// רכיב במארז (מתכון + כמות יחידות)
export interface ProductComponent {
  recipeId: string;
  quantity: number; // כמה יחידות מהמתכון
}

// מארז למכירה
export interface Product {
  id: string;
  name: string;
  description?: string;
  components?: ProductComponent[]; // רכיבים מבוססי מתכונים
  ingredientsCost?: number; // עלות חומרי גלם (מחושב)
  profitPercent?: number; // אחוז רווח רצוי
  sellingPrice: number; // מחיר מכירה ללקוח
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// פריט בהזמנה
export interface OrderItem {
  productId: string;
  customName?: string; // שם מותאם כאשר productId === 'custom'
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  costPerUnit?: number; // צילום עלות חומרי הגלם ליחידה בזמן ההזמנה (שלב א׳)
}

// הזמנה
export interface Order {
  id: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  customerPhone?: string;
  items: OrderItem[];
  packagingCost: number;
  deliveryCost: number;
  discount: number;
  totalAmount: number;
  totalCost?: number; // צילום COGS: עלות חומרי גלם + אריזה בזמן ההזמנה (שלב א׳)
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// הוצאה (שלב ב׳)
export type ExpenseCategory = 'ingredients' | 'fixed' | 'equipment' | 'other';

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  ingredients: 'חומרי גלם',
  fixed: 'הוצאות קבועות',
  equipment: 'ציוד',
  other: 'אחר',
};

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
  supplier?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

// קבלה - עוסק פטור (שלב ד׳)
export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Receipt {
  id: string;
  number: number; // מספר סידורי רץ (דרישת חוק)
  orderId?: string; // קישור להזמנה אם הופקה ממנה
  date: string; // תאריך הפקה YYYY-MM-DD
  customerName: string;
  customerPhone?: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: string;
  note?: string;
  createdAt: number;
}

// סטטוסים בעברית
export const orderStatusLabels: Record<Order['status'], string> = {
  pending: 'ממתין',
  preparing: 'בהכנה',
  ready: 'מוכן',
  delivered: 'נמסר',
  cancelled: 'בוטל',
};

export interface AppData {
  ingredients: Ingredient[];
  recipes: Recipe[];
  packagings: Packaging[];
  products: Product[];
  orders: Order[];
  settings: PricingSettings;
  expenses?: Expense[]; // שלב ב׳ (אופציונלי לתאימות-לאחור)
  receipts?: Receipt[]; // שלב ד׳
  receiptCounter?: number; // המספר הרץ הבא לקבלה
  signature?: string; // תמונת חתימה (data URL) שמופיעה בכל קבלה
}

// יחידות מידה בעברית
export const unitLabels: Record<Unit, string> = {
  kg: 'ק"ג',
  g: 'גרם',
  l: 'ליטר',
  ml: 'מ"ל',
  unit: 'יחידה',
  tsp: 'כפית',
  tbsp: 'כף',
  cup: 'כוס',
};

// המרות בין יחידות
export const unitConversions: Record<string, number> = {
  'kg_to_g': 1000,
  'g_to_kg': 0.001,
  'l_to_ml': 1000,
  'ml_to_l': 0.001,
  'tbsp_to_ml': 15,
  'tsp_to_ml': 5,
  'cup_to_ml': 240,
};

// קטגוריות בעברית
export const categoryLabels: Record<Recipe['category'], string> = {
  cake: 'עוגות',
  cookie: 'עוגיות',
  dessert: 'קינוחים',
  bread: 'לחמים',
  other: 'אחר',
};
