import { useState } from 'react';
import { Receipt, ReceiptItem } from '../types';
import { ReceiptDocument } from './ReceiptDocument';

interface Props {
  receipts: Receipt[];
  addReceipt: (r: Omit<Receipt, 'number'>) => Receipt;
}

const pad = (n: number) => n.toString().padStart(4, '0');

const emptyRow = { description: '', quantity: '1', unitPrice: '' };

export function Receipts({ receipts, addReceipt }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    paymentMethod: 'מזומן',
    note: '',
  });
  const [rows, setRows] = useState([{ ...emptyRow }]);

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], customerName: '', customerPhone: '', paymentMethod: 'מזומן', note: '' });
    setRows([{ ...emptyRow }]);
    setIsAdding(false);
  };

  const total = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items: ReceiptItem[] = rows
      .filter((r) => r.description && r.unitPrice)
      .map((r) => {
        const quantity = parseFloat(r.quantity) || 1;
        const unitPrice = parseFloat(r.unitPrice) || 0;
        return { description: r.description, quantity, unitPrice, total: quantity * unitPrice };
      });
    if (!form.customerName || items.length === 0) return;

    const receipt = addReceipt({
      id: crypto.randomUUID(),
      date: form.date,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      items,
      total: items.reduce((s, i) => s + i.total, 0),
      paymentMethod: form.paymentMethod,
      note: form.note,
      createdAt: Date.now(),
    });
    resetForm();
    setViewing(receipt);
  };

  const sorted = [...receipts].sort((a, b) => b.number - a.number);

  return (
    <div className="section">
      <div className="section-header">
        <h2>🧾 קבלות</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">+ קבלה חדשה</button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>קבלה חדשה</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>תאריך</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>שם הלקוח</label>
              <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="התקבל מ..." required />
            </div>
            <div className="form-group">
              <label>טלפון (אופציונלי)</label>
              <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>אמצעי תשלום</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="מזומן">מזומן</option>
                <option value="ביט">ביט</option>
                <option value="העברה בנקאית">העברה בנקאית</option>
                <option value="אשראי">אשראי</option>
                <option value="צ׳ק">צ׳ק</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h4>פריטים</h4>
            {rows.map((row, i) => (
              <div className="receipt-item-row" key={i}>
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)))}
                  placeholder="תיאור"
                />
                <input
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))}
                  placeholder="כמות"
                  style={{ width: '80px' }}
                />
                <input
                  type="number"
                  step="0.01"
                  value={row.unitPrice}
                  onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, unitPrice: e.target.value } : r)))}
                  placeholder="מחיר יח׳"
                  style={{ width: '110px' }}
                />
                <span className="row-total">₪{((parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0)).toFixed(2)}</span>
                {rows.length > 1 && (
                  <button type="button" className="btn-icon" onClick={() => setRows(rows.filter((_, j) => j !== i))}>❌</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-small" onClick={() => setRows([...rows, { ...emptyRow }])}>+ שורה</button>
          </div>

          <div className="form-group">
            <label>הערה (אופציונלי)</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
          </div>

          <div className="order-total">
            <div className="order-total-line"><span>סה"כ:</span><strong>₪{total.toFixed(2)}</strong></div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">צור והדפס קבלה</button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">ביטול</button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <div className="empty-state">
          <p>עדיין לא הופקו קבלות.</p>
          <p>אפשר להפיק קבלה גם ישירות מהזמנה (כפתור 🧾 בטאב הזמנות).</p>
        </div>
      ) : (
        <div className="report-card full-width">
          <h3>רישום קבלות ({sorted.length})</h3>
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>מס׳</th>
                  <th>תאריך</th>
                  <th>לקוח</th>
                  <th>סכום</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id}>
                    <td>{pad(r.number)}</td>
                    <td>{new Date(r.date).toLocaleDateString('he-IL')}</td>
                    <td>{r.customerName}</td>
                    <td>₪{r.total.toFixed(2)}</td>
                    <td>
                      <button className="btn btn-small" onClick={() => setViewing(r)}>👁️ הצג</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewing && <ReceiptDocument receipt={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
