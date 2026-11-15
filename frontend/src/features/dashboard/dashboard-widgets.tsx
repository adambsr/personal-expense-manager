import {
  ArrowDownLeft,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  CircleDollarSign,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { DashboardSummary } from "@/features/dashboard/dashboard-api";
import { TransactionTable } from "@/features/transactions/transaction-table";
import {
  categoryColors,
  formatChartAxisCents,
  decimalToCents,
  formatChartCents,
  formatCashFlowMonthLabel,
  formatCashFlowWeekLabel,
  formatCurrency,
  formatMonth,
  formatMonthRange,
  formatPercentage,
} from "@/features/dashboard/dashboard-format";

type DashboardTotals = DashboardSummary["totals"];

const monthlySeriesColor = {
  income: "var(--chart-income)",
  expenses: "var(--chart-expense)",
};

export function SummaryCards({ totals }: { totals: DashboardTotals }) {
  const cards = [
    {
      label: "Net balance",
      amount: totals.balance,
      detail: "Income minus expenses",
      className: "balance-metric",
      icon: Wallet,
    },
    {
      label: "Total income",
      amount: totals.income,
      detail: "Income recorded this month",
      className: "income-metric",
      icon: ArrowDownLeft,
    },
    {
      label: "Total expenses",
      amount: totals.expenses,
      detail: "Expenses recorded this month",
      className: "expense-metric",
      icon: ArrowUpRight,
    },
  ];

  return (
    <section className="summary-grid" aria-label="Monthly totals">
      {cards.map(({ label, amount, detail, className, icon: Icon }) => (
        <Card className={`summary-card ${className}`} key={label}>
          <div className="metric-topline">
            <h2>{label}</h2>
            <span className="metric-icon" aria-hidden="true">
              <Icon size={19} strokeWidth={2.1} />
            </span>
          </div>
          <p className="metric-amount">{formatCurrency(amount)}</p>
          <div className="metric-detail">
            <span className="metric-detail-dot" aria-hidden="true" />
            <span>{detail}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="chart-empty">
      <ChartNoAxesColumnIncreasing size={25} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function MonthlyComparison({
  summary,
  chartMode,
  onChartModeChange,
}: {
  summary: DashboardSummary;
  chartMode: "weekly" | "monthly";
  onChartModeChange: (mode: "weekly" | "monthly") => void;
}) {
  const cashFlow = summary.cashFlow[chartMode];
  const selectedPeriod = chartMode === "weekly"
    ? formatMonth(summary.period.month, summary.period.year)
    : formatMonthRange(cashFlow.periodStart, cashFlow.periodEnd);
  const chartData = cashFlow.buckets.map((bucket) => ({
    label: chartMode === "weekly"
      ? formatCashFlowWeekLabel(bucket.periodStart, bucket.periodEnd)
      : formatCashFlowMonthLabel(bucket.periodStart),
    income: decimalToCents(bucket.income),
    expenses: decimalToCents(bucket.expenses),
  }));
  const hasActivity = chartData.some((item) => item.income > 0 || item.expenses > 0);

  return (
    <Card className="panel comparison-panel">
      <div className="panel-header">
        <div>
          <h2>Income vs Expenses</h2>
          <p>{chartMode === "weekly" ? "Weekly totals" : "Monthly totals"} in TND · {selectedPeriod}</p>
        </div>
        <ToggleGroup
          aria-label="Income and expenses chart period"
          className="comparison-period-toggle"
          value={[chartMode]}
          onValueChange={(value) => {
            const selectedMode = value[0];
            if (selectedMode === "weekly" || selectedMode === "monthly") onChartModeChange(selectedMode);
          }}
        >
          <Toggle value="weekly" className={`comparison-period-option${chartMode === "weekly" ? " active" : ""}`}>Weekly</Toggle>
          <Toggle value="monthly" className={`comparison-period-option${chartMode === "monthly" ? " active" : ""}`}>Monthly</Toggle>
        </ToggleGroup>
      </div>

      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="legend-dot legend-income" />Income</span>
        <span><i className="legend-dot legend-expense" />Expenses</span>
      </div>

      {hasActivity ? (
        <div className="comparison-chart" role="img" aria-label={`Income and expenses by ${chartMode} for ${selectedPeriod}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--chart-axis)", fontSize: chartMode === "monthly" ? 10 : 11, fontFamily: "Inter Variable, sans-serif" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={formatChartAxisCents}
                tick={{ fill: "var(--chart-axis)", fontSize: 11, fontFamily: "Inter Variable, sans-serif" }}
                width={86}
              />
              <Tooltip
                cursor={{ fill: "rgba(148, 163, 184, .12)" }}
                labelFormatter={(label) => String(label)}
                formatter={(value, name) => [formatChartCents(Number(value)), String(name)]}
                contentStyle={{
                  border: "1px solid var(--chart-tooltip-border, #e2e8f0)",
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(15, 23, 42, .08)",
                  backgroundColor: "var(--chart-tooltip-background, #fff)",
                  color: "var(--chart-tooltip-foreground, #182033)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="income" name="Income" fill={monthlySeriesColor.income} radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
              <Bar dataKey="expenses" name="Expenses" fill={monthlySeriesColor.expenses} radius={[5, 5, 0, 0]} maxBarSize={42} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message={`No income or expenses recorded for ${selectedPeriod}.`} />
      )}

      <div className="chart-footnote">
        <CircleDollarSign size={17} aria-hidden="true" />
        <span>{chartMode === "weekly" ? "Weekly totals include transactions recorded within the selected month." : "Monthly totals cover the 12 months ending with the selected month."}</span>
      </div>
    </Card>
  );
}

function ExpenseCategories({ summary }: { summary: DashboardSummary }) {
  const data = summary.expensesByCategory.map((category) => ({
    ...category,
    cents: decimalToCents(category.total),
  }));
  const hasExpenses = data.some((category) => category.cents > 0);
  const totalCents = decimalToCents(summary.totals.expenses);

  return (
    <Card className="panel category-panel">
      <div className="panel-header">
        <div>
          <h2>Expense Categories</h2>
          <p>Spending distribution by category</p>
        </div>
        <span className="panel-heading-icon" aria-hidden="true"><ChartNoAxesColumnIncreasing size={18} /></span>
      </div>

      {hasExpenses ? (
        <>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="cents"
                  nameKey="categoryName"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((category, index) => (
                    <Cell key={category.categoryId} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    const category = payload?.[0]?.payload as (typeof data)[number] | undefined;
                    if (!active || !category) return null;

                    return (
                      <div className="category-chart-tooltip">
                        <span><i style={{ backgroundColor: payload[0]?.color }} aria-hidden="true" />{category.categoryName}</span>
                        <strong>{formatChartCents(category.cents)}</strong>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center" aria-hidden="true">
              <span>Total spent</span>
              <strong>{formatCurrency(summary.totals.expenses)}</strong>
            </div>
          </div>
          <ul className="category-breakdown" aria-label="Expenses by category">
            {data.map((category, index) => (
              <li key={category.categoryId}>
                <span className="category-label">
                  <i style={{ backgroundColor: categoryColors[index % categoryColors.length] }} aria-hidden="true" />
                  <span>{category.categoryName}</span>
                </span>
                <span className="category-amount">{formatCurrency(category.total)}</span>
                <span className="category-share">{formatPercentage(category.cents, totalCents)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="category-empty">
          <span className="category-empty-ring" aria-hidden="true"><ChartNoAxesColumnIncreasing size={22} /></span>
          <p>No expenses recorded for this month.</p>
        </div>
      )}
    </Card>
  );
}

function RecentTransactionTable({ transactions }: { transactions: DashboardSummary["recentTransactions"] }) {
  if (transactions.length === 0) {
    return (
      <div className="transactions-empty">
        <ReceiptText size={24} aria-hidden="true" />
        <p>No transactions recorded for this month yet.</p>
      </div>
    );
  }

  return <TransactionTable transactions={transactions} />;
}

export function DashboardCharts({
  summary,
  cashFlowMode,
  onCashFlowModeChange,
}: {
  summary: DashboardSummary;
  cashFlowMode: "weekly" | "monthly";
  onCashFlowModeChange: (mode: "weekly" | "monthly") => void;
}) {
  return (
    <section className="analytics-grid" aria-label="Monthly financial analysis">
      <MonthlyComparison summary={summary} chartMode={cashFlowMode} onChartModeChange={onCashFlowModeChange} />
      <ExpenseCategories summary={summary} />
    </section>
  );
}

export function RecentTransactions({
  transactions,
}: {
  transactions: DashboardSummary["recentTransactions"];
}) {
  return (
    <Card className="panel recent-panel">
      <div className="panel-header recent-header">
        <div>
          <h2>Recent Transactions</h2>
          <p>Latest activity for the selected month</p>
        </div>
        <span className="recent-count">{transactions.length} {transactions.length === 1 ? "transaction" : "transactions"}</span>
      </div>
      <RecentTransactionTable transactions={transactions} />
    </Card>
  );
}
