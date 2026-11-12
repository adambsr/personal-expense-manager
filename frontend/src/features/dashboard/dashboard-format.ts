const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const cashFlowWeekStartFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const cashFlowWeekEndFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  timeZone: "UTC",
});

const cashFlowMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const categoryColors = [
  "#2a14b4",
  "#f59e0b",
  "#0ea5e9",
  "#10b981",
  "#94a3b8",
  "#a855f7",
  "#e11d48",
  "#14b8a6",
];

export function monthInputValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonth(month: number, year: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatMonthRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const startLabel = formatMonth(start.getUTCMonth() + 1, start.getUTCFullYear());
  const endLabel = formatMonth(end.getUTCMonth() + 1, end.getUTCFullYear());
  return `${startLabel} – ${endLabel}`;
}

export function formatCashFlowWeekLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const startLabel = cashFlowWeekStartFormatter.format(start);
  if (startDate === endDate) return startLabel;
  return `${startLabel}–${cashFlowWeekEndFormatter.format(end)}`;
}

export function formatCashFlowMonthLabel(startDate: string): string {
  return cashFlowMonthFormatter.format(new Date(`${startDate}T00:00:00.000Z`));
}

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export type CurrencyPolarity = "INCOME" | "EXPENSE" | "NEUTRAL";

export function formatCurrency(amount: string, polarity: CurrencyPolarity = "NEUTRAL"): string {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(amount);
  if (!match) return "TND 0.00";

  const [, sign, whole, cents] = match;
  const isNegative = sign === "-" || polarity === "EXPENSE";
  const prefix = isNegative ? "\u2212 " : polarity === "INCOME" ? "+ " : "";
  return `${prefix}TND ${integerFormatter.format(BigInt(whole))}.${cents}`;
}

export function decimalToCents(amount: string): number {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(amount);
  if (!match) return 0;

  const [, sign, whole, cents] = match;
  const absoluteCents = BigInt(whole) * 100n + BigInt(cents);
  return Number(sign ? -absoluteCents : absoluteCents);
}

export function formatChartCents(value: number): string {
  if (!Number.isFinite(value)) return formatCurrency("0.00");

  const roundedCents = BigInt(Math.round(value));
  const isNegative = roundedCents < 0n;
  const absoluteCents = isNegative ? -roundedCents : roundedCents;
  const decimalAmount = `${absoluteCents / 100n}.${(absoluteCents % 100n).toString().padStart(2, "0")}`;
  return formatCurrency(isNegative ? `-${decimalAmount}` : decimalAmount);
}

export function formatChartAxisCents(value: number): string {
  return formatChartCents(value).replace(/^TND\s+/, "");
}

export function formatPercentage(amountCents: number, totalCents: number): string {
  const amount = BigInt(Math.round(amountCents));
  const total = BigInt(Math.round(totalCents));
  if (total <= 0n) return "0.0%";

  const tenthsOfPercent = (amount * 1000n + total / 2n) / total;
  return `${tenthsOfPercent / 10n}.${tenthsOfPercent % 10n}%`;
}
