const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');
const VALID_TYPES = new Set(['income', 'expense']);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf8');
  }
}

async function readTransactions() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const rows = JSON.parse(raw || '[]');
  if (!Array.isArray(rows)) throw new Error('The transactions.json file must contain a JSON array.');
  return rows;
}

// Queue writes so two quick requests cannot overwrite each other's changes.
let writeQueue = Promise.resolve();
function saveTransactions(rows) {
  const write = async () => {
    await ensureDataFile();
    const temporaryFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, DATA_FILE);
  };
  writeQueue = writeQueue.then(write, write);
  return writeQueue;
}

function validateTransaction(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const amount = Number(input.amount);
  const type = input.type;
  const category = typeof input.category === 'string' ? input.category.trim() : '';
  const date = typeof input.date === 'string' ? input.date : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';

  if (!title) return 'Please enter a title.';
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
  if (!VALID_TYPES.has(type)) return 'Type must be income or expense.';
  if (!category) return 'Please choose a category.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    return 'Please provide a valid date in YYYY-MM-DD format.';
  }
  if (title.length > 80 || category.length > 40 || description.length > 240) {
    return 'Some text is too long. Please shorten it and try again.';
  }
  return null;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Expense Tracker API is running', storage: 'JSON file' });
});

app.get('/api/transactions', async (req, res, next) => {
  try {
    let rows = await readTransactions();
    const { type, category, search } = req.query;
    if (type && type !== 'all') rows = rows.filter((row) => row.type === type);
    if (category && category !== 'all') rows = rows.filter((row) => row.category === category);
    if (search) {
      const term = String(search).toLowerCase();
      rows = rows.filter((row) => `${row.title} ${row.category} ${row.description || ''}`.toLowerCase().includes(term));
    }
    rows.sort((a, b) => `${b.date}-${b.createdAt}`.localeCompare(`${a.date}-${a.createdAt}`));
    res.json(rows);
  } catch (error) { next(error); }
});

app.get('/api/summary', async (_req, res, next) => {
  try {
    const rows = await readTransactions();
    const income = rows.filter((r) => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
    const expenses = rows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
    const categories = {};
    rows.filter((r) => r.type === 'expense').forEach((r) => {
      categories[r.category] = (categories[r.category] || 0) + Number(r.amount);
    });

    const now = new Date();
    const monthly = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthRows = rows.filter((r) => r.date.startsWith(key));
      monthly.push({
        month: monthDate.toLocaleString('en', { month: 'short' }),
        income: monthRows.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0),
        expenses: monthRows.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
      });
    }

    res.json({ income, expenses, balance: income - expenses, count: rows.length, categories, monthly });
  } catch (error) { next(error); }
});

app.post('/api/transactions', async (req, res, next) => {
  try {
    const problem = validateTransaction(req.body || {});
    if (problem) return res.status(400).json({ message: problem });
    const rows = await readTransactions();
    const transaction = {
      id: randomUUID(),
      title: req.body.title.trim(),
      amount: Number(req.body.amount),
      type: req.body.type,
      category: req.body.category.trim(),
      date: req.body.date,
      description: typeof req.body.description === 'string' ? req.body.description.trim() : '',
      createdAt: new Date().toISOString()
    };
    rows.push(transaction);
    await saveTransactions(rows);
    res.status(201).json(transaction);
  } catch (error) { next(error); }
});

app.put('/api/transactions/:id', async (req, res, next) => {
  try {
    const problem = validateTransaction(req.body || {});
    if (problem) return res.status(400).json({ message: problem });
    const rows = await readTransactions();
    const index = rows.findIndex((row) => row.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Transaction not found.' });
    rows[index] = {
      ...rows[index],
      title: req.body.title.trim(),
      amount: Number(req.body.amount),
      type: req.body.type,
      category: req.body.category.trim(),
      date: req.body.date,
      description: typeof req.body.description === 'string' ? req.body.description.trim() : ''
    };
    await saveTransactions(rows);
    res.json(rows[index]);
  } catch (error) { next(error); }
});

app.delete('/api/transactions/:id', async (req, res, next) => {
  try {
    const rows = await readTransactions();
    const updated = rows.filter((row) => row.id !== req.params.id);
    if (updated.length === rows.length) return res.status(404).json({ message: 'Transaction not found.' });
    await saveTransactions(updated);
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON request body.' });
  }
  res.status(500).json({ message: 'Something went wrong on the server. Check the server terminal.' });
});

ensureDataFile()
  .then(() => app.listen(PORT, () => console.log(`\nExpense Tracker API running at http://localhost:${PORT}\nStorage file: ${DATA_FILE}\n`)))
  .catch((error) => { console.error('Could not prepare JSON storage:', error); process.exit(1); });
