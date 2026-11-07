export const STORAGE_KEYS = {
  transactions: "expense_transactions",
  budgets: "expense_budgets",
  settings: "expense_settings",
  version: "expense_app_version",
};
const defaults = {
  transactions: [],
  budgets: [],
  settings: { currency: "INR", currencySymbol: "₹", dateFormat: "en-IN" },
};
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? structuredClone(fallback) : JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Unable to read ${key}. Your saved data may be damaged. Export or inspect your browser storage before clearing it.`,
    );
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e.name === "QuotaExceededError")
      throw new Error(
        "Browser storage is full. Export a backup and remove some old data.",
      );
    throw new Error(
      "Could not save data to browser Local Storage. Check browser storage permissions.",
    );
  }
}
export function initializeStorage() {
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    if (localStorage.getItem(key) === null)
      write(key, name === "version" ? 1 : (defaults[name] ?? 1));
  }
  return true;
}
export const readTransactions = () => read(STORAGE_KEYS.transactions, []);
export const writeTransactions = (v) => write(STORAGE_KEYS.transactions, v);
export const readBudgets = () => read(STORAGE_KEYS.budgets, []);
export const writeBudgets = (v) => write(STORAGE_KEYS.budgets, v);
export const readSettings = () =>
  read(STORAGE_KEYS.settings, defaults.settings);
export const writeSettings = (v) => write(STORAGE_KEYS.settings, v);
export function getStorageInfo() {
  return Object.fromEntries(
    Object.entries(STORAGE_KEYS).map(([k, v]) => [
      k,
      localStorage.getItem(v) !== null,
    ]),
  );
}
export function replaceAllData(data) {
  if (
    !data ||
    !Array.isArray(data.transactions) ||
    !Array.isArray(data.budgets)
  )
    throw new Error("This backup file is not a valid Finora backup.");
  writeTransactions(data.transactions);
  writeBudgets(data.budgets);
  if (data.settings) writeSettings(data.settings);
}
