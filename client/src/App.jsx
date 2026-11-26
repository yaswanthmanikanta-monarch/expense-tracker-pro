import { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownLeft, ArrowUpRight, BadgeIndianRupee, CalendarDays,
  Check, ChevronDown, CircleHelp, CreditCard, Download, Filter, LayoutDashboard,
  ListFilter, Menu, Plus, Search, Settings2, Sparkles, Trash2, Wallet, X, Pencil,
  TrendingDown, TrendingUp, ReceiptText
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Salary', 'Freelance', 'Other'];
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Request failed. Is the backend running?');
  return result;
}

function IconTile({ children, tone = 'blue' }) {
  return <span className={`icon-tile ${tone}`}>{children}</span>;
}

function StatCard({ label, value, note, tone, icon, trend }) {
  return (
    <article className="stat-card">
      <div className="stat-top"><span>{label}</span><IconTile tone={tone}>{icon}</IconTile></div>
      <div className="stat-value">{money(value)}</div>
      <div className="stat-note">{trend && <span className={`trend ${tone}`}>{trend}</span>}{note}</div>
    </article>
  );
}

function TransactionModal({ initial, onClose, onSave, busy }) {
  const [form, setForm] = useState(initial || {
    title: '', amount: '', type: 'expense', category: 'Food', date: today(), description: ''
  });
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0 || !form.date) {
      setError('Enter a title, a positive amount and a date.');
      return;
    }
    try { await onSave({ ...form, amount: Number(form.amount) }); }
    catch (err) { setError(err.message); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><span className="eyebrow">YOUR MONEY, ORGANIZED</span><h2 id="modal-title">{initial ? 'Edit transaction' : 'Add transaction'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <form onSubmit={submit} className="transaction-form">
          <label className="field-label">Transaction type</label>
          <div className="type-switch">
            <button type="button" className={form.type === 'expense' ? 'selected expense' : ''} onClick={() => { update('type', 'expense'); update('category', 'Food'); }}> <ArrowUpRight size={16} /> Expense</button>
            <button type="button" className={form.type === 'income' ? 'selected income' : ''} onClick={() => { update('type', 'income'); update('category', 'Salary'); }}> <ArrowDownLeft size={16} /> Income</button>
          </div>
          <label className="field-label" htmlFor="title">Title</label>
          <input id="title" autoFocus maxLength="80" placeholder="e.g. Monthly groceries" value={form.title} onChange={(e) => update('title', e.target.value)} />
          <div className="form-grid">
            <div><label className="field-label" htmlFor="amount">Amount (₹)</label><div className="amount-input"><span>₹</span><input id="amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></div></div>
            <div><label className="field-label" htmlFor="date">Date</label><input id="date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} /></div>
          </div>
          <label className="field-label" htmlFor="category">Category</label>
          <select id="category" value={form.category} onChange={(e) => update('category', e.target.value)}>
            {CATEGORIES.filter((c) => form.type === 'income' ? ['Salary', 'Freelance', 'Other'].includes(c) : !['Salary', 'Freelance'].includes(c)).map((category) => <option key={category}>{category}</option>)}
          </select>
          <label className="field-label" htmlFor="description">Note <span className="optional">(optional)</span></label>
          <textarea id="description" rows="2" maxLength="240" placeholder="Add a short note..." value={form.description} onChange={(e) => update('description', e.target.value)} />
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving...' : initial ? 'Save changes' : 'Add transaction'} <Check size={16} /></button></div>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, categories: {}, monthly: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [activePage, setActivePage] = useState('Overview');
  const [mobileMenu, setMobileMenu] = useState(false);

  const loadData = async () => {
    try {
      setError('');
      const [rows, totals] = await Promise.all([request('/api/transactions'), request('/api/summary')]);
      setTransactions(rows);
      setSummary(totals);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const visibleTransactions = useMemo(() => transactions.filter((row) => {
    const matchesType = typeFilter === 'all' || row.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || row.category === categoryFilter;
    const term = query.trim().toLowerCase();
    const matchesSearch = !term || `${row.title} ${row.category} ${row.description || ''}`.toLowerCase().includes(term);
    return matchesType && matchesCategory && matchesSearch;
  }), [transactions, typeFilter, categoryFilter, query]);

  const topCategories = useMemo(() => Object.entries(summary.categories || {}).sort((a, b) => b[1] - a[1]).slice(0, 5), [summary.categories]);
  const maxMonthValue = Math.max(1, ...(summary.monthly || []).flatMap((m) => [m.income, m.expenses]));
  const categoryTotal = topCategories.reduce((total, item) => total + item[1], 0);
  const categoryColors = ['#7c6cf2', '#20b98a', '#f5a84b', '#4ea8de', '#e56b9f'];

  const saveTransaction = async (data) => {
    setBusy(true);
    try {
      if (modal?.id) await request(`/api/transactions/${modal.id}`, { method: 'PUT', body: JSON.stringify(data) });
      else await request('/api/transactions', { method: 'POST', body: JSON.stringify(data) });
      setModal(null);
      await loadData();
    } finally { setBusy(false); }
  };

  const deleteTransaction = async (row) => {
    if (!window.confirm(`Delete "${row.title}"? This cannot be undone.`)) return;
    try { await request(`/api/transactions/${row.id}`, { method: 'DELETE' }); await loadData(); }
    catch (err) { setError(err.message); }
  };

  const exportCsv = () => {
    const headers = ['Title', 'Type', 'Category', 'Amount', 'Date', 'Description'];
    const lines = transactions.map((r) => [r.title, r.type, r.category, r.amount, r.date, r.description || ''].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','));
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'expense-tracker-transactions.csv'; anchor.click(); URL.revokeObjectURL(url);
  };

  const navItems = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Transactions', icon: ReceiptText }];
  const displayedRows = activePage === 'Overview' ? visibleTransactions.slice(0, 6) : visibleTransactions;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Wallet size={21} /></span><span>expense<span className="brand-light">flow</span><small>PERSONAL FINANCE</small></span></div>
        <div className="side-label">WORKSPACE</div>
        <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${activePage === label ? 'active' : ''}`} onClick={() => { setActivePage(label); setMobileMenu(false); }}><Icon size={18} />{label}{label === 'Transactions' && <span className="nav-count">{transactions.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="tip-card"><span className="tip-icon"><Sparkles size={16} /></span><strong>Small steps add up.</strong><p>Track your spending regularly to build better money habits.</p></div><div className="profile"><div className="avatar">U</div><div><strong>My Account</strong><span>Personal workspace</span></div><Settings2 size={17} className="profile-settings" /></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu"><Menu size={20} /></button><div><div className="breadcrumb">Workspace <span>/</span> {activePage}</div><div className="top-date"><CalendarDays size={14} /> {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div></div></div><div className="topbar-actions"><span className="storage-pill"><span className="online-dot"></span> Local storage active</span><button className="button primary add-top" onClick={() => setModal({})}><Plus size={17} /> Add transaction</button></div></header>

        <div className="content-wrap">
          <section className="welcome-row"><div><span className="eyebrow">YOUR FINANCIAL SNAPSHOT</span><h1>{activePage === 'Overview' ? 'Overview' : 'All transactions'}<span className="title-dot">.</span></h1><p>{activePage === 'Overview' ? 'Here is what is happening with your money.' : 'Review, search and manage every transaction.'}</p></div><button className="button secondary export-button" onClick={exportCsv} disabled={!transactions.length}><Download size={16} /> Export CSV</button></section>

          {error && <div className="error-banner"><CircleHelp size={17} /><span>{error} Make sure the server terminal is running on port 5000.</span><button onClick={loadData}>Retry</button></div>}

          <section className="stats-grid">
            <StatCard label="Total balance" value={summary.balance} note="Income minus expenses" tone="blue" icon={<Wallet size={19} />} trend={<Activity size={13} />} />
            <StatCard label="Total income" value={summary.income} note="All recorded income" tone="green" icon={<TrendingUp size={19} />} trend={<ArrowDownLeft size={13} />} />
            <StatCard label="Total expenses" value={summary.expenses} note="All recorded expenses" tone="orange" icon={<TrendingDown size={19} />} trend={<ArrowUpRight size={13} />} />
          </section>

          {activePage === 'Overview' && <section className="insights-grid">
            <article className="panel spending-panel"><div className="panel-heading"><div><h2>Cash flow</h2><p>Income vs expenses over the last 6 months</p></div><span className="period-chip">6 months <ChevronDown size={13} /></span></div>
              <div className="chart-legend"><span><i className="legend-dot income-dot"></i>Income</span><span><i className="legend-dot expense-dot"></i>Expenses</span></div>
              <div className="bar-chart">{(summary.monthly || []).map((month) => <div className="bar-group" key={month.month}><div className="bars"><div className="bar income-bar" title={`Income ${money(month.income)}`} style={{ height: `${Math.max(3, (month.income / maxMonthValue) * 100)}%` }}></div><div className="bar expense-bar" title={`Expenses ${money(month.expenses)}`} style={{ height: `${Math.max(3, (month.expenses / maxMonthValue) * 100)}%` }}></div></div><span>{month.month}</span></div>)}</div>
              {!transactions.length && <div className="chart-empty">Add transactions to see your cash flow.</div>}
            </article>
            <article className="panel category-panel"><div className="panel-heading"><div><h2>Spending by category</h2><p>Where your money goes</p></div><span className="small-icon"><ListFilter size={17} /></span></div>
              {topCategories.length ? <><div className="donut-wrap"><div className="donut" style={{ background: `conic-gradient(${topCategories.map(([, value], index) => `${categoryColors[index]} ${topCategories.slice(0, index).reduce((s, item) => s + item[1], 0) / categoryTotal * 100}% ${(topCategories.slice(0, index + 1).reduce((s, item) => s + item[1], 0) / categoryTotal) * 100}%`).join(', ')})` }}><div className="donut-hole"><strong>{money(categoryTotal)}</strong><span>Total spend</span></div></div></div><div className="category-legend">{topCategories.map(([name, value], index) => <div className="category-row" key={name}><span><i style={{ background: categoryColors[index] }}></i>{name}</span><strong>{money(value)}</strong></div>)}</div></> : <div className="empty-chart"><span className="empty-icon"><Filter size={20} /></span><strong>No spending data yet</strong><p>Your expense categories will appear here.</p></div>}
            </article>
          </section>}

          <section className="panel transactions-panel"><div className="panel-heading transactions-heading"><div><h2>{activePage === 'Overview' ? 'Recent transactions' : 'Transaction history'}</h2><p>{activePage === 'Overview' ? 'Your latest money activity' : `${visibleTransactions.length} transaction${visibleTransactions.length === 1 ? '' : 's'} found`}</p></div>{activePage === 'Overview' && <button className="text-button" onClick={() => setActivePage('Transactions')}>View all <ArrowUpRight size={15} /></button>}</div>
            <div className="table-toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search transactions..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="filters"><select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select><select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div></div>
            <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th className="amount-col">AMOUNT</th><th className="action-col">ACTIONS</th></tr></thead><tbody>
              {loading ? <tr><td colSpan="6" className="table-message">Loading your transactions...</td></tr> : displayedRows.length ? displayedRows.map((row) => <tr key={row.id}><td><div className="transaction-name"><span className={`transaction-symbol ${row.type}`}>{row.type === 'income' ? <ArrowDownLeft size={16} /> : <CreditCard size={16} />}</span><div><strong>{row.title}</strong>{row.description && <small>{row.description}</small>}</div></div></td><td><span className="category-pill">{row.category}</span></td><td className="date-cell">{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td><td><span className={`type-label ${row.type}`}>{row.type}</span></td><td className={`amount-cell ${row.type}`}>{row.type === 'income' ? '+' : '−'}{money(row.amount)}</td><td><div className="row-actions"><button title="Edit transaction" onClick={() => setModal(row)}><Pencil size={15} /></button><button title="Delete transaction" onClick={() => deleteTransaction(row)}><Trash2 size={15} /></button></div></td></tr>) : <tr><td colSpan="6"><div className="table-empty"><span className="empty-icon"><ReceiptText size={21} /></span><strong>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</strong><p>{transactions.length ? 'Try changing your search or filters.' : 'Add your first income or expense to get started.'}</p>{!transactions.length && <button className="button primary" onClick={() => setModal({})}><Plus size={16} /> Add your first transaction</button>}</div></td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing <strong>{displayedRows.length}</strong> of <strong>{visibleTransactions.length}</strong> transactions</span><span className="footer-storage"><span className="online-dot"></span> Saved in your project folder</span></div>
          </section>
          <footer className="footer-note">Built with React.js + Node.js <span>•</span> Data stored locally in JSON <span>•</span> Your personal finance workspace</footer>
        </div>
      </main>
      {modal && <TransactionModal initial={modal.id ? modal : null} onClose={() => setModal(null)} onSave={saveTransaction} busy={busy} />}
    </div>
  );
}

export default App;
