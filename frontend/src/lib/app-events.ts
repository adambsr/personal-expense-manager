export const TRANSACTIONS_CHANGED_EVENT = "transactions:changed";

export function notifyTransactionsChanged(): void {
  window.dispatchEvent(new Event(TRANSACTIONS_CHANGED_EVENT));
}
