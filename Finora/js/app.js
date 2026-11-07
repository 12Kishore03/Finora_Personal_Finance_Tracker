import {
  initializeStorage,
  readBudgets,
  writeBudgets,
  readSettings,
  replaceAllData,
} from "./storage.js";
import {
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transaction.js";
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(n) || 0,
  );
const dateFmt = (s) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${s}T00:00:00`));
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cats = {
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Education",
    "Entertainment",
    "Healthcare",
    "Bills",
    "Travel",
    "Rent",
    "Personal care",
    "Other",
  ],
  income: ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"],
};
let page = document.body.dataset.page || "dashboard",
  editingId = null,
  editingBudgetId = null,
  filterMonth = today().slice(0, 7);
try {
  initializeStorage();
} catch (e) {
  console.error(e);
}
function shell() {
  const nav = [
    ["dashboard", "▦", "Dashboard", "../index.html"],
    ["income", "↗", "Income", "income.html"],
    ["expenses", "↙", "Expenses", "expenses.html"],
    ["transactions", "⇄", "Transactions", "transactions.html"],
    ["budgets", "◎", "Budgets", "budgets.html"],
    ["reports", "▥", "Reports", "reports.html"],
  ];
  const base = page === "dashboard" ? "pages/" : "";
  const link = (p) =>
    page === "dashboard"
      ? p === "dashboard"
        ? "index.html"
        : `pages/${p}.html`
      : p === "dashboard"
        ? "../index.html"
        : `${p}.html`;
  const items = nav
    .map(
      ([p, i, t]) =>
        `<a class="nav-link ${page === p ? "active" : ""}" href="${link(p)}"><span>${i}</span>${t}</a>`,
    )
    .join("");
  return `<div class="app-shell"><aside class="sidebar" id="sidebar"><a class="brand" href="${page === "dashboard" ? "index.html" : "../index.html"}"><span class="brand-mark">f</span><span>finora</span></a><div class="sidebar-label">WORKSPACE</div><nav class="nav-list">${items}</nav><div class="sidebar-bottom"><div class="sidebar-label">PREFERENCES</div><a class="nav-link ${page === "backup" ? "active" : ""}" href="${page === "dashboard" ? "pages/backup.html" : "backup.html"}"><span>⤓</span>Backup & restore</a><div class="sidebar-note"><i></i><div><strong>Your money, clearly.</strong><small>Private storage on this device.</small></div></div><div class="profile-row"><div class="avatar">Y</div><div><strong>My account</strong><small>Personal workspace</small></div></div></div></aside><main class="main-area"><header class="topbar"><button class="mobile-menu" id="menuToggle">☰</button><div class="breadcrumb">Workspace <span>/</span> <strong>${pageTitle()}</strong></div><div class="topbar-right"><span>${dateFmt(today())}</span><div class="avatar small">Y</div></div></header><section class="page-content" id="content"></section></main></div><dialog class="modal" id="txModal"><form class="modal-card" id="txForm"><div class="modal-heading"><div><p class="eyebrow">MONEY ACTIVITY</p><h2 id="modalTitle">Add transaction</h2></div><button type="button" class="modal-close" id="closeModal">×</button></div><div class="type-switch"><button type="button" class="type-option selected" data-type="expense">Expense</button><button type="button" class="type-option" data-type="income">Income</button></div><label class="field-label">Title<input class="input-control" name="title" required maxlength="80" placeholder="e.g. Grocery shopping"></label><div class="form-row"><label class="field-label">Amount (₹)<input class="input-control" name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></label><label class="field-label">Category<select class="input-control" name="category"></select></label></div><label class="field-label">Date<input class="input-control" name="date" type="date" required value="${today()}"></label><label class="field-label">Note <span class="optional">(optional)</span><textarea class="input-control textarea-control" name="description" rows="3" maxlength="500" placeholder="Add a short note"></textarea></label><div class="modal-actions"><button type="button" class="button button-plain" id="cancelModal">Cancel</button><button class="button button-primary" type="submit">Save transaction</button></div></form></dialog><div id="toast" class="app-toast" role="status" aria-live="polite"></div>`;
}
function pageTitle() {
  return (
    {
      dashboard: "Dashboard",
      income: "Income",
      expenses: "Expenses",
      transactions: "Transactions",
      budgets: "Budgets",
      reports: "Reports",
      backup: "Backup & restore",
    }[page] || "Dashboard"
  );
}
function heading(kicker, title, sub, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}<span class="heading-period">.</span></h1><p class="muted">${sub}</p></div>${action}</div>`;
}
function buttonAdd(label = "Add transaction") {
  return `<button class="button button-primary" data-add>${label}</button>`;
}
function table(items, actions = true) {
  if (!items.length)
    return `<div class="empty-state"><div class="empty-icon">▤</div><strong>No transactions found</strong><p>Start by adding your first record or adjust the filters.</p><button class="button button-soft" data-add>Add transaction</button></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th class="align-right">AMOUNT</th>${actions ? '<th class="align-right">ACTIONS</th>' : ""}</tr></thead><tbody>${items.map((t) => `<tr><td><strong>${esc(t.title)}</strong>${t.description ? `<small class="row-note">${esc(t.description)}</small>` : ""}</td><td>${esc(t.category)}</td><td>${dateFmt(t.date)}</td><td><span class="pill ${t.type}">${t.type}</span></td><td class="align-right amount-cell ${t.type}">${t.type === "income" ? "+" : "−"}${money(t.amount)}</td>${actions ? `<td class="align-right action-cell"><button class="icon-action" data-edit="${t.id}" aria-label="Edit">✎</button><button class="icon-action danger" data-delete="${t.id}" aria-label="Delete">×</button></td>` : ""}</tr>`).join("")}</tbody></table></div>`;
}
function summary(label, value, sub, icon, cls = "") {
  return `<article class="summary-card"><div class="card-top"><span class="card-label">${label}</span><span class="card-symbol ${cls}">${icon}</span></div><div class="amount">${value}</div><div class="card-foot">${sub}</div></article>`;
}
function monthTransactions() {
  return getAllTransactions().filter((t) => t.date.startsWith(filterMonth));
}
function dashboard() {
  const all = getAllTransactions(),
    m = monthTransactions(),
    inc = m
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amount, 0),
    exp = m
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amount, 0),
    budgets = readBudgets().filter((b) => b.month === filterMonth),
    spent = (b) =>
      m
        .filter((t) => t.type === "expense" && t.category === b.category)
        .reduce((a, t) => a + t.amount, 0),
    left = budgets.reduce((a, b) => a + Math.max(0, b.limit - spent(b)), 0);
  const bycat = Object.entries(
    m
      .filter((t) => t.type === "expense")
      .reduce(
        (a, t) => ((a[t.category] = (a[t.category] || 0) + t.amount), a),
        {},
      ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return `${heading("OVERVIEW", "Your finances, at a glance", "A clear picture of your money this month.", buttonAdd())}<div class="filter-line"><label>Reporting month <input type="month" id="monthFilter" value="${filterMonth}" class="select-control"></label><span class="muted">${m.length} transactions this month</span></div><div class="summary-grid">${summary("Monthly balance", money(inc - exp), "Income minus expenses", "₹", "balance-symbol")}${summary("Income", money(inc), "Money received", "↗", "income-symbol")}${summary("Expenses", money(exp), "Money spent", "↙", "expense-symbol")}${summary("Budget remaining", money(left), "Remaining in set budgets", "◎", "budget-symbol")}</div><div class="content-grid"><section class="panel"><div class="panel-heading"><div><h2>Income vs expenses</h2><p class="muted">Daily totals for the selected month</p></div></div>${monthlyBars(m)}</section><section class="panel"><div class="panel-heading"><div><h2>Budget progress</h2><p class="muted">Your category limits</p></div><a class="text-link" href="pages/budgets.html">Manage ↗</a></div>${budgets.length ? budgets.map((b) => budgetRow(b, spent(b))).join("") : `<div class="budget-empty"><div class="empty-icon">◎</div><strong>No budgets yet</strong><p>Create category budgets to keep spending on track.</p><a class="button button-soft" href="pages/budgets.html">Create a budget</a></div>`}</section></div><div class="content-grid"><section class="panel"><div class="panel-heading"><div><h2>Spending by category</h2><p class="muted">Top expense categories</p></div></div>${bycat.length ? bycat.map(([c, v]) => `<div class="category-line"><div><span>${esc(c)}</span><strong>${money(v)}</strong></div><div class="progress-track"><i style="width:${Math.max(2, (v / bycat[0][1]) * 100)}%"></i></div></div>`).join("") : '<div class="empty-inline">Your category breakdown will appear after you add expenses.</div>'}</section><section class="panel"><div class="panel-heading"><div><h2>Quick insights</h2><p class="muted">For the selected month</p></div></div><div class="insight-list"><div><span>Average expense</span><strong>${money(m.filter((t) => t.type === "expense").length ? exp / m.filter((t) => t.type === "expense").length : 0)}</strong></div><div><span>Largest expense</span><strong>${money(Math.max(0, ...m.filter((t) => t.type === "expense").map((t) => t.amount)))}</strong></div><div><span>Net savings rate</span><strong>${inc ? `${Math.round(((inc - exp) / inc) * 100)}%` : "—"}</strong></div></div></section></div><section class="panel"><div class="panel-heading"><div><h2>Recent transactions</h2><p class="muted">Your latest money activity</p></div><a class="text-link" href="pages/transactions.html">See all ↗</a></div>${table(all.slice(0, 5), false)}</section><footer class="page-footer"><span>© ${new Date().getFullYear()} Finora</span><span>Made for mindful money habits ✳</span></footer>`;
}
function monthlyBars(items) {
  const days = Array.from(
      {
        length: new Date(
          Number(filterMonth.slice(0, 4)),
          Number(filterMonth.slice(5, 7)),
          0,
        ).getDate(),
      },
      (_, i) => i + 1,
    ),
    daily = days.map((d) => ({
      d,
      inc: items
        .filter(
          (t) =>
            t.date === `${filterMonth}-${String(d).padStart(2, "0")}` &&
            t.type === "income",
        )
        .reduce((a, t) => a + t.amount, 0),
      exp: items
        .filter(
          (t) =>
            t.date === `${filterMonth}-${String(d).padStart(2, "0")}` &&
            t.type === "expense",
        )
        .reduce((a, t) => a + t.amount, 0),
    }));
  const max = Math.max(1, ...daily.flatMap((x) => [x.inc, x.exp]));
  return `<div class="legend"><span><i class="income-dot"></i>Income</span><span><i class="expense-dot"></i>Expenses</span></div><div class="bar-chart">${daily.map((x) => `<div class="bar-pair" title="${x.d}: Income ${money(x.inc)} · Expenses ${money(x.exp)}"><i class="bar income-bar" style="height:${(x.inc / max) * 100}%"></i><i class="bar expense-bar" style="height:${(x.exp / max) * 100}%"></i></div>`).join("")}</div><div class="chart-axis"><span>1</span><span>7</span><span>14</span><span>21</span><span>${days.length}</span></div>`;
}
function budgetRow(b, s) {
  const pct = Math.min(100, (s / b.limit) * 100),
    over = s > b.limit;
  return `<div class="budget-item"><div class="budget-title"><span><strong>${esc(b.category)}</strong><small>${money(s)} of ${money(b.limit)}</small></span><strong class="${over ? "over" : ""}">${Math.round((s / b.limit) * 100)}%</strong></div><div class="progress-track"><i class="${over ? "over" : ""}" style="width:${pct}%"></i></div></div>`;
}
function transactionsPage(type) {
  const list = getAllTransactions().filter((t) => !type || t.type === type);
  const headingTitle =
    type === "income"
      ? "Income records"
      : type === "expense"
        ? "Expense records"
        : "All transactions";
  return `${heading(type ? type.toUpperCase() : "HISTORY", headingTitle, type === "income" ? "Track money received and other earnings." : type === "expense" ? "Review and manage all your spending." : "Search, filter, edit and manage your complete transaction history.", buttonAdd())}<div class="panel filters"><label>Search<input class="input-control" id="searchFilter" placeholder="Search title, note or category"></label><label>Month<input class="input-control" type="month" id="listMonth"></label><label>Category<select class="input-control" id="categoryFilter"><option value="">All categories</option>${[
    ...new Set(list.map((t) => t.category)),
  ]
    .sort()
    .map((c) => `<option>${esc(c)}</option>`)
    .join(
      "",
    )}</select></label>${!type ? `<label>Type<select class="input-control" id="typeFilter"><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>` : ""}<button class="button button-plain" id="clearFilters">Clear filters</button></div><section class="panel"><div class="panel-heading"><div><h2 id="listCount">${list.length} records</h2><p class="muted">Amounts are displayed in Indian Rupees (INR).</p></div><button class="button button-soft" id="exportCsv">Export CSV</button></div><div id="transactionTable">${table(list)}</div></section>`;
}
function budgetsPage() {
  const month = filterMonth,
    items = readBudgets().filter((b) => b.month === month),
    expenses = getAllTransactions().filter(
      (t) => t.type === "expense" && t.date.startsWith(month),
    );
  return `${heading("PLANNING", "Monthly budgets", "Set a spending limit for each category and monitor progress.")}<section class="panel budget-form-panel"><div class="panel-heading"><div><h2>Create or update a budget</h2><p class="muted">One budget per category for each month.</p></div></div><form id="budgetForm" class="inline-form"><label>Month<input class="input-control" type="month" name="month" value="${month}" required></label><label>Category<select class="input-control" name="category">${cats.expense.map((c) => `<option>${c}</option>`).join("")}</select></label><label>Monthly limit (₹)<input class="input-control" name="limit" type="number" min="0.01" step="0.01" required placeholder="e.g. 5000"></label><button class="button button-primary">Save budget</button></form></section><section class="panel"><div class="panel-heading"><div><h2>Budget overview</h2><p class="muted">${items.length} budgets · ${money(expenses.reduce((a, t) => a + t.amount, 0))} spent in ${month}</p></div><label class="compact-label">Month <input type="month" id="budgetMonth" class="select-control" value="${month}"></label></div>${
    items.length
      ? items
          .map((b) => {
            const s = expenses
              .filter((t) => t.category === b.category)
              .reduce((a, t) => a + t.amount, 0);
            return `<div class="budget-manage">${budgetRow(b, s)}<div class="budget-actions"><button class="button button-plain" data-budget-edit="${esc(b.id)}">Edit</button><button class="button button-plain danger-text" data-budget-delete="${esc(b.id)}">Delete</button></div></div>`;
          })
          .join("")
      : '<div class="empty-state"><div class="empty-icon">◎</div><strong>No budgets for this month</strong><p>Add a category limit above to start tracking.</p></div>'
  }</section>`;
}
function reportsPage() {
  const all = getAllTransactions(),
    m = all.filter((t) => t.date.startsWith(filterMonth)),
    inc = m
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amount, 0),
    exp = m
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amount, 0),
    groups = Object.entries(
      m
        .filter((t) => t.type === "expense")
        .reduce(
          (a, t) => ((a[t.category] = (a[t.category] || 0) + t.amount), a),
          {},
        ),
    ).sort((a, b) => b[1] - a[1]);
  return `${heading("ANALYTICS", "Reports & insights", "Understand where your money comes from and where it goes.")}<div class="filter-line"><label>Report month <input type="month" id="monthFilter" value="${filterMonth}" class="select-control"></label><button class="button button-soft" id="reportCsv">Download report CSV</button></div><div class="summary-grid">${summary("Income", money(inc), "Selected month", "↗", "income-symbol")}${summary("Expenses", money(exp), "Selected month", "↙", "expense-symbol")}${summary("Net cash flow", money(inc - exp), "Income minus expenses", "₹", "balance-symbol")}${summary("Savings rate", inc ? `${Math.round(((inc - exp) / inc) * 100)}%` : "—", "Net cash flow / income", "％", "budget-symbol")}</div><div class="content-grid"><section class="panel"><div class="panel-heading"><div><h2>Expense breakdown</h2><p class="muted">By category for ${filterMonth}</p></div></div>${groups.length ? groups.map(([c, v]) => `<div class="category-line"><div><span>${esc(c)}</span><strong>${money(v)}</strong></div><div class="progress-track"><i style="width:${(v / groups[0][1]) * 100}%"></i></div></div>`).join("") : '<div class="empty-inline">No expenses recorded in this month.</div>'}</section><section class="panel"><div class="panel-heading"><div><h2>Monthly summary</h2><p class="muted">Transaction totals</p></div></div><div class="insight-list"><div><span>Income transactions</span><strong>${m.filter((t) => t.type === "income").length}</strong></div><div><span>Expense transactions</span><strong>${m.filter((t) => t.type === "expense").length}</strong></div><div><span>Average daily expense</span><strong>${money(exp / new Date(Number(filterMonth.slice(0, 4)), Number(filterMonth.slice(5, 7)), 0).getDate())}</strong></div><div><span>Largest expense</span><strong>${money(Math.max(0, ...m.filter((t) => t.type === "expense").map((t) => t.amount)))}</strong></div></div></section></div><section class="panel"><div class="panel-heading"><div><h2>Transactions in this report</h2><p class="muted">${m.length} entries</p></div></div>${table(m, false)}</section>`;
}
function backupPage() {
  return `${heading("YOUR DATA", "Backup & restore", "Download a copy of your data or restore it on this browser.")}<div class="content-grid"><section class="panel backup-card"><div class="backup-icon">⤓</div><h2>Export full backup</h2><p class="muted">Download all transactions, budgets and settings as a JSON file. Keep this file somewhere safe.</p><button class="button button-primary" id="backupExport">Download JSON backup</button></section><section class="panel backup-card"><div class="backup-icon">⤒</div><h2>Restore from backup</h2><p class="muted">Choose a Finora JSON backup. Restoring replaces the current transactions and budgets in this browser.</p><input type="file" id="backupFile" accept="application/json,.json" class="input-control"><button class="button button-soft" id="backupImport">Restore selected backup</button></section></div><section class="panel"><h2>Export transaction history</h2><p class="muted">Create a spreadsheet-friendly CSV file containing all your transaction details.</p><button class="button button-soft" id="allCsv">Download all transactions CSV</button></section><section class="panel notice-panel"><strong>Important: where your data lives</strong><p>Finora stores information only in this browser's Local Storage. It is not synced to an online account. Clearing browser data, changing browsers or devices, or using a different site address can make these records unavailable. Export backups regularly.</p></section>`;
}
function render() {
  const root = $("#content");
  if (!root) return;
  root.innerHTML =
    page === "dashboard"
      ? dashboard()
      : ["income", "expenses", "transactions"].includes(page)
        ? transactionsPage(
            page === "income"
              ? "income"
              : page === "expenses"
                ? "expense"
                : null,
          )
        : page === "budgets"
          ? budgetsPage()
          : page === "reports"
            ? reportsPage()
            : backupPage();
  bindPage();
}
function toast(msg, error = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.className = `app-toast visible ${error ? "error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 3500);
}
function openModal(type = "expense", item = null) {
  editingId = item?.id || null;
  const f = $("#txForm");
  f.reset();
  f.elements.title.value = item?.title || "";
  f.elements.amount.value = item?.amount ?? "";
  f.elements.date.value = item?.date || today();
  f.elements.description.value = item?.description || "";
  setType(item?.type || type);
  if (item) f.elements.category.value = item.category;
  $("#modalTitle").textContent = item ? "Edit transaction" : "Add transaction";
  $("#txModal").showModal();
}
function setType(type) {
  $$(".type-option").forEach((b) =>
    b.classList.toggle("selected", b.dataset.type === type),
  );
  const sel = $("#txForm").elements.category,
    old = sel.value;
  sel.innerHTML = cats[type].map((c) => `<option>${c}</option>`).join("");
  if (cats[type].includes(old)) sel.value = old;
}
function download(name, content, mime) {
  const blob = new Blob([content], { type: mime }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function csv(items) {
  const cols = [
    "Title",
    "Type",
    "Category",
    "Amount (INR)",
    "Date",
    "Description",
    "Transaction ID",
    "Created At",
    "Last Updated",
  ];
  const quote = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    cols.map(quote).join(","),
    ...items.map((t) =>
      [
        t.title,
        t.type,
        t.category,
        Number(t.amount).toFixed(2),
        t.date,
        t.description,
        t.id,
        t.createdAt,
        t.updatedAt,
      ]
        .map(quote)
        .join(","),
    ),
  ].join("\r\n");
}
function bindPage() {
  $$("[data-add]").forEach((b) =>
    b.addEventListener("click", () =>
      openModal(page === "income" ? "income" : "expense"),
    ),
  );
  $$("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      const item = getAllTransactions().find((t) => t.id === b.dataset.edit);
      if (item) openModal(item.type, item);
    }),
  );
  $$("[data-delete]").forEach((b) =>
    b.addEventListener("click", () => {
      if (confirm("Delete this transaction permanently?"))
        try {
          deleteTransaction(b.dataset.delete);
          render();
          toast("Transaction deleted.");
        } catch (e) {
          toast(e.message, true);
        }
    }),
  );
  const mf = $("#monthFilter");
  if (mf)
    mf.addEventListener("change", () => {
      filterMonth = mf.value || today().slice(0, 7);
      render();
    });
  const bm = $("#budgetMonth");
  if (bm)
    bm.addEventListener("change", () => {
      filterMonth = bm.value || today().slice(0, 7);
      render();
    });
  const form = $("#budgetForm");
  if (form)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form),
        limit = Number(d.get("limit")),
        category = d.get("category"),
        month = d.get("month");
      if (!Number.isFinite(limit) || limit <= 0)
        return toast("Enter a valid budget amount.", true);
      const arr = readBudgets(),
        existing = editingBudgetId
          ? arr.find((b) => b.id === editingBudgetId)
          : arr.find((b) => b.month === month && b.category === category);
      if (existing) {
        existing.month = month;
        existing.category = category;
        existing.limit = Math.round(limit * 100) / 100;
      } else
        arr.push({
          id: `bud-${Date.now()}`,
          month,
          category,
          limit: Math.round(limit * 100) / 100,
          createdAt: new Date().toISOString(),
        });
      editingBudgetId = null;
      writeBudgets(arr);
      filterMonth = month;
      render();
      toast("Budget saved successfully.");
    });
  $$("[data-budget-delete]").forEach((b) =>
    b.addEventListener("click", () => {
      if (confirm("Delete this budget?")) {
        writeBudgets(
          readBudgets().filter((x) => x.id !== b.dataset.budgetDelete),
        );
        render();
        toast("Budget deleted.");
      }
    }),
  );
  $$("[data-budget-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      const x = readBudgets().find((v) => v.id === b.dataset.budgetEdit);
      if (x) {
        const f = $("#budgetForm");
        f.elements.month.value = x.month;
        f.elements.category.value = x.category;
        f.elements.limit.value = x.limit;
        editingBudgetId = x.id;
        f.querySelector("button[type=submit]").textContent = "Update budget";
        f.scrollIntoView({ behavior: "smooth" });
      }
    }),
  );
  const search = $("#searchFilter"),
    month = $("#listMonth"),
    cat = $("#categoryFilter"),
    typ = $("#typeFilter");
  [search, month, cat, typ]
    .filter(Boolean)
    .forEach((el) => el.addEventListener("input", filterTable));
  function filterTable() {
    let a = getAllTransactions().filter(
      (t) =>
        (!search ||
          `${t.title} ${t.description} ${t.category}`
            .toLowerCase()
            .includes(search.value.toLowerCase())) &&
        (!month || !month.value || t.date.startsWith(month.value)) &&
        (!cat || !cat.value || t.category === cat.value) &&
        (!typ || !typ.value || t.type === typ.value),
    );
    if (page === "income") a = a.filter((t) => t.type === "income");
    if (page === "expenses") a = a.filter((t) => t.type === "expense");
    $("#transactionTable").innerHTML = table(a);
    $("#listCount").textContent = `${a.length} records`;
    bindTableActions();
  }
  const clear = $("#clearFilters");
  if (clear)
    clear.addEventListener("click", () => {
      [search, month, cat, typ].filter(Boolean).forEach((x) => (x.value = ""));
      filterTable();
    });
  const exp = $("#exportCsv");
  if (exp)
    exp.addEventListener("click", () =>
      download(
        `${page}-finora-${today()}.csv`,
        "\ufeff" +
          csv(
            getAllTransactions().filter((t) =>
              page === "income"
                ? t.type === "income"
                : page === "expenses"
                  ? t.type === "expense"
                  : true,
            ),
          ),
        "text/csv;charset=utf-8",
      ),
    );
  const rc = $("#reportCsv");
  if (rc)
    rc.addEventListener("click", () =>
      download(
        `finora-report-${filterMonth}.csv`,
        "\ufeff" + csv(monthTransactions()),
        "text/csv;charset=utf-8",
      ),
    );
  const be = $("#backupExport");
  if (be)
    be.addEventListener("click", () =>
      download(
        `finora-backup-${today()}.json`,
        JSON.stringify(
          {
            app: "Finora",
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            transactions: getAllTransactions(),
            budgets: readBudgets(),
            settings: readSettings(),
          },
          null,
          2,
        ),
        "application/json",
      ),
    );
  const imp = $("#backupImport");
  if (imp)
    imp.addEventListener("click", async () => {
      const file = $("#backupFile").files[0];
      if (!file) return toast("Choose a JSON backup file first.", true);
      try {
        const data = JSON.parse(await file.text());
        if (data.app !== "Finora")
          throw new Error("This file is not a Finora backup.");
        if (
          !confirm(
            "Restore this backup? Current transactions and budgets will be replaced.",
          )
        )
          return;
        replaceAllData(data);
        toast("Backup restored successfully.");
        setTimeout(() => location.reload(), 600);
      } catch (e) {
        toast(e.message || "Could not restore this file.", true);
      }
    });
  const ac = $("#allCsv");
  if (ac)
    ac.addEventListener("click", () =>
      download(
        `finora-transactions-${today()}.csv`,
        "\ufeff" + csv(getAllTransactions()),
        "text/csv;charset=utf-8",
      ),
    );
}
function bindTableActions() {
  $$("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => {
      const x = getAllTransactions().find((t) => t.id === b.dataset.edit);
      if (x) openModal(x.type, x);
    }),
  );
  $$("[data-delete]").forEach((b) =>
    b.addEventListener("click", () => {
      if (confirm("Delete this transaction permanently?")) {
        deleteTransaction(b.dataset.delete);
        render();
        toast("Transaction deleted.");
      }
    }),
  );
}
function init() {
  document.body.innerHTML = shell();
  $("#menuToggle").addEventListener("click", () =>
    $("#sidebar").classList.toggle("open"),
  );
  $("#closeModal").addEventListener("click", () => $("#txModal").close());
  $("#cancelModal").addEventListener("click", () => $("#txModal").close());
  $$(".type-option").forEach((b) =>
    b.addEventListener("click", () => setType(b.dataset.type)),
  );
  $("#txForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!f.reportValidity()) return;
    const data = Object.fromEntries(new FormData(f));
    data.type = $(".type-option.selected").dataset.type;
    try {
      if (editingId) updateTransaction(editingId, data);
      else addTransaction(data);
      $("#txModal").close();
      render();
      toast(
        editingId ? "Transaction updated." : "Transaction saved successfully.",
      );
      editingId = null;
    } catch (err) {
      toast(err.message, true);
    }
  });
  render();
}
init();
