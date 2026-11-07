import { readTransactions, writeTransactions } from "./storage.js";
const id = () =>
  globalThis.crypto?.randomUUID?.() ||
  `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function validateTransaction(x) {
  const title = String(x.title || "").trim(),
    amount = Number(x.amount),
    type = x.type,
    category = String(x.category || "").trim(),
    date = String(x.date || "");
  if (!title || title.length > 80)
    throw new Error("Enter a title (maximum 80 characters).");
  if (!Number.isFinite(amount) || amount <= 0)
    throw new Error("Amount must be greater than zero.");
  if (!["income", "expense"].includes(type))
    throw new Error("Choose income or expense.");
  if (!category) throw new Error("Choose a category.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(new Date(`${date}T00:00:00`).getTime())
  )
    throw new Error("Choose a valid date.");
  return {
    title,
    amount: Math.round(amount * 100) / 100,
    type,
    category,
    date,
    description: String(x.description || "")
      .trim()
      .slice(0, 500),
  };
}
export function getAllTransactions() {
  return readTransactions().sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}
export function addTransaction(input) {
  const now = new Date().toISOString(),
    item = {
      ...validateTransaction(input),
      id: id(),
      createdAt: now,
      updatedAt: now,
    };
  writeTransactions([item, ...readTransactions()]);
  return item;
}
export function updateTransaction(txId, changes) {
  const all = readTransactions(),
    i = all.findIndex((x) => x.id === txId);
  if (i < 0) throw new Error("Transaction not found.");
  all[i] = {
    ...all[i],
    ...validateTransaction({ ...all[i], ...changes }),
    updatedAt: new Date().toISOString(),
  };
  writeTransactions(all);
  return all[i];
}
export function deleteTransaction(txId) {
  const all = readTransactions(),
    next = all.filter((x) => x.id !== txId);
  if (next.length === all.length) throw new Error("Transaction not found.");
  writeTransactions(next);
}
