import { useState } from 'react';
import { Ingredient, Unit, unitLabels } from '../types';

interface Props {
  ingredients: Ingredient[];
  onUpdate: (ingredients: Ingredient[]) => void;
}

export function Ingredients({ ingredients, onUpdate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    packagePrice: '', // מחיר האריזה
    packageQuantity: '1', // כמות באריזה
    unit: 'unit' as Unit,
    supplier: '',
    notes: '',
  });

  const resetForm = () => {
    setForm({ name: '', packagePrice: '', packageQuantity: '1', unit: 'unit', supplier: '', notes: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  // חישוב מחיר ליחידה
  const pricePerUnit = form.packagePrice && form.packageQuantity
    ? parseFloat(form.packagePrice) / parseFloat(form.packageQuantity)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    const pkgPrice = parseFloat(form.packagePrice);
    const pkgQty = parseFloat(form.packageQuantity);
    const calculatedPricePerUnit = pkgPrice / pkgQty;
    
    if (editingId) {
      // עדכון קיים
      onUpdate(
        ingredients.map((ing) =>
          ing.id === editingId
            ? {
                ...ing,
                name: form.name,
                pricePerUnit: calculatedPricePerUnit,
                packagePrice: pkgPrice,
                packageQuantity: pkgQty,
                unit: form.unit,
                supplier: form.supplier,
                notes: form.notes,
                updatedAt: now,
              }
            : ing
        )
      );
    } else {
      // הוספה חדשה
      const newIngredient: Ingredient = {
        id: crypto.randomUUID(),
        name: form.name,
        pricePerUnit: calculatedPricePerUnit,
        packagePrice: pkgPrice,
        packageQuantity: pkgQty,
        unit: form.unit,
        supplier: form.supplier,
        notes: form.notes,
        createdAt: now,
        updatedAt: now,
      };
      onUpdate([...ingredients, newIngredient]);
    }
    resetForm();
  };

  const handleEdit = (ingredient: Ingredient) => {
    setForm({
      name: ingredient.name,
      packagePrice: (ingredient.packagePrice || ingredient.pricePerUnit).toString(),
      packageQuantity: (ingredient.packageQuantity || 1).toString(),
      unit: ingredient.unit,
      supplier: ingredient.supplier || '',
      notes: ingredient.notes || '',
    });
    setEditingId(ingredient.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('למחוק את חומר הגלם?')) {
      onUpdate(ingredients.filter((ing) => ing.id !== id));
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <h2>🥚 חומרי גלם</h2>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">
            + הוסף חומר גלם
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="form-card">
          <h3>{editingId ? 'עריכת חומר גלם' : 'הוספת חומר גלם חדש'}</h3>
          
          <div className="form-grid">
            <div className="form-group">
              <label>שם חומר הגלם</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="לדוגמה: ביצים / קמח / סוכר"
                required
              />
            </div>

            <div className="form-group">
              <label>מחיר האריזה (₪)</label>
              <input
                type="number"
                step="0.01"
                value={form.packagePrice}
                onChange={(e) => setForm({ ...form, packagePrice: e.target.value })}
                placeholder="כמה שילמת על האריזה"
                required
              />
            </div>

            <div className="form-group">
              <label>כמות באריזה</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.packageQuantity}
                onChange={(e) => setForm({ ...form, packageQuantity: e.target.value })}
                placeholder="כמה יחידות באריזה"
                required
              />
            </div>

            <div className="form-group">
              <label>יחידת מידה</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}
              >
                {Object.entries(unitLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ספק (אופציונלי)</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="שם הספק"
              />
            </div>
          </div>

          {pricePerUnit > 0 && (
            <div className="price-preview">
              <strong>מחיר ליחידה:</strong> ₪{pricePerUnit < 0.01 ? pricePerUnit.toFixed(4) : pricePerUnit.toFixed(2)} ל{unitLabels[form.unit]}
            </div>
          )}

          <div className="form-group">
            <label>הערות (אופציונלי)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="הערות נוספות..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'עדכן' : 'הוסף'}
            </button>
            <button type="button" onClick={resetForm} className="btn btn-secondary">
              ביטול
            </button>
          </div>
        </form>
      )}

      {ingredients.length === 0 ? (
        <div className="empty-state">
          <p>עדיין אין חומרי גלם. הוסף את חומרי הגלם הראשונים שלך!</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>מחיר אריזה</th>
                <th>כמות באריזה</th>
                <th>מחיר ליחידה</th>
                <th>ספק</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <tr key={ing.id}>
                  <td><strong>{ing.name}</strong></td>
                  <td>₪{(ing.packagePrice || ing.pricePerUnit).toFixed(2)}</td>
                  <td>{ing.packageQuantity || 1} {unitLabels[ing.unit]}</td>
                  <td className="price-cell">₪{ing.pricePerUnit.toFixed(4)}/{unitLabels[ing.unit]}</td>
                  <td>{ing.supplier || '-'}</td>
                  <td className="actions">
                    <button onClick={() => handleEdit(ing)} className="btn-icon" title="ערוך">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(ing.id)} className="btn-icon" title="מחק">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
