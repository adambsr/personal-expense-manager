import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "@/features/dashboard/dashboard-api";
import {
  DashboardCharts,
  RecentTransactions,
  SummaryCards,
} from "@/features/dashboard/dashboard-widgets";
import { formatMonth, monthInputValue } from "@/features/dashboard/dashboard-format";
import { TRANSACTIONS_CHANGED_EVENT } from "@/lib/app-events";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import "../../App.css";

type LoadResult =
  | { requestKey: string; periodKey: string; status: "ready"; summary: DashboardSummary }
  | { requestKey: string; periodKey: string; status: "error"; message: string };

function currentMonthValue(): string {
  const now = new Date();
  return monthInputValue(now.getFullYear(), now.getMonth() + 1);
}

function monthParts(value: string): { month: number; year: number } {
  const [year, month] = value.split("-").map(Number);
  return { month, year };
}

function shiftMonth(value: string, offset: number): string {
  const { month, year } = monthParts(value);
  const date = new Date(year, month - 1 + offset, 1);
  return monthInputValue(date.getFullYear(), date.getMonth() + 1);
}

function DashboardHeader({
  monthValue,
  onMonthChange,
}: {
  monthValue: string;
  onMonthChange: (value: string) => void;
}) {
  const { month, year } = monthParts(monthValue);

  return (
    <header className="page-header">
      <div className="page-heading">
        <h1>Financial Overview</h1>
        <p>Track your income, expenses, and financial activity.</p>
      </div>
      <div className="month-controls" aria-label="Choose dashboard month">
        <Button
          className="month-stepper"
          variant="ghost"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonth(monthValue, -1))}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <label className="month-picker">
          <span className="sr-only">Choose the dashboard month and year.</span>
          <CalendarDays className="month-picker-icon" size={16} aria-hidden="true" />
          <input
            type="month"
            value={monthValue}
            onChange={(event) => onMonthChange(event.target.value)}
            aria-label="Dashboard month and year"
            aria-describedby="dashboard-month-picker-help"
          />
          <span className="month-picker-label">{formatMonth(month, year)}</span>
          <ChevronDown size={15} className="month-picker-caret" aria-hidden="true" />
        </label>
        <span id="dashboard-month-picker-help" className="sr-only">Use the month picker or the adjacent previous and next month buttons.</span>
        <Button
          className="month-stepper"
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(monthValue, 1))}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-content" aria-label="Loading dashboard" aria-busy="true" role="status">
      <div className="summary-grid">
        {[0, 1, 2].map((item) => (
          <Card className="summary-card loading-card" key={item}>
            <Skeleton className="loading-line loading-label" />
            <Skeleton className="loading-line loading-value" />
            <Skeleton className="loading-line loading-footer" />
          </Card>
        ))}
      </div>
      <div className="analytics-grid">
        <Card className="panel loading-panel"><Skeleton className="loading-section-title" /><Skeleton className="loading-chart" /></Card>
        <Card className="panel loading-panel"><Skeleton className="loading-section-title" /><Skeleton className="loading-chart" /></Card>
      </div>
      <Card className="panel loading-table"><Skeleton className="loading-section-title" />{[0, 1, 2].map((item) => <Skeleton className="loading-row" key={item} />)}</Card>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="dashboard-message" role="alert">
      <span className="message-icon" aria-hidden="true">
        <BadgeDollarSign size={23} />
      </span>
      <div>
        <h2>We couldn’t load your overview</h2>
        <p>{message}</p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        Try again <ArrowRight aria-hidden="true" />
      </Button>
    </Card>
  );
}

function DashboardContent({
  summary,
  cashFlowMode,
  onCashFlowModeChange,
}: {
  summary: DashboardSummary;
  cashFlowMode: "weekly" | "monthly";
  onCashFlowModeChange: (mode: "weekly" | "monthly") => void;
}) {
  return (
    <div className="dashboard-content">
      <SummaryCards totals={summary.totals} />
      <DashboardCharts summary={summary} cashFlowMode={cashFlowMode} onCashFlowModeChange={onCashFlowModeChange} />
      <RecentTransactions transactions={summary.recentTransactions} />
    </div>
  );
}

export default function DashboardPage() {
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [cashFlowMode, setCashFlowMode] = useState<"weekly" | "monthly">("monthly");
  const [loadResult, setLoadResult] = useState<LoadResult>();
  const [retryKey, setRetryKey] = useState(0);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const { month, year } = monthParts(monthValue);
  const periodKey = `${year}-${month}`;
  const requestKey = `${year}-${month}-${retryKey}-${transactionRefresh}`;

  useEffect(() => {
    const refreshDashboard = () => setTransactionRefresh((current) => current + 1);
    window.addEventListener(TRANSACTIONS_CHANGED_EVENT, refreshDashboard);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED_EVENT, refreshDashboard);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    getDashboardSummary(month, year, controller.signal)
      .then((result) => {
        setLoadResult({ requestKey, periodKey, status: "ready", summary: result });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadResult({
          requestKey,
          periodKey,
          status: "error",
          message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        });
      });

    return () => controller.abort();
  }, [month, periodKey, requestKey, year]);

  const currentResult = loadResult?.requestKey === requestKey ? loadResult : undefined;
  const readyForPeriod = loadResult?.periodKey === periodKey && loadResult.status === "ready"
    ? loadResult
    : undefined;

  function retry() {
    setRetryKey((key) => key + 1);
  }

  return (
    <div className="app-shell">
      <DashboardSidebar />
      <main className="dashboard-main">
        <DashboardHeader monthValue={monthValue} onMonthChange={setMonthValue} />
        {!readyForPeriod && !currentResult ? <DashboardLoading /> : null}
        {currentResult?.status === "error" && !readyForPeriod ? (
          <DashboardError message={currentResult.message} onRetry={retry} />
        ) : null}
        {readyForPeriod ? (
          <DashboardContent
            summary={readyForPeriod.summary}
            cashFlowMode={cashFlowMode}
            onCashFlowModeChange={setCashFlowMode}
          />
        ) : null}
        {/* <footer className="page-footer">
          <span>Personal Expense Manager</span>
          <span className="footer-divider" aria-hidden="true">·</span>
          <span>{formatMonth(month, year)} overview</span>
          <span className="footer-spacer" />
        </footer> */}
      </main>
    </div>
  );
}
