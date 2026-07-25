import { createPortal } from 'react-dom';
import { Receipt } from '../types';
import { BUSINESS_INFO } from '../config/business';

interface Props {
  receipt: Receipt;
  signature?: string;
  isDraft?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

const pad = (n: number) => n.toString().padStart(4, '0');

// חתימת ברירת מחדל (מגובה עם האפליקציה). אפשר להחליף בהגדרות.
const DEFAULT_SIGNATURE = import.meta.env.BASE_URL + 'signature.png';

export function ReceiptDocument({ receipt, signature, isDraft, onConfirm, onClose }: Props) {
  const sig = signature || DEFAULT_SIGNATURE;
  const handlePrint = () => {
    // שם קובץ ה-PDF = שם העסק בלבד (הלקוח לא מתעניין במספר הקבלה)
    const prevTitle = document.title;
    document.title = BUSINESS_INFO.businessName;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  return createPortal(
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receipt-toolbar no-print">
          {isDraft ? (
            <>
              <span className="receipt-preview-title">👁️ תצוגה מקדימה (טיוטה) — בדקי שכל הפריטים נכונים</span>
              <div className="receipt-toolbar-actions">
                <button className="btn btn-primary" onClick={onConfirm}>✓ צור קבלה</button>
                <button className="btn btn-secondary" onClick={onClose}>↩️ חזרה לעריכה</button>
              </div>
            </>
          ) : (
            <>
              <span className="receipt-preview-title">👁️ תצוגה מקדימה — בדקי שהכל תקין לפני שליחה</span>
              <div className="receipt-toolbar-actions">
                <button className="btn btn-primary" onClick={handlePrint}>🖨️ הדפסה / שמירה כ-PDF</button>
                <button className="btn btn-secondary" onClick={onClose}>סגירה</button>
              </div>
            </>
          )}
        </div>

        <div className="receipt-print" id="receipt-print">
          <div className="receipt-header">
            <div className="receipt-business">
              <h2>{BUSINESS_INFO.businessName}</h2>
              <p>{BUSINESS_INFO.ownerName}</p>
              <p>{BUSINESS_INFO.businessType} · ע.מ {BUSINESS_INFO.taxId}</p>
              {BUSINESS_INFO.phone && <p>טל׳ {BUSINESS_INFO.phone}</p>}
            </div>
            <div className="receipt-title">
              <h1>קבלה</h1>
              <p className="receipt-number">מס׳ {pad(receipt.number)}</p>
              <p className="receipt-date">{new Date(receipt.date).toLocaleDateString('he-IL')}</p>
            </div>
          </div>

          <div className="receipt-customer">
            <span>לכבוד: <strong>{receipt.customerName || '______________'}</strong></span>
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
            <span className="receipt-signature-label">חתימה:</span>
            <img src={sig} alt="חתימה" className="receipt-signature-img" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
