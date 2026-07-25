import { Receipt } from '../types';
import { BUSINESS_INFO } from '../config/business';

interface Props {
  receipt: Receipt;
  onClose: () => void;
}

const pad = (n: number) => n.toString().padStart(4, '0');

export function ReceiptDocument({ receipt, onClose }: Props) {
  return (
    <div className="receipt-overlay no-print" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-toolbar no-print">
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ הדפסה / שמירה כ-PDF</button>
          <button className="btn btn-secondary" onClick={onClose}>סגירה</button>
        </div>

        <div className="receipt-print" id="receipt-print">
          <div className="receipt-header">
            <div className="receipt-business">
              <h2>{BUSINESS_INFO.businessName}</h2>
              <p>{BUSINESS_INFO.ownerName}</p>
              <p>{BUSINESS_INFO.businessType} · ע.מ {BUSINESS_INFO.taxId}</p>
              {BUSINESS_INFO.address && <p>{BUSINESS_INFO.address}</p>}
              {BUSINESS_INFO.phone && <p>טל׳ {BUSINESS_INFO.phone}</p>}
            </div>
            <div className="receipt-title">
              <h1>קבלה</h1>
              <p className="receipt-number">מס׳ {pad(receipt.number)}</p>
              <p className="receipt-date">{new Date(receipt.date).toLocaleDateString('he-IL')}</p>
            </div>
          </div>

          <div className="receipt-customer">
            <span>התקבל מ: <strong>{receipt.customerName}</strong></span>
            {receipt.customerPhone && <span>טלפון: {receipt.customerPhone}</span>}
          </div>

          <table className="receipt-items">
            <thead>
              <tr>
                <th>תיאור</th>
                <th>כמות</th>
                <th>מחיר יח׳</th>
                <th>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>₪{item.unitPrice.toFixed(2)}</td>
                  <td>₪{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="receipt-total-label">סה״כ שולם</td>
                <td className="receipt-total-value">₪{receipt.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {receipt.paymentMethod && (
            <p className="receipt-payment">אמצעי תשלום: {receipt.paymentMethod}</p>
          )}
          {receipt.note && <p className="receipt-note">{receipt.note}</p>}

          <div className="receipt-legal">
            <p><strong>עוסק פטור</strong> — לא נגבה מע״מ.</p>
          </div>

          <div className="receipt-signature">
            <span>חתימה: ____________________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
