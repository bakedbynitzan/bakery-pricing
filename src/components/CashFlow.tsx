import { useMemo, useState } from 'react';
import { Order, Expense, Product, Recipe, Ingredient } from '../types';
import { orderItemUnitCost } from '../utils/orders';

interface Props {
  orders: Order[];
  expenses: Expense[];
  products: Product[];
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export function CashFlow({ orders, expenses, products, recipes, ingredients }: Props) {
  const [range, setRange] = useState<'all' | '6m'>('all');

  const validOrders = useMemo(() => orders.filter((o) => o.status !== 'cancelled'), [orders]);

  // תזרים חודשי: הכנסות (מכירות) מול הוצאות (קניות בפועל)
  const monthly = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    validOrders.forEach((o) => {
      const m = o.date.substring(0, 7);
      const cur = map.get(m) || { income: 0, expense: 0 };
      cur.income += o.totalAmount;
      map.set(m, cur);
    });
    expenses.forEach((ex) => {
      const m = ex.date.substring(0, 7);
      const cur = map.get(m) || { income: 0, expense: 0 };
      cur.expense += ex.amount;
      map.set(m, cur);
    });
    let rows = Array.from(map.entries())
      .map(([month, v]) => ({ month, ...v, net: v.income - v.expense }))
      .sort((a, b) => (a.month < b.month ? 1 : -1));
    if (range === '6m') rows = rows.slice(0, 6);
    return rows;
  }, [validOrders, expenses, range]);

  const totals = useMemo(() => {
    const income = monthly.reduce((s, r) => s + r.income, 0);
    const expense = monthly.reduce((s, r) => s + r.expense, 0);
    return { income, expense, net: income - expense };
  }, [monthly]);

  // רווחיות מוצרים — מוצר מנצח לפי רווח (הכנסה פחות חומרי גלם)
  const productProfit = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; cost: number }>();
    validOrders.forEach((o) => {
      o.items.forEach((item) => {
        const key = item.productId === 'custom' ? `custom_${item.customName}` : item.productId;
        let name = 'לא ידוע';
        if (item.productId === 'custom' && item.customName) name = `${item.customName} (מותאם)`;
        else name = products.find((p) => p.id === item.productId)?.name || 'לא ידוע';
        const cur = map.get(key) || { name, qty: 0, revenue: 0, cost: 0 };
        cur.qty += item.quantity;
        cur.revenue += item.totalPrice;
        cur.cost += orderItemUnitCost(item, products, recipes, ingredients) * item.quantity;
        map.set(key, cur);
      });
    });
    return Array.from(map.values())
      .map((v) => ({ ...v, profit: v.revenue - v.cost, margin: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0 }))
      .sort((a, b) => b.profit - a.profit);
  }, [validOrders, products, recipes, ingredients]);

  const formatMonth = (m: string) => {
    const [y, mo] = m.split('-');
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('he-IL', { month: 'short', year: 'numeric' });
  };

  const maxNetAbs = Math.max(1, ...monthly.map((r) => Math.abs(r.net)));

  return (
    <div className="section">
      <div className="section-header">
        <h2>💵 תזרים ורווחיות</h2>
        <div className="filter-group">
          <select value={range} onChange={(e) => setRange(e.target.value as 'all' | '6m')}>
            <option value="all">כל הזמנים</option>
            <option value="6m">6 חודשים אחרונים</option>
          </select>
        </div>
      </div>

      {/* סיכום תזרים */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📥</span>
          <div className="stat-content">
            <span className="stat-value">₪{totals.income.toLocaleString()}</span>
            <span className="stat-label">נכנס (מכירות)</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📤</span>
          <div className="stat-content">
            <span className="stat-value">₪{totals.expense.toLocaleString()}</span>
            <span className="stat-label">יצא (הוצאות)</span>
          </div>
        </div>
        <div className={`stat-card ${totals.net >= 0 ? 'stat-positive' : 'stat-negative'}`}>
          <span className="stat-icon">{totals.net >= 0 ? '✅' : '⚠️'}</span>
          <div className="stat-content">
            <span className="stat-value">₪{totals.net.toLocaleString()}</span>
            <span className="stat-label">נטו בקופה</span>
          </div>
        </div>
      </div>

      {/* טבלת תזרים חודשי */}
      <div className="report-card full-width">
        <h3>📅 תזרים חודשי</h3>
        {monthly.length === 0 ? (
          <p className="no-data">אין נתונים עדיין</p>
        ) : (
          <div className="cashflow-table">
            {monthly.map((r) => (
              <div key={r.month} className="cashflow-row">
                <span className="cf-month">{formatMonth(r.month)}</span>
                <span className="cf-income">+₪{r.income.toLocaleString()}</span>
                <span className="cf-expense">−₪{r.expense.toLocaleString()}</span>
                <div className="cf-bar-wrap">
                  <div
                    className={`cf-bar ${r.net >= 0 ? 'positive' : 'negative'}`}
                    style={{ width: `${(Math.abs(r.net) / maxNetAbs) * 100}%` }}
                  />
                </div>
                <span className={`cf-net ${r.net >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  ₪{r.net.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="cashflow-note">
          💡 "נכנס" = סה"כ מכירות · "יצא" = הוצאות שרשמת בטאב הוצאות (כולל קניית חומרי גלם).
        </p>
      </div>

      {/* מוצר מנצח לפי רווח */}
      <div className="report-card full-width">
        <h3>🏆 מוצר מנצח (לפי רווח אחרי חומרי גלם)</h3>
        {productProfit.length === 0 ? (
          <p className="no-data">אין נתונים עדיין</p>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>מוצר</th>
                  <th>נמכרו</th>
                  <th>הכנסה</th>
                  <th>חומרי גלם</th>
                  <th>רווח</th>
                  <th>מרווח %</th>
                </tr>
              </thead>
              <tbody>
                {productProfit.map((p, i) => (
                  <tr key={i} className={i === 0 ? 'winner-row' : ''}>
                    <td>{i === 0 ? '👑' : i + 1}</td>
                    <td>{p.name}</td>
                    <td>{p.qty}</td>
                    <td>₪{p.revenue.toLocaleString()}</td>
                    <td>₪{p.cost.toFixed(0)}</td>
                    <td className={p.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                      <strong>₪{p.profit.toFixed(0)}</strong>
                    </td>
                    <td>{p.margin.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
