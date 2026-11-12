import { z } from "zod";

const DECIMAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

const amountSchema = z.string().refine(
  (amount) => {
    if (!DECIMAL_AMOUNT_PATTERN.test(amount)) return false;

    const [wholePart, fractionalPart = ""] = amount.split(".");
    if (wholePart === undefined) return false;

    const amountInMinorUnits = BigInt(wholePart) * 100n + BigInt(fractionalPart.padEnd(2, "0"));
    return amountInMinorUnits > 0n;
  },
  "Amount must be positive and fit DECIMAL(12,2)",
);

function hasValidCalendarDate(dateTime: string): boolean {
  const [yearText, monthText, dayText] = dateTime.slice(0, 10).split("-");
  if (yearText === undefined || monthText === undefined || dayText === undefined) return false;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

  return daysInMonth !== undefined && day >= 1 && day <= daysInMonth;
}

const dateTimeSchema = z
  .iso.datetime({ offset: true })
  .refine(hasValidCalendarDate, "Date must be a valid ISO 8601 date-time with an offset");

const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
const recurrenceFrequencySchema = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);
const categoryIdSchema = z.uuid();
const descriptionSchema = z.string().trim().max(500).nullable();

export const createTransactionSchema = z
  .object({
    categoryId: categoryIdSchema,
    type: transactionTypeSchema,
    amount: amountSchema,
    description: descriptionSchema.optional(),
    occurredAt: dateTimeSchema,
    recurrenceFrequency: recurrenceFrequencySchema.nullable().optional(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    categoryId: categoryIdSchema.optional(),
    type: transactionTypeSchema.optional(),
    amount: amountSchema.optional(),
    description: descriptionSchema.optional(),
    occurredAt: dateTimeSchema.optional(),
    recurrenceFrequency: recurrenceFrequencySchema.nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "At least one field must be provided");

export const transactionIdParamsSchema = z
  .object({
    transactionId: z.uuid(),
  })
  .strict();

const pageSchema = z.coerce.number().int().min(1).max(100_000).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(20);
const sortSchema = z.enum([
  "DATE_DESC",
  "DATE_ASC",
  "AMOUNT_DESC",
  "AMOUNT_ASC",
  "DESCRIPTION_ASC",
]).default("DATE_DESC");

export const listTransactionsQuerySchema = z
  .object({
    categoryId: categoryIdSchema.optional(),
    type: transactionTypeSchema.optional(),
    search: z.string().trim().max(120).optional().transform((value) => value || undefined),
    startDate: dateTimeSchema.optional(),
    endDate: dateTimeSchema.optional(),
    page: pageSchema,
    limit: limitSchema,
    sort: sortSchema,
  })
  .strict()
  .refine(
    ({ startDate, endDate }) =>
      startDate === undefined || endDate === undefined || Date.parse(startDate) <= Date.parse(endDate),
    { path: ["endDate"], message: "endDate must be on or after startDate" },
  );

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
