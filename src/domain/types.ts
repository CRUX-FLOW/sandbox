export type BookCategory = "general" | "children" | "reference";

export type BookStatus = "available" | "on_loan" | "on_hold";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  /** What the library pays to replace a lost copy. Late fees never exceed it. */
  replacementCostCents: number;
  status: BookStatus;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
}

export interface Loan {
  id: string;
  bookId: string;
  memberId: string;
  borrowedAt: Date;
  dueAt: Date;
  returnedAt: Date | null;
  renewals: number;
  feeCents: number;
}

export type ReservationStatus = "waiting" | "ready" | "fulfilled" | "expired" | "cancelled";

export interface Reservation {
  id: string;
  bookId: string;
  memberId: string;
  createdAt: Date;
  /** Set when the reservation becomes `ready`: the member must borrow before this moment. */
  holdExpiresAt: Date | null;
  status: ReservationStatus;
}
