import { daysBetween } from "../domain/dates";
import { CATEGORY_FEE_MULTIPLIER, DAILY_FEE_CENTS } from "../domain/policy";
import type { Book } from "../domain/types";

/** Number of days a return is late. Returning before the due moment is never late. */
export function overdueDays(dueAt: Date, returnedAt: Date): number {
  if (returnedAt.getTime() <= dueAt.getTime()) return 0;
  return daysBetween(dueAt, returnedAt) + 1;
}

/**
 * Fee for `days` overdue days on `book`, in cents.
 * Rounded once on the total (half up), then capped at the replacement cost.
 */
export function feeForDays(days: number, book: Pick<Book, "category" | "replacementCostCents">): number {
  if (days <= 0) return 0;
  const raw = days * DAILY_FEE_CENTS * CATEGORY_FEE_MULTIPLIER[book.category];
  return Math.min(Math.round(raw), book.replacementCostCents);
}

export function calculateLateFee(
  loan: { dueAt: Date },
  book: Pick<Book, "category" | "replacementCostCents">,
  returnedAt: Date,
): number {
  return feeForDays(overdueDays(loan.dueAt, returnedAt), book);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
