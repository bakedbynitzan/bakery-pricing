import { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, expenseCategoryLabels } from '../types';

interface Props {
  expenses: Expense[];
  onUpdate: (expenses: Expense[]) => void;
}

const categoryIcons: Record<ExpenseCategory, string> = {
  ingredients: '🥚',
  fixed: '🏠',
  equipment: '🔧',
  other: '📦',
};

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  category: 'ingredients' as ExpenseCategory,
  description: '',
  amount: '',
  supplier: '',
  note: '',
};

export function Expenses({ expenses, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterMonth, setFilterMonth] = useState('all');

  const resetForm = () => {
    setForm(emptyForm);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    const now = Date.now();
    const amount = parseFloat(form.amount) || 0;

    if (editingId) {
      onUpdate(
        expenses.map((ex) =>
          ex.id === editingId
            ? { ...ex, date: form.date, category: form.category, description: form.description, amount, supplier: form.supplier, note: form.note, updatedAt: now }
            : ex
        )
      );
    } else {
      const newExpense: Expense = {
        id: crypto.randomUUID(),
        date: form.date,
        category: form.category,
        description: form.description,
        amount,
        supplier: form.supplier,
        note: form.note,
        createdAt: now,
        updatedAt: now,
      };
      onUpdate([newExpense, ...expenses]);
    }
    resetForm();
  };

  const handleEdit = (ex: Expense) => {
    setForm({
      date: ex.date,
      category: ex.category,
      description: ex.description,
      amount: ex.amount.toString(),
      supplier: ex.supplier || '',
      note: ex.note || '',
    });
    setEditingId(ex.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את ההוצאה?')) {
      onUpdate(expenses.filter((ex) => ex.id !== id));
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses.forEach((ex) => months.add(ex.date.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [expenses]);

  const filtered = useMemo(() => {
    const list = filterMonth === 'all'
      ? expenses
      : expenses.filter((ex) => ex.date.substring(0, 7) === filterMonth);
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, filterMonth]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, ex) => s + ex.amount, 0);
    const byCategory: Record<string, number> = {};
    filtered.forEach((ex) => {
      byCategory[ex.category] = (byCategory[ex.category] || 0) + ex.amount;
    });
    return { total, byCategory };
  }, [filtered]);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>🧾 הוצאות</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + הוצאה חדשה
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingId ? 'עריכת הוצאה' : 'הוצאה חדשה'}</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>תאריך</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>קטגוריה</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                {Object.entries(expenseCategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{categoryIcons[value as ExpenseCategory]} {label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>תיאור</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="על מה ההוצאה..." required />
            </div>
            <div className="form-group">
              <label>סכום (₪)</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>ספק (אופציונלי)</label>
              <input type="text" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="שם הספק" />
            </div>
          </div>
          <div className="form-group">
            <label>הערה (אופציונלי)</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">{editingId ? 'עדכן' : 'הוסף הוצאה'}</button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">ביטול</button>
          </div>
        </form>
      )}

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>חודש</label>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">כל הזמנים</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">💸</span>
          <div className="stat-content">
            <span className="stat-value">₪{totals.total.toLocaleString()}</span>
            <span className="stat-label">סה"כ הוצאות {filterMonth !== 'all' ? '(מסונן)' : ''}</span>
          </div>
        </div>
        {(Object.keys(totals.byCategory) as ExpenseCategory[]).map((cat) => (
          <div className="stat-card" key={cat}>
            <span className="stat-icon">{categoryIcons[cat]}</span>
            <div className="stat-content">
              <span className="stat-value">₪{totals.byCategory[cat].toLocaleString()}</span>
              <span className="stat-label">{expenseCategoryLabels[cat]}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>אין הוצאות להצגה. הוסיפי הוצאה כדי לעקוב אחרי תזרים.</p>
        </div>
      ) : (
        <div className="expenses-list">
          {filtered.map((ex) => (
            <div key={ex.id} className="expense-card">
              <div className="expense-main">
                <span className="expense-icon">{categoryIcons[ex.category]}</span>
                <div className="expense-info">
                  <span className="expense-desc">{ex.description}</span>
                  <span className="expense-meta">
                    {new Date(ex.date).toLocaleDateString('he-IL')} · {expenseCategoryLabels[ex.category]}
                    {ex.supplier && ` · ${ex.supplier}`}
                  </span>
                </div>
              </div>
              <div className="expense-side">
                <span className="expense-amount">₪{ex.amount.toLocaleString()}</span>
                <div className="expense-actions">
                  <button onClick={() => handleEdit(ex)} className="btn-icon" title="ערוך">✏️</button>
                  <button onClick={() => handleDelete(ex.id)} className="btn-icon" title="מחק">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
