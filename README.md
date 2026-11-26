# ExpenseFlow — Personal Expense Tracker

A beginner-friendly full-stack Expense Tracker built with **React.js + Node.js + Express**. It saves records in a local JSON file, so **MySQL and MongoDB are not required**.

## Features
- Add, edit and delete income or expense transactions
- Dashboard totals for balance, income and expenses
- Spending breakdown by category
- Six-month income vs. expense chart
- Search and filter by type and category
- Export transaction history as CSV (opens in Excel)
- Data persists in `server/data/transactions.json`
- Responsive dark dashboard for desktop and mobile

## Requirements
- Windows 10/11 (or macOS/Linux)
- Node.js LTS (npm is included)
- Internet connection for the first `npm install` (to download project packages)
- No database server needed

## 1. Install Node.js
If Node.js is not installed, get the LTS installer from https://nodejs.org/ . Install it using the default options, then close and reopen VS Code or Command Prompt.

Check installation:

```bash
node -v
npm -v
```

## 2. Open the project
1. Extract `ExpenseFlow-JSON.zip`.
2. Open the extracted `expense-tracker-json` folder in VS Code.

## 3. Start the backend (Terminal 1)
In VS Code, choose **Terminal → New Terminal**, then run:

```bash
cd server
npm install
npm run dev
```

Expected message:

```text
Expense Tracker API running at http://localhost:5000
Storage file: .../server/data/transactions.json
```

Keep this terminal open.

## 4. Start the React website (Terminal 2)
Open a second terminal using **Terminal → New Terminal**. From the project root, run:

```bash
cd client
npm install
npm run dev
```

Vite will show a local address, normally:

```text
http://localhost:5173
```

Hold `Ctrl` and click the address, or copy it into Chrome.

## 5. Test the application
1. Click **Add transaction**.
2. Add an expense (example: title `Lunch`, amount `150`, type `Expense`, category `Food`, today's date).
3. Add an income (example: title `Pocket money`, amount `1000`, type `Income`, category `Salary`).
4. Confirm the dashboard totals and transaction list update.
5. Use the pencil icon to edit and the trash icon to delete.
6. Click **Export CSV** to download a spreadsheet that opens in Excel.
7. Close and reopen the website. Your saved entries should still appear.

## Where is the data stored?

All transactions are saved in:

```text
server/data/transactions.json
```

You can open this file in VS Code or Notepad to see the JSON records. Do not delete or manually edit it while the server is handling requests. Back it up occasionally by copying the file.

## API endpoints (for lab explanation)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check whether the backend is running |
| GET | `/api/transactions` | Read all transactions; supports search/type/category query parameters |
| GET | `/api/summary` | Calculate income, expenses, balance, category totals and monthly totals |
| POST | `/api/transactions` | Add a transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |

## How the application works

```text
User
  |
  v
React.js website (port 5173)
  |
  | HTTP requests (fetch)
  v
Node.js + Express API (port 5000)
  |
  | Read / write JSON
  v
server/data/transactions.json
```

## Common problems

**`npm` is not recognized:** Install Node.js LTS, then restart the terminal/VS Code.

**Website says it cannot connect to the server:** Make sure Terminal 1 is still running `npm run dev` inside the `server` folder.

**Port 5000 or 5173 is already in use:** Close the other project using that port, then run this project again.

**PowerShell blocks a command:** These instructions do not require activating a Python environment. Run the `npm` commands directly in the VS Code terminal.

**Data disappeared:** Check that `server/data/transactions.json` still exists and contains a JSON array. Do not move the `server` folder after saving data unless you move the JSON file with it.

## Short project explanation for your lab

**Aim:** To develop a personal expense tracking web application using React.js and Node.js that helps users record and manage income and expenses.

**Frontend:** React.js is used to create the dashboard, transaction form, filters and reports.

**Backend:** Node.js runs the server and Express.js provides API routes to add, read, update and delete transactions.

**Storage:** A JSON file is used for persistent local storage. The server reads the file when data is requested and writes it when a transaction is created, updated or deleted.

**CRUD:** Create = add a transaction; Read = display/search transactions; Update = edit a transaction; Delete = remove a transaction.

**Note:** JSON-file storage is suitable for a small student demo on one computer. It is not a replacement for a production database when multiple users or simultaneous writes are expected. If your lab specifically requires MySQL, use a MySQL-backed version instead.

## Windows PowerShell note

If PowerShell blocks `npm.ps1` with an execution-policy message, use `npm.cmd` in the commands above instead (for example, `npm.cmd install` and `npm.cmd run dev`).
