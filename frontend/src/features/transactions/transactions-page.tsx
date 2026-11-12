import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { ArrowDownLeft, ArrowDownWideNarrow, ArrowUpRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, Plus, ReceiptText, RefreshCw, Repeat, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardReturnLink } from "@/components/dashboard-return-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import { formatCurrency } from "@/features/dashboard/dashboard-format";
import { TransactionTable } from "@/features/transactions/transaction-table";
import {
  listCategories,
  listTransactions,
  removeTransaction,
  saveTransaction,
  type Category,
  type RecurrenceFrequency,
  type Transaction,
  type TransactionSort,
  type TransactionSummary,
  type TransactionType,
} from "./transactions-api";
import { CategoryIcon } from "./category-presentation";
import "../../App.css";

const PAGE_SIZE = 10;
function isPositiveAmount(value: string): boolean {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")) > 0n;
}

const transactionFormSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.uuid("Choose a category."),
  amount: z.string()
    .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, "Enter a positive amount with up to two decimal places.")
    .refine(isPositiveAmount, "Amount must be greater than zero."),
  description: z.string().trim().max(500, "Description must be 500 characters or fewer."),
  occurredAt: z.iso.date("Choose a valid date."),
  recurrenceFrequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).nullable(),
});
type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionResult {
  rows: Transaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: TransactionSummary;
}

interface TransactionFiltersState {
  search: string;
  categoryId: string;
  type: "" | TransactionType;
  startDate: string;
  endDate: string;
  sort: TransactionSort;
}

const DEFAULT_FILTERS: TransactionFiltersState = {
  search: "",
  categoryId: "",
  type: "",
  startDate: "",
  endDate: "",
  sort: "DATE_DESC",
};

function CategoryMenu({
  categories,
  value,
  onChange,
  allLabel,
}: {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  allLabel?: string;
}) {
  const selectedCategory = categories.find((category) => category.id === value);
  const label = selectedCategory?.name ?? allLabel ?? "Choose a category";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="transaction-category-trigger" aria-label={`Category: ${label}`}>
        {selectedCategory ? <CategoryIcon name={selectedCategory.name} /> : <span className="transaction-category-trigger-icon"><ReceiptText aria-hidden="true" /></span>}
        <span className="transaction-category-trigger-label">{label}</span>
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="transaction-category-menu">
        {allLabel ? <DropdownMenuItem onClick={() => onChange("")}>
          <span className="transaction-category-trigger-icon"><ReceiptText aria-hidden="true" /></span>{allLabel}
        </DropdownMenuItem> : null}
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} onClick={() => onChange(category.id)}>
            <CategoryIcon name={category.name} />{category.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DateRangeFilter({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
}) {
  function formatRangeDate(value: string) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${value}T00:00:00Z`));
  }

  const rangeLabel = startDate && endDate
    ? `${formatRangeDate(startDate)} – ${formatRangeDate(endDate)}`
    : startDate
      ? `From ${formatRangeDate(startDate)}`
      : endDate
        ? `Through ${formatRangeDate(endDate)}`
        : "Date range";

  return (
    <details className="transaction-date-range">
      <summary aria-label={`Choose date range${startDate || endDate ? `, ${rangeLabel}` : ""}`}>
        <CalendarDays aria-hidden="true" />
        <span>{rangeLabel}</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div className="transaction-date-range-popover">
        <div><strong>Date range</strong><span>Filter transactions by date</span></div>
        <label><span>Start date</span><Input type="date" max={endDate || undefined} value={startDate} onChange={(event) => onChange(event.target.value, endDate && event.target.value > endDate ? "" : endDate)} /></label>
        <label><span>End date</span><Input type="date" min={startDate || undefined} value={endDate} onChange={(event) => onChange(startDate, event.target.value)} /></label>
        {startDate || endDate ? <button type="button" onClick={() => onChange("", "")}><X aria-hidden="true" />Clear dates</button> : null}
      </div>
    </details>
  );
}


function localDateValue(value?: string): string {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function apiDateValue(date: string): string {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
}

function addQuickAmount(amount: string, quickAmount: string): string {
  if (!amount.trim()) return `${quickAmount}.00`;
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(amount)) return amount;

  const [whole = "0", fraction = ""] = amount.split(".");
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")) + BigInt(quickAmount) * 100n;
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

function recurrenceLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case "WEEKLY": return "Weekly";
    case "MONTHLY": return "Monthly";
    case "YEARLY": return "Yearly";
  }
}

function TransactionForm({
  categories,
  transaction,
  saving,
  error,
  onSave,
  onCancel,
}: {
  categories: Category[];
  transaction: Transaction | null;
  saving: boolean;
  error: string | null;
  onSave: (values: TransactionFormValues, addAnother: boolean) => Promise<boolean>;
  onCancel: () => void;
}) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: transaction?.type ?? "EXPENSE",
      categoryId: transaction?.categoryId ?? "",
      amount: transaction?.amount ?? "",
      description: transaction?.description ?? "",
      occurredAt: localDateValue(transaction?.occurredAt),
      recurrenceFrequency: transaction?.recurrenceFrequency ?? null,
    },
  });
  const type = useWatch({ control: form.control, name: "type" }) ?? "EXPENSE";
  const categoryId = useWatch({ control: form.control, name: "categoryId" }) ?? "";
  const amount = useWatch({ control: form.control, name: "amount" }) ?? "";
  const recurrenceFrequency = useWatch({ control: form.control, name: "recurrenceFrequency" }) ?? null;
  const eligibleCategories = categories.filter((category) => category.type === type);

  useEffect(() => {
    if (!transaction) return;
    form.reset({
      type: transaction.type,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      description: transaction.description ?? "",
      occurredAt: localDateValue(transaction.occurredAt),
      recurrenceFrequency: transaction.recurrenceFrequency,
    });
  }, [form, transaction]);

  function changeType(value: string[]) {
    const nextType = value[0];
    if (nextType !== "INCOME" && nextType !== "EXPENSE") return;
    if (nextType === type) return;

    form.setValue("type", nextType);
    // Changing the transaction type clears the incompatible category, but should
    // not show a validation error until the user submits the form.
    form.setValue("categoryId", "");
  }

  async function save(values: TransactionFormValues, addAnother: boolean) {
    const saved = await onSave(values, addAnother);
    if (!saved || !addAnother) return;

    form.reset({
      type: values.type,
      categoryId: values.categoryId,
      amount: "",
      description: "",
      occurredAt: localDateValue(),
      recurrenceFrequency: null,
    });
  }

  const categoryError = form.formState.errors.categoryId?.message;
  const amountError = form.formState.errors.amount?.message;
  const descriptionError = form.formState.errors.description?.message;
  const dateError = form.formState.errors.occurredAt?.message;
  const selectedFrequency = recurrenceFrequency ?? "MONTHLY";

  return (
    <form className="transaction-form" onSubmit={form.handleSubmit((values) => save(values, false))} noValidate>
      <ToggleGroup aria-label="Transaction type" className="transaction-type-segmented" value={[type]} onValueChange={changeType}>
        <Toggle value="EXPENSE" className={`transaction-type-choice transaction-type-expense ${type === "EXPENSE" ? "selected" : ""}`}>
          <span className="transaction-type-icon expense"><ArrowUpRight aria-hidden="true" /></span>
          <span><strong>Expense</strong><small>Money spent</small></span>
        </Toggle>
        <Toggle value="INCOME" className={`transaction-type-choice transaction-type-income ${type === "INCOME" ? "selected" : ""}`}>
          <span className="transaction-type-icon income"><ArrowDownLeft aria-hidden="true" /></span>
          <span><strong>Income</strong><small>Money received</small></span>
        </Toggle>
      </ToggleGroup>

      <div className="transaction-amount-entry">
        <div className="transaction-amount-entry-heading"><Label htmlFor="transaction-amount">Amount</Label><span>TND</span></div>
        <div className="transaction-amount-entry-input"><span aria-hidden="true">TND</span><Input id="transaction-amount" inputMode="decimal" placeholder="0.00" aria-invalid={Boolean(amountError)} {...form.register("amount")} /><Button type="button" variant="ghost" size="icon-sm" aria-label="Clear amount" title="Clear amount" onClick={() => form.setValue("amount", "", { shouldValidate: true })} disabled={!amount}><X aria-hidden="true" /></Button></div>
        {amountError ? <p className="transaction-field-error">{amountError}</p> : null}
        <div className="transaction-quick-amounts" aria-label="Quick add amount">
          {["10", "25", "50", "100"].map((quickAmount) => <Button key={quickAmount} type="button" variant="outline" onClick={() => form.setValue("amount", addQuickAmount(amount, quickAmount), { shouldValidate: true })}>+{quickAmount}</Button>)}
        </div>
      </div>

      <div className="transaction-details-grid transaction-category-date-grid">
        <div className="transaction-form-field">
          <Label htmlFor="transaction-category">Category</Label>
          <CategoryMenu categories={eligibleCategories} value={categoryId} onChange={(value) => form.setValue("categoryId", value, { shouldValidate: true })} />
          {categoryError ? <p className="transaction-field-error">{categoryError}</p> : null}
        </div>
        <div className="transaction-form-field">
          <Label htmlFor="transaction-date">Date</Label>
          <div className="transaction-date-input"><CalendarDays aria-hidden="true" /><Input id="transaction-date" type="date" aria-invalid={Boolean(dateError)} {...form.register("occurredAt")} onClick={(event) => {
            const input = event.currentTarget;
            if (typeof input.showPicker === "function") input.showPicker();
          }} /></div>
          {dateError ? <p className="transaction-field-error">{dateError}</p> : null}
        </div>
      </div>
      <div className="transaction-form-field transaction-notes-field">
        <Label htmlFor="transaction-description">Notes / Description <span className="transaction-optional">Optional</span></Label>
        <Input id="transaction-description" maxLength={500} placeholder="What was this for?" aria-invalid={Boolean(descriptionError)} {...form.register("description")} />
        {descriptionError ? <p className="transaction-field-error">{descriptionError}</p> : null}
      </div>

      <section className="transaction-recurring-section" aria-label="Recurring transaction settings">
        <div className="transaction-recurring-row">
          <span className="transaction-recurring-icon"><Repeat aria-hidden="true" /></span>
          <span className="transaction-recurring-copy"><strong>Recurring transaction</strong><small>Save a schedule for future entries</small></span>
          <Switch.Root aria-label="Recurring transaction" checked={recurrenceFrequency !== null} disabled={saving} onCheckedChange={(checked) => form.setValue("recurrenceFrequency", checked ? selectedFrequency : null, { shouldValidate: true })} className="transaction-switch"><Switch.Thumb className="transaction-switch-thumb" /></Switch.Root>
        </div>
        {recurrenceFrequency !== null ? (
          <div className="transaction-recurring-settings">
            <Label htmlFor="transaction-frequency">Repeat</Label>
            <Select value={selectedFrequency} onValueChange={(value) => {
              if (value === "WEEKLY" || value === "MONTHLY" || value === "YEARLY") {
                form.setValue("recurrenceFrequency", value, { shouldValidate: true });
              }
            }}>
              <SelectTrigger id="transaction-frequency" aria-label="Recurrence frequency" className="transaction-frequency-select"><SelectValue>{recurrenceLabel(selectedFrequency)}</SelectValue></SelectTrigger>
              <SelectContent align="start"><SelectGroup>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
            <p>One transaction will be saved now. Future entries will not be created automatically.</p>
          </div>
        ) : null}
      </section>

      {error ? <p className="transaction-alert" role="alert">{error}</p> : null}
      <DialogFooter className="transaction-dialog-footer">
        {!transaction ? <Button type="button" variant="outline" onClick={form.handleSubmit((values) => save(values, true))} disabled={saving}>
          {saving ? <LoaderCircle className="transaction-spin" aria-hidden="true" /> : null}Save &amp; Add Another
        </Button> : null}
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <LoaderCircle className="transaction-spin" aria-hidden="true" /> : null}
          {transaction ? "Save changes" : "Save Transaction"}
        </Button>
      </DialogFooter>
    </form>
  );
}
export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [result, setResult] = useState<(TransactionResult & { requestKey: string })>();
  const [listError, setListError] = useState<{ requestKey: string; message: string }>();
  const [filters, setFilters] = useState<TransactionFiltersState>(DEFAULT_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listCategories(controller.signal)
      .then(setCategories)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setCategoryError(error instanceof Error ? error.message : "Categories could not be loaded.");
      })
      .finally(() => { if (!controller.signal.aborted) setCategoryLoading(false); });
    return () => controller.abort();
  }, [categoryRetry]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => current.search === searchDraft ? current : { ...current, search: searchDraft });
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchDraft]);

  const requestKey = JSON.stringify([filters, page, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    listTransactions({ ...filters, page, limit: PAGE_SIZE }, controller.signal)
      .then((response) => setResult({ requestKey, rows: response.transactions, ...response.pagination, summary: response.summary }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setListError({
          requestKey,
          message: error instanceof Error ? error.message : "Transactions could not be loaded.",
        });
      })
      ;
    return () => controller.abort();
  }, [filters, page, refresh, requestKey]);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const categoryNames = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  // Keep the last completed page visible while the next filter request is in flight.
  const currentPage = result;
  const currentError = listError?.requestKey === requestKey ? listError.message : null;
  const loading = !result && !currentError;

  function updateFilter<Key extends keyof TransactionFiltersState>(name: Key, value: TransactionFiltersState[Key]) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setMutationError(null);
    setDialogOpen(true);
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction);
    setMutationError(null);
    setDialogOpen(true);
  }

  async function handleSave(values: TransactionFormValues, addAnother: boolean): Promise<boolean> {
    if (saveLockRef.current) return false;
    saveLockRef.current = true;
    setSaving(true);
    setMutationError(null);
    try {
      await saveTransaction({
        ...values,
        amount: values.amount.includes(".") ? values.amount.padEnd(values.amount.indexOf(".") + 3, "0") : `${values.amount}.00`,
        description: values.description.trim() || null,
        occurredAt: apiDateValue(values.occurredAt),
      }, editing?.id);
      if (!addAnother) setDialogOpen(false);
      setPage(1);
      setRefresh((value) => value + 1);
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "The transaction could not be saved.");
      return false;
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }
  }

  async function handleDelete(transaction: Transaction) {
    const label = transaction.description?.trim() || categoryNames.get(transaction.categoryId) || "this transaction";
    if (!window.confirm(`Delete “${label}”? This action cannot be undone.`)) return;
    setDeletingId(transaction.id);
    try {
      await removeTransaction(transaction.id);
      if (currentPage?.rows.length === 1 && page > 1) setPage((value) => value - 1);
      setRefresh((value) => value + 1);
    } catch (error) {
      setListError({ requestKey, message: error instanceof Error ? error.message : "The transaction could not be deleted." });
    } finally {
      setDeletingId(null);
    }
  }

  const matchingCategories = categories.filter((category) => !filters.type || category.type === filters.type);
  const activeFilterCount = [filters.search, filters.categoryId, filters.type, filters.startDate, filters.endDate].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const currentCategory = categoryById.get(filters.categoryId);
  const canAdd = !categoryLoading && !categoryError;
  const summaryCards = [
    // { title: "Activity volume", amount: currentPage?.summary.activity.total, count: currentPage?.summary.activity.count, icon: Activity, tone: "activity", polarity: "NEUTRAL" as const, detail: "Across all transactions" },
    { title: "Total inflows", amount: currentPage?.summary.income.total, count: currentPage?.summary.income.count, icon: ArrowDownLeft, tone: "income", polarity: "INCOME" as const, detail: "Income transactions" },
    { title: "Total outflows", amount: currentPage?.summary.expenses.total, count: currentPage?.summary.expenses.count, icon: ArrowUpRight, tone: "expense", polarity: "EXPENSE" as const, detail: "Expense transactions" },
  ];

  function changeTypeFilter(type: TransactionFiltersState["type"]) {
    setFilters((current) => ({
      ...current,
      type,
      categoryId: current.categoryId && !categories.some((category) => category.id === current.categoryId && (!type || category.type === type))
        ? ""
        : current.categoryId,
    }));
    setPage(1);
  }

  function clearFilters() {
    setSearchDraft("");
    setFilters((current) => ({ ...DEFAULT_FILTERS, sort: current.sort }));
    setPage(1);
  }

  return (
    <div className="app-shell">
      <DashboardSidebar activePage="Transactions" />
      <main className="dashboard-main transactions-main">
        <header className="page-header transactions-page-header">
          <div className="page-heading">
            <DashboardReturnLink />
            <h1>Transactions</h1>
            <p>Keep track of your income and expenses.</p>
          </div>
          <Button onClick={openCreate} disabled={!canAdd}>
            <Plus data-icon="inline-start" aria-hidden="true" /> New transaction
          </Button>
        </header>

        {categoryError ? <Card className="transaction-notice" role="alert"><p>{categoryError}</p><Button variant="outline" onClick={() => { setCategoryLoading(true); setCategoryError(null); setCategoryRetry((value) => value + 1); }}>Try again</Button></Card> : null}

        {currentPage ? (
          <section className="transaction-summary-grid" aria-label="Transaction summaries">
            {summaryCards.map(({ title, amount, count, icon: Icon, tone, polarity, detail }) => (
              <Card className={`transaction-summary-card transaction-summary-${tone}`} key={title}>
                <div className="transaction-summary-heading"><span className="transaction-summary-icon"><Icon aria-hidden="true" /></span><div><h2>{title}</h2><p>{detail}</p></div></div>
                <strong>{amount ? formatCurrency(amount, polarity) : "—"}</strong>
                <span className="transaction-summary-count">{count === undefined ? "Loading totals…" : `${count} ${count === 1 ? "transaction" : "transactions"}`}</span>
              </Card>
            ))}
          </section>
        ) : loading ? (
          <section className="transaction-summary-grid" aria-label="Loading transaction summaries" aria-busy="true">
            {[0, 1, 2].map((item) => <Card className="transaction-summary-card transaction-loading-summary" key={item}><Skeleton className="loading-section-title" /><Skeleton className="loading-value" /><Skeleton className="loading-line loading-footer" /></Card>)}
          </section>
        ) : null}

        <Card className="transaction-list-card">
          <CardHeader className="transaction-list-heading">
            <div>
              <CardTitle>Transaction history</CardTitle>
              <CardDescription>{currentPage ? `${currentPage.total} ${currentPage.total === 1 ? "record" : "records"}` : "Your latest financial activity"}</CardDescription>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Refresh transactions" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
              <RefreshCw className={loading ? "transaction-spin" : ""} aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="transaction-list-content">
            <div className="transaction-filter-panel" aria-label="Filter transactions">
              <div className="transaction-filter-main-row">
                <label className="transaction-search-field"><span className="sr-only">Search descriptions</span><Search aria-hidden="true" /><Input type="search" aria-label="Search descriptions" placeholder="Search transactions…" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} /><button type="button" aria-label="Clear search" onClick={() => setSearchDraft("")} disabled={!searchDraft}><X aria-hidden="true" /></button></label>
                <DateRangeFilter startDate={filters.startDate} endDate={filters.endDate} onChange={(startDate, endDate) => { updateFilter("startDate", startDate); updateFilter("endDate", endDate); }} />
                <div className="transaction-type-filter" role="group" aria-label="Filter by transaction type">
                  {([{ label: "All", value: "" }, { label: "Income", value: "INCOME" }, { label: "Expense", value: "EXPENSE" }] as const).map(({ label, value }) => <button type="button" key={label} className={filters.type === value ? "active" : ""} aria-pressed={filters.type === value} onClick={() => changeTypeFilter(value)}>{label}</button>)}
                </div>
              </div>
              <div className="transaction-filter-secondary-row">
                <CategoryMenu categories={matchingCategories} value={filters.categoryId} onChange={(value) => updateFilter("categoryId", value)} allLabel="All categories" />
                <div className="transaction-filter-status" aria-live="polite">
                  {hasActiveFilters ? <><span>Active filters</span>{filters.search ? <button type="button" onClick={() => setSearchDraft("")}>“{filters.search}”<X aria-hidden="true" /></button> : null}{filters.type ? <button type="button" onClick={() => changeTypeFilter("")}>{filters.type === "INCOME" ? "Income" : "Expense"}<X aria-hidden="true" /></button> : null}{currentCategory ? <button type="button" onClick={() => updateFilter("categoryId", "")}><CategoryIcon name={currentCategory.name} />{currentCategory.name}<X aria-hidden="true" /></button> : null}{filters.startDate || filters.endDate ? <button type="button" onClick={() => { updateFilter("startDate", ""); updateFilter("endDate", ""); }}><CalendarDays aria-hidden="true" />{filters.startDate || "…"} – {filters.endDate || "…"}<X aria-hidden="true" /></button> : null}</> : <span>All activity</span>}
                </div>
                <label className="transaction-sort-control"><ArrowDownWideNarrow aria-hidden="true" /><span className="sr-only">Sort transactions</span><select aria-label="Sort transactions" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value as TransactionSort)}><option value="DATE_DESC">Date: newest first</option><option value="DATE_ASC">Date: oldest first</option><option value="AMOUNT_DESC">Amount: highest first</option><option value="AMOUNT_ASC">Amount: lowest first</option><option value="DESCRIPTION_ASC">Description: A–Z</option></select><ChevronDown aria-hidden="true" /></label>
                <Button className="transaction-clear-filters" variant="ghost" onClick={clearFilters} disabled={!hasActiveFilters}>Clear filters</Button>
              </div>
            </div>

            {currentError ? (
              <div className="transaction-state" role="alert"><ReceiptText aria-hidden="true" /><h2>Couldn’t load transactions</h2><p>{currentError}</p><Button variant="outline" onClick={() => setRefresh((value) => value + 1)}>Try again</Button></div>
            ) : loading && !currentPage ? (
              <div className="transaction-loading-table" role="status" aria-label="Loading transactions" aria-busy="true">
                <div className="transaction-skeleton-header"><Skeleton /><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
                {[0, 1, 2, 3, 4].map((item) => <div className="transaction-skeleton-row" key={item}><Skeleton /><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>)}
              </div>
            ) : currentPage?.rows.length === 0 ? (
              <div className="transaction-state"><ReceiptText aria-hidden="true" /><h2>No transactions found</h2><p>{hasActiveFilters ? "Try changing or clearing your filters." : "Add a transaction to see your activity here."}</p>{!hasActiveFilters ? <Button onClick={openCreate} disabled={!canAdd}><Plus data-icon="inline-start" />Add transaction</Button> : null}</div>
            ) : currentPage ? (
              <>
                <TransactionTable
                  transactions={currentPage.rows.map((transaction) => ({
                    ...transaction,
                    categoryName: categoryById.get(transaction.categoryId)?.name ?? "Other Expenses",
                  }))}
                  deletingId={deletingId}
                  onEdit={(id) => {
                    const transaction = currentPage.rows.find((row) => row.id === id);
                    if (transaction) openEdit(transaction);
                  }}
                  onDelete={(id) => {
                    const transaction = currentPage.rows.find((row) => row.id === id);
                    if (transaction) void handleDelete(transaction);
                  }}
                />
                <div className="transaction-pagination">
                  <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, currentPage.total)} of {currentPage.total}</span>
                  <div><Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft data-icon="inline-start" />Previous</Button><span>Page {page} of {Math.max(currentPage.totalPages, 1)}</span><Button variant="outline" size="sm" disabled={page >= currentPage.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight data-icon="inline-end" /></Button></div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="transaction-dialog">
            <DialogHeader><DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle><DialogDescription>{editing ? "Update the details for this transaction." : "Add an expense or income to your history."}</DialogDescription></DialogHeader>
            <TransactionForm key={`${dialogOpen}:${editing?.id ?? "new"}`} categories={categories} transaction={editing} saving={saving} error={mutationError} onSave={handleSave} onCancel={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
        {/* <footer className="page-footer">
          <span>Personal Expense Manager</span>
          <span className="footer-divider" aria-hidden="true">·</span>
          <span>Manage your financial activity</span>
          <span className="footer-spacer" />
        </footer> */}
      </main>
    </div>
  );
}

