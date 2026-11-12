import { ArrowDownLeft, ArrowUpRight, Pencil, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/features/dashboard/dashboard-format";
import type { RecurrenceFrequency, TransactionType } from "@/features/transactions/transactions-api";
import { CategoryBadge } from "@/features/transactions/category-presentation";

export interface TransactionTableRecord {
  id: string;
  occurredAt: string;
  description: string | null;
  categoryName: string;
  type: TransactionType;
  amount: string;
  recurrenceFrequency?: RecurrenceFrequency | null;
  nextOccurrenceAt?: string | null;
}

function recurrenceLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case "WEEKLY": return "weekly";
    case "MONTHLY": return "monthly";
    case "YEARLY": return "yearly";
  }
}

function RecurrenceNote({ transaction }: { transaction: TransactionTableRecord }) {
  if (!transaction.recurrenceFrequency || !transaction.nextOccurrenceAt) return null;

  const nextDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(transaction.nextOccurrenceAt));

  return <span className="transaction-recurrence-note"><Repeat aria-hidden="true" />Repeats {recurrenceLabel(transaction.recurrenceFrequency)} - Next {nextDate}</span>;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  deletingId,
}: {
  transactions: TransactionTableRecord[];
  onEdit?: (transactionId: string) => void;
  onDelete?: (transactionId: string) => void;
  deletingId?: string | null;
}) {
  const hasActions = Boolean(onEdit && onDelete);

  return (
    <>
      <div className="transaction-responsive-table">
        <Table className="transaction-management-table">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="transaction-amount-heading">Amount</TableHead>
              {hasActions ? <TableHead><span className="sr-only">Actions</span></TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "INCOME";
              const DirectionIcon = isIncome ? ArrowDownLeft : ArrowUpRight;

              return (
                <TableRow key={transaction.id}>
                  <TableCell className="transaction-date-cell">{formatDate(transaction.occurredAt)}</TableCell>
                  <TableCell>
                    <div className="transaction-description">
                      <span className={`transaction-icon ${isIncome ? "transaction-icon-income" : "transaction-icon-expense"}`} aria-hidden="true">
                        <DirectionIcon size={16} />
                      </span>
                      <span className="transaction-title">{transaction.description || "Untitled transaction"}</span>
                    </div>
                    <RecurrenceNote transaction={transaction} />
                  </TableCell>
                  <TableCell><CategoryBadge name={transaction.categoryName} /></TableCell>
                  <TableCell><span className={`type-chip ${isIncome ? "type-chip-income" : "type-chip-expense"}`}><i aria-hidden="true" />{isIncome ? "Income" : "Expense"}</span></TableCell>
                  <TableCell className={`transaction-amount ${isIncome ? "amount-income" : "amount-expense"}`}>
                    {formatCurrency(transaction.amount, transaction.type)}
                  </TableCell>
                  {hasActions ? (
                    <TableCell>
                      <div className="transaction-row-actions">
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${transaction.description || "transaction"}`} onClick={() => onEdit?.(transaction.id)}>
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${transaction.description || "transaction"}`} onClick={() => onDelete?.(transaction.id)} disabled={deletingId === transaction.id}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="transaction-mobile-list">
        {transactions.map((transaction) => {
          const isIncome = transaction.type === "INCOME";

          return (
            <article className="transaction-mobile-card" key={transaction.id}>
              <div className="transaction-mobile-topline">
                <time>{formatDate(transaction.occurredAt)}</time>
                <span className={`type-chip ${isIncome ? "type-chip-income" : "type-chip-expense"}`}><i aria-hidden="true" />{isIncome ? "Income" : "Expense"}</span>
              </div>
              <div className="transaction-mobile-description-row">
                <span className={`transaction-icon ${isIncome ? "transaction-icon-income" : "transaction-icon-expense"}`} aria-hidden="true">
                  {isIncome ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <p className="transaction-mobile-description">{transaction.description || "Untitled transaction"}</p>
              </div>
              <RecurrenceNote transaction={transaction} />
              <div className="transaction-mobile-details">
                <CategoryBadge name={transaction.categoryName} />
                <strong className={isIncome ? "amount-income" : "amount-expense"}>{formatCurrency(transaction.amount, transaction.type)}</strong>
              </div>
              {hasActions ? (
                <div className="transaction-mobile-actions">
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(transaction.id)}><Pencil data-icon="inline-start" aria-hidden="true" />Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete?.(transaction.id)} disabled={deletingId === transaction.id}><Trash2 data-icon="inline-start" aria-hidden="true" />Delete</Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}
