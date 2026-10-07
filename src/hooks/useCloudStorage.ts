import { useState, useEffect, useCallback, useRef } from 'react';
import { AppData, PricingSettings, Expense, Receipt, Order } from '../types';

const JSONBIN_API_KEY = '$2a$10$PSTs2kF8qojKIJVnN.0.ounSBL6Lk8Z6kf0hNlu2v0cJtOGAjGgmG';
const JSONBIN_BIN_ID_KEY = 'bakery-jsonbin-id';
const DEFAULT_BIN_ID = '6ac6c4adac6210605a1dbe34';
// מראה מקומית: עותק אחרון של הנתונים ב-localStorage כרשת ביטחון
// (אם הענן לא זמין — למשל מכסה שנגמרה — האפליקציה עדיין תראה נתונים)
const LOCAL_MIRROR_KEY = 'bakery-data-mirror';

function writeMirror(d: AppData) {
  try { localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify(d)); } catch { /* storage full/blocked */ }
}
function readMirror(): AppData | null {
  try {
    const raw = localStorage.getItem(LOCAL_MIRROR_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch { return null; }
}

const defaultSettings: PricingSettings = {
  laborCostPerHour: 50,
  profitMarginPercent: 30,
  deliveryCost: 30,
  overheadPercent: 10,
};

const defaultData: AppData = {
  ingredients: [],
  recipes: [],
  packagings: [
    { id: '1', name: 'קופסה רגילה', cost: 5 },
    { id: '2', name: 'קופסה מהודרת', cost: 15 },
    { id: '3', name: 'שקית צלופן', cost: 2 },
  ],
  products: [],
  orders: [],
  settings: defaultSettings,
  expenses: [],
  receipts: [],
  receiptCounter: 1,
};

export function useCloudStorage() {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [binId, setBinId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastLocalUpdate = useRef<number>(0);

  useEffect(() => {
    const loadBin = async (id: string) => {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY },
      });
      if (!response.ok) return null;
      const result = await response.json();
      return result.record as AppData | null;
    };

    const initBin = async () => {
      const storedBinId = localStorage.getItem(JSONBIN_BIN_ID_KEY);
      let usedId = DEFAULT_BIN_ID;
      let record: AppData | null = null;

      if (storedBinId && storedBinId !== DEFAULT_BIN_ID) {
        try {
          const stored = await loadBin(storedBinId);
          const hasData = stored && (
            (stored.ingredients?.length ?? 0) > 0 ||
            (stored.recipes?.length ?? 0) > 0 ||
            (stored.products?.length ?? 0) > 0 ||
            (stored.orders?.length ?? 0) > 0
          );
          if (hasData) {
            record = stored;
            usedId = storedBinId;
          }
        } catch { /* fall through to default */ }
      }

      if (!record) {
        try {
          record = await loadBin(DEFAULT_BIN_ID);
          usedId = DEFAULT_BIN_ID;
        } catch (error) {
          console.error('Error loading default bin:', error);
        }
      }

      if (record) {
        const merged = {
          ...defaultData,
          ...record,
          settings: { ...defaultSettings, ...record?.settings },
        };
        setData(merged);
        writeMirror(merged); // שמירת עותק מקומי עדכני
      } else {
        // הענן לא נגיש (למשל מכסה שנגמרה) — נטען מהמראה המקומית אם קיימת
        const mirror = readMirror();
        if (mirror) {
          setData({ ...defaultData, ...mirror, settings: { ...defaultSettings, ...mirror.settings } });
          setSyncError('הענן אינו זמין כרגע — מוצגים נתונים מגיבוי מקומי');
        }
      }

      localStorage.setItem(JSONBIN_BIN_ID_KEY, usedId);
      setBinId(usedId);
      setIsLoaded(true);
    };

    initBin();
  }, []);

  // שמירה לענן
  const saveToCloud = useCallback(async (newData: AppData) => {
    if (!binId) {
      console.warn('No binId available, cannot save to cloud');
      setSyncError('לא מחובר לענן - השינויים לא נשמרו');
      return;
    }
    
    setIsSaving(true);
    setSyncError(null);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(newData),
      });
      
      if (response.ok) {
        setLastSaved(new Date());
        setSyncError(null);
      } else {
        console.error('Save failed:', response.status, response.statusText);
        setSyncError('שגיאה בשמירה לענן');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setSyncError('שגיאת רשת - השינויים לא נשמרו');
    }
    setIsSaving(false);
  }, [binId]);

  // עדכון נתונים
  const updateData = useCallback((newData: AppData) => {
    lastLocalUpdate.current = Date.now();
    setData(newData);
    writeMirror(newData); // עותק מקומי מיידי (עצמאי מהענן)
    saveToCloud(newData);
  }, [saveToCloud]);

  // פונקציות עדכון
  const updateIngredients = (ingredients: AppData['ingredients']) => {
    const newData = { ...data, ingredients };
    updateData(newData);
  };

  const updateRecipes = (recipes: AppData['recipes']) => {
    const newData = { ...data, recipes };
    updateData(newData);
  };

  const updatePackagings = (packagings: AppData['packagings']) => {
    const newData = { ...data, packagings };
    updateData(newData);
  };

  const updateSettings = (settings: PricingSettings) => {
    const newData = { ...data, settings };
    updateData(newData);
  };

  const updateProducts = (products: AppData['products']) => {
    const newData = { ...data, products };
    updateData(newData);
  };

  const updateOrders = (orders: AppData['orders']) => {
    const newData = { ...data, orders };
    updateData(newData);
  };

  const updateExpenses = (expenses: Expense[]) => {
    const newData = { ...data, expenses };
    updateData(newData);
  };

  const updateReceipts = (receipts: Receipt[]) => {
    const newData = { ...data, receipts };
    updateData(newData);
  };

  const updateSignature = (signature: string | undefined) => {
    const newData = { ...data, signature };
    updateData(newData);
  };

  // הפקת קבלה חדשה עם מספר סידורי רץ (מעדכן גם את המונה באותה שמירה)
  const addReceipt = (receipt: Omit<Receipt, 'number'>): Receipt => {
    const number = data.receiptCounter ?? 1;
    const full: Receipt = { ...receipt, number };
    const newData = {
      ...data,
      receipts: [full, ...(data.receipts || [])],
      receiptCounter: number + 1,
    };
    updateData(newData);
    return full;
  };

  // יצירת הזמנה — ובמידת הצורך גם קבלה מקושרת — בשמירה אטומית אחת
  // (למנוע דריסה בין שני עדכונים נפרדים באותו tick)
  const addOrder = (order: Order, receipt?: Omit<Receipt, 'number'>): Receipt | undefined => {
    let receipts = data.receipts || [];
    let counter = data.receiptCounter ?? 1;
    let created: Receipt | undefined;
    if (receipt) {
      created = { ...receipt, number: counter };
      receipts = [created, ...receipts];
      counter = counter + 1;
    }
    const newData: AppData = {
      ...data,
      orders: [order, ...(data.orders || [])],
      receipts,
      receiptCounter: counter,
    };
    updateData(newData);
    return created;
  };

  // מחיקת קבלה + מספור מחדש רציף (1..N) ועדכון המונה
  const deleteReceipt = (id: string) => {
    const remaining = (data.receipts || []).filter((r) => r.id !== id);
    const renumbered = [...remaining]
      .sort((a, b) => a.number - b.number)
      .map((r, i) => ({ ...r, number: i + 1 }));
    const newData: AppData = {
      ...data,
      receipts: renumbered,
      receiptCounter: renumbered.length + 1,
    };
    updateData(newData);
  };

  // רענון מהענן
  const refreshFromCloud = useCallback(async (silent = false) => {
    if (!binId) return;
    
    if (!silent) setIsSyncing(true);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        const newData = {
          ...defaultData,
          ...result.record,
          settings: { ...defaultSettings, ...result.record?.settings },
        };
        setData(newData);
        writeMirror(newData); // עדכון המראה המקומית
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
    if (!silent) setIsSyncing(false);
  }, [binId]);

  // סנכרון מונחה-אירועים (ללא polling מתמיד ששורף את מכסת הבקשות):
  // מרעננים מהענן רק כשחוזרים לטאב / כשהוא נעשה גלוי שוב.
  useEffect(() => {
    if (!binId || !isLoaded) return;

    const maybeRefresh = () => {
      // דילוג אם היה עדכון מקומי ב-5 השניות האחרונות (למנוע דריסה)
      if (Date.now() - lastLocalUpdate.current > 5000) refreshFromCloud(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') maybeRefresh();
    };

    window.addEventListener('focus', maybeRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', maybeRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [binId, isLoaded, refreshFromCloud]);

  // ייצוא וייבוא
  const exportData = () => {
    const exportObj = { ...data, binId };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bakery-pricing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as AppData & { binId?: string };
          
          // אם יש binId בקובץ, נשתמש בו
          if (imported.binId) {
            localStorage.setItem(JSONBIN_BIN_ID_KEY, imported.binId);
            setBinId(imported.binId);
          }
          
          const newData = {
            ...defaultData,
            ...imported,
            settings: { ...defaultSettings, ...imported.settings },
          };
          
          setData(newData);
          await saveToCloud(newData);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // קישור למכשיר אחר
  const getShareCode = () => binId;
  
  const connectWithCode = async (code: string) => {
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${code}/latest`, {
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        localStorage.setItem(JSONBIN_BIN_ID_KEY, code);
        setBinId(code);
        setData({
          ...defaultData,
          ...result.record,
          settings: { ...defaultSettings, ...result.record?.settings },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error connecting with code:', error);
      return false;
    }
  };

  return {
    data,
    isLoaded,
    isSaving,
    isSyncing,
    lastSaved,
    lastSynced,
    syncError,
    binId,
    updateIngredients,
    updateRecipes,
    updatePackagings,
    updateProducts,
    updateOrders,
    updateExpenses,
    updateReceipts,
    updateSignature,
    addReceipt,
    addOrder,
    deleteReceipt,
    updateSettings,
    exportData,
    importData,
    refreshFromCloud,
    getShareCode,
    connectWithCode,
  };
}
