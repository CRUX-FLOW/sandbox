import type { BookCategory } from "./types";

/** Lending rules. Change them here, not inline in the service. */
export const DEFAULT_LOAN_DAYS = 14;
export const RENEWAL_DAYS = 14;
export const MAX_RENEWALS = 2;
export const MAX_ACTIVE_LOANS = 5;
export const HOLD_DAYS = 3;

export const DAILY_FEE_CENTS = 25;

export const CATEGORY_FEE_MULTIPLIER: Record<BookCategory, number> = {
  general: 1,
  children: 0.5,
  reference: 1,
};

export const LOANABLE_CATEGORIES: readonly BookCategory[] = ["general", "children"];
