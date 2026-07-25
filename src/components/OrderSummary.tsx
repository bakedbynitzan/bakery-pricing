import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  text: string;
  onClose: () => void;
}

export function OrderSummary({ text, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // גיבוי לדפדפנים ישנים
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="summary-overlay" onClick={onClose}>
      <div className="summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="summary-header">
          <span className="summary-title">📱 סיכום הזמנה ללקוח</span>
          <button className="btn btn-secondary btn-small" onClick={onClose}>✕</button>
        </div>

        <p className="summary-hint">בדקי שהכל נכון, ואז העתקי ושלחי ללקוח בוואטסאפ.</p>

        <textarea className="summary-text" value={text} readOnly rows={14} />

        <div className="summary-actions">
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? '✓ הועתק!' : '📋 העתקה'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>סגירה</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
