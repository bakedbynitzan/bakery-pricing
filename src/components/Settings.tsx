import { useState } from 'react';
import { PricingSettings, Packaging } from '../types';

interface Props {
  settings: PricingSettings;
  packagings: Packaging[];
  signature?: string;
  onUpdateSignature: (signature: string | undefined) => void;
  onUpdateSettings: (settings: PricingSettings) => void;
  onUpdatePackagings: (packagings: Packaging[]) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  shareCode?: string | null;
  onConnectWithCode?: (code: string) => Promise<boolean>;
}

const DEFAULT_SIGNATURE = import.meta.env.BASE_URL + 'signature.png';

export function Settings({
  settings,
  packagings,
  signature,
  onUpdateSignature,
  onUpdateSettings,
  onUpdatePackagings,
  onExport,
  onImport,
  shareCode,
  onConnectWithCode,
}: Props) {
  const [form, setForm] = useState(settings);
  const [newPackaging, setNewPackaging] = useState({ name: '', cost: '' });
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [connectCode, setConnectCode] = useState('');
  const [connectStatus, setConnectStatus] = useState<string | null>(null);

  const handleSettingsSave = () => {
    onUpdateSettings(form);
    alert('ההגדרות נשמרו בהצלחה!');
  };

  const handleAddPackaging = () => {
    if (!newPackaging.name || !newPackaging.cost) return;
    
    const newPkg: Packaging = {
      id: crypto.randomUUID(),
      name: newPackaging.name,
      cost: parseFloat(newPackaging.cost),
    };
    onUpdatePackagings([...packagings, newPkg]);
    setNewPackaging({ name: '', cost: '' });
  };

  const handleDeletePackaging = (id: string) => {
    onUpdatePackagings(packagings.filter((p) => p.id !== id));
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // הקטנה לרוחב סביר כדי לשמור על נפח נתונים קטן
        const maxW = 320;
        const ratio = Math.min(1, maxW / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        onUpdateSignature(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('טוען...');
      await onImport(file);
      setImportStatus('הייבוא הושלם בהצלחה!');
      setForm(settings); // עדכון הטופס עם ההגדרות החדשות
    } catch (error) {
      setImportStatus('שגיאה בייבוא הקובץ');
    }

    // נקה את הסטטוס אחרי 3 שניות
    setTimeout(() => setImportStatus(null), 3000);
    e.target.value = '';
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>⚙️ הגדרות</h2>
      </div>

      <div className="settings-grid">
        {/* הגדרות תמחור */}
        <div className="settings-card">
          <h3>הגדרות תמחור</h3>
          
          <div className="form-group">
            <label>עלות שעת עבודה (₪)</label>
            <input
              type="number"
              step="1"
              value={form.laborCostPerHour}
              onChange={(e) => setForm({ ...form, laborCostPerHour: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>אחוז רווח רצוי (%)</label>
            <input
              type="number"
              step="1"
              value={form.profitMarginPercent}
              onChange={(e) => setForm({ ...form, profitMarginPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>עלות משלוח ברירת מחדל (₪)</label>
            <input
              type="number"
              step="1"
              value={form.deliveryCost}
              onChange={(e) => setForm({ ...form, deliveryCost: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label>הוצאות כלליות (חשמל, גז וכו') (%)</label>
            <input
              type="number"
              step="1"
              value={form.overheadPercent}
              onChange={(e) => setForm({ ...form, overheadPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <button onClick={handleSettingsSave} className="btn btn-primary">
            שמור הגדרות
          </button>
        </div>

        {/* סריקת קבלות עם AI */}
        <div className="settings-card">
          <h3>📷 סריקת קבלות (AI)</h3>
          <p className="description">
            מאפשר לצלם קבלה בטאב "הוצאות" והמערכת תמלא אוטומטית סכום, תאריך וספק.
            נדרש מפתח Google Gemini (יש שכבת חינם נדיבה).
          </p>

          <div className="form-group">
            <label>מפתח Gemini API</label>
            <input
              type="password"
              value={form.geminiApiKey || ''}
              onChange={(e) => setForm({ ...form, geminiApiKey: e.target.value })}
              placeholder="הדביקי כאן את המפתח (AIza...)"
              autoComplete="off"
            />
          </div>

          <details className="settings-help">
            <summary>איך משיגים מפתח? (חינם)</summary>
            <ol>
              <li>נכנסים ל־<a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a> ומתחברים עם חשבון Google.</li>
              <li>לוחצים "Create API key" ומעתיקים את המפתח.</li>
              <li>מדביקים כאן ולוחצים "שמור הגדרות".</li>
              <li>מומלץ להגביל את המפתח לדומיין <code>bakedbynitzan.github.io</code> (Application restrictions → HTTP referrers) כדי שיהיה בטוח.</li>
            </ol>
          </details>

          <button onClick={handleSettingsSave} className="btn btn-primary">
            שמור הגדרות
          </button>
        </div>

        {/* ניהול אריזות */}
        <div className="settings-card">
          <h3>📦 סוגי אריזה</h3>

          <div className="packaging-add">
            <input
              type="text"
              value={newPackaging.name}
              onChange={(e) => setNewPackaging({ ...newPackaging, name: e.target.value })}
              placeholder="שם האריזה"
            />
            <input
              type="number"
              step="0.01"
              value={newPackaging.cost}
              onChange={(e) => setNewPackaging({ ...newPackaging, cost: e.target.value })}
              placeholder="מחיר"
            />
            <button onClick={handleAddPackaging} className="btn btn-small">
              הוסף
            </button>
          </div>

          <ul className="packaging-list">
            {packagings.map((pkg) => (
              <li key={pkg.id}>
                <span>{pkg.name}</span>
                <span>₪{pkg.cost.toFixed(2)}</span>
                <button
                  onClick={() => handleDeletePackaging(pkg.id)}
                  className="btn-icon"
                  title="מחק"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* חתימה לקבלות */}
        <div className="settings-card">
          <h3>✍️ חתימה לקבלות</h3>

          <p className="description">
            החתימה מופיעה אוטומטית בכל קבלה. אפשר להעלות תמונת חתימה חדשה
            (רצוי על רקע לבן) או לחזור לחתימת ברירת המחדל.
          </p>

          <div className="signature-preview">
            <img src={signature || DEFAULT_SIGNATURE} alt="חתימה" />
          </div>

          <div className="backup-actions">
            <label className="btn btn-secondary file-input-label">
              🖊️ העלאת חתימה
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                style={{ display: 'none' }}
              />
            </label>
            {signature && (
              <button onClick={() => onUpdateSignature(undefined)} className="btn btn-secondary">
                ↩️ חתימת ברירת מחדל
              </button>
            )}
          </div>
        </div>

        {/* גיבוי ושחזור */}
        <div className="settings-card">
          <h3>💾 גיבוי ושחזור</h3>
          
          <p className="description">
            שמור את כל הנתונים שלך לקובץ או שחזר מגיבוי קודם.
            שימושי כדי להעביר נתונים בין מכשירים.
          </p>

          <div className="backup-actions">
            <button onClick={onExport} className="btn btn-secondary">
              📤 ייצוא לקובץ
            </button>
            
            <label className="btn btn-secondary file-input-label">
              📥 ייבוא מקובץ
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {importStatus && (
            <p className={`import-status ${importStatus.includes('שגיאה') ? 'error' : 'success'}`}>
              {importStatus}
            </p>
          )}
        </div>

        {/* סנכרון בין מכשירים */}
        <div className="settings-card">
          <h3>🔗 סנכרון בין מכשירים</h3>
          
          <p className="description">
            הנתונים שלך מסונכרנים אוטומטית לענן.
            כדי לחבר מכשיר נוסף, העתק את הקוד או הזן קוד ממכשיר אחר.
          </p>

          {shareCode && (
            <div className="share-code-section">
              <label>קוד הסנכרון שלך:</label>
              <div className="share-code-display">
                <code>{shareCode}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareCode);
                    alert('הקוד הועתק!');
                  }}
                  className="btn btn-small"
                >
                  📋 העתק
                </button>
              </div>
            </div>
          )}

          {onConnectWithCode && (
            <div className="connect-section">
              <label>התחברות למכשיר אחר:</label>
              <div className="connect-input">
                <input
                  type="text"
                  value={connectCode}
                  onChange={(e) => setConnectCode(e.target.value)}
                  placeholder="הדבק קוד סנכרון"
                />
                <button
                  onClick={async () => {
                    if (!connectCode.trim()) return;
                    setConnectStatus('מתחבר...');
                    const success = await onConnectWithCode(connectCode.trim());
                    if (success) {
                      setConnectStatus('התחברת בהצלחה! הנתונים מסונכרנים.');
                      setConnectCode('');
                    } else {
                      setConnectStatus('שגיאה - קוד לא תקין');
                    }
                    setTimeout(() => setConnectStatus(null), 3000);
                  }}
                  className="btn btn-primary"
                >
                  התחבר
                </button>
              </div>
              {connectStatus && (
                <p className={`import-status ${connectStatus.includes('שגיאה') ? 'error' : 'success'}`}>
                  {connectStatus}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
