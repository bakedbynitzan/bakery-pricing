import { useState, useEffect } from 'react';
import { useCloudStorage } from './hooks/useCloudStorage';
import { Ingredients } from './components/Ingredients';
import { Recipes } from './components/Recipes';
import { Calculator } from './components/Calculator';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Reports } from './components/Reports';
import { Expenses } from './components/Expenses';
import { CashFlow } from './components/CashFlow';
import { Receipts } from './components/Receipts';
import { Guide } from './components/Guide';
import { Settings } from './components/Settings';
import './App.css';

type Tab = 'orders' | 'products' | 'reports' | 'cashflow' | 'expenses' | 'receipts' | 'calculator' | 'ingredients' | 'recipes' | 'guide' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  const {
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
  } = useCloudStorage();

  if (!isLoaded) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="ניצן - משהו מתוק" className="logo" />
        </div>
        <h1>ניהול קונדיטוריה</h1>
        <button 
          className="theme-toggle" 
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'מצב בהיר' : 'מצב כהה'}
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 הזמנות
        </button>
        <button
          className={`nav-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🎁 מארזים
        </button>
        <button
          className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 דוחות
        </button>
        <button
          className={`nav-btn ${activeTab === 'cashflow' ? 'active' : ''}`}
          onClick={() => setActiveTab('cashflow')}
        >
          💵 תזרים
        </button>
        <button
          className={`nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          💸 הוצאות
        </button>
        <button
          className={`nav-btn ${activeTab === 'receipts' ? 'active' : ''}`}
          onClick={() => setActiveTab('receipts')}
        >
          🧾 קבלות
        </button>
        <button
          className={`nav-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          🧮 תמחור
        </button>
        <button
          className={`nav-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredients')}
        >
          🥚 חומרים
        </button>
        <button
          className={`nav-btn ${activeTab === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          📖 מתכונים
        </button>
        <button
          className={`nav-btn ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          ❓ מדריך
        </button>
        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'orders' && (
          <Orders
            orders={data.orders || []}
            products={data.products || []}
            recipes={data.recipes || []}
            ingredients={data.ingredients || []}
            receipts={data.receipts || []}
            signature={data.signature}
            addReceipt={addReceipt}
            onCreateOrder={addOrder}
            onUpdate={updateOrders}
          />
        )}
        {activeTab === 'products' && (
          <Products
            products={data.products || []}
            recipes={data.recipes || []}
            ingredients={data.ingredients || []}
            onUpdate={updateProducts}
          />
        )}
        {activeTab === 'reports' && (
          <Reports
            orders={data.orders || []}
            products={data.products || []}
          />
        )}
        {activeTab === 'cashflow' && (
          <CashFlow
            orders={data.orders || []}
            expenses={data.expenses || []}
            products={data.products || []}
            recipes={data.recipes || []}
            ingredients={data.ingredients || []}
          />
        )}
        {activeTab === 'expenses' && (
          <Expenses
            expenses={data.expenses || []}
            onUpdate={updateExpenses}
          />
        )}
        {activeTab === 'receipts' && (
          <Receipts
            receipts={data.receipts || []}
            signature={data.signature}
            addReceipt={addReceipt}
            onDelete={deleteReceipt}
          />
        )}
        {activeTab === 'calculator' && (
          <Calculator
            recipes={data.recipes}
            ingredients={data.ingredients}
            packagings={data.packagings}
            settings={data.settings}
          />
        )}
        {activeTab === 'ingredients' && (
          <Ingredients
            ingredients={data.ingredients}
            onUpdate={updateIngredients}
          />
        )}
        {activeTab === 'recipes' && (
          <Recipes
            recipes={data.recipes}
            ingredients={data.ingredients}
            onUpdate={updateRecipes}
          />
        )}
        {activeTab === 'guide' && <Guide />}
        {activeTab === 'settings' && (
          <Settings
            settings={data.settings}
            packagings={data.packagings}
            signature={data.signature}
            onUpdateSignature={updateSignature}
            onUpdateSettings={updateSettings}
            onUpdatePackagings={updatePackagings}
            onExport={exportData}
            onImport={importData}
            shareCode={getShareCode()}
            onConnectWithCode={connectWithCode}
          />
        )}
      </main>

      <footer className="app-footer">
        {syncError && (
          <p className="sync-error">⚠️ {syncError}</p>
        )}
        <p>
          <span className="sync-status">
            {isSaving ? '🔄 שומר...' : isSyncing ? '🔄 מסנכרן...' : lastSaved ? `✅ ${lastSaved.toLocaleTimeString('he-IL')}` : '☁️'}
          </span>
          {' | '}
          <button 
            className="sync-btn" 
            onClick={() => refreshFromCloud()} 
            disabled={isSyncing}
            title={lastSynced ? `סונכרן: ${lastSynced.toLocaleTimeString('he-IL')}` : 'רענן מהענן'}
          >
            🔄 סנכרן
          </button>
          {' | '}
          <span className="stats">
            {(data.orders || []).length} הזמנות | {(data.products || []).length} מארזים
          </span>
          {binId && (
            <span className="bin-id" title="קוד סנכרון"> | 🔗 {binId.slice(-6)}</span>
          )}
        </p>
      </footer>
    </div>
  );
}

export default App;
