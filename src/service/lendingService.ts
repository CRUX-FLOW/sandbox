import { addDays } from "../domain/dates";
import { conflict, invalid, notFound } from "../domain/errors";
import {
  DEFAULT_LOAN_DAYS,
  LOANABLE_CATEGORIES,
  MAX_ACTIVE_LOANS,
  MAX_RENEWALS,
  RENEWAL_DAYS,
} from "../domain/policy";
import type { Book, BookCategory, Loan, Member, Reservation } from "../domain/types";
import { calculateLateFee } from "../fees/feeCalculator";
import { createIdGenerator, type Repositories } from "../repository/inMemory";
import { expireHolds, promoteNext, readyReservation, waitingQueue } from "./reservationQueue";

export type Clock = () => Date;

export interface NewBook {
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  replacementCostCents: number;
}

export interface NewMember {
  name: string;
  email: string;
}

export interface BorrowRequest {
  bookId: string;
  memberId: string;
  loanDays?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES: readonly BookCategory[] = ["general", "children", "reference"];

export class LendingService {
  private readonly nextId = createIdGenerator();

  constructor(
    private readonly repos: Repositories,
    private readonly clock: Clock = () => new Date(),
  ) {}

  addBook(input: NewBook): Book {
    if (!input.title?.trim()) throw invalid("title is required");
    if (!CATEGORIES.includes(input.category)) throw invalid(`unknown category ${input.category}`);
    if (!Number.isInteger(input.replacementCostCents) || input.replacementCostCents <= 0) {
      throw invalid("replacementCostCents must be a positive integer");
    }
    const book: Book = { ...input, id: this.nextId("book"), status: "available" };
    return this.repos.books.save(book);
  }

  addMember(input: NewMember): Member {
    if (!input.name?.trim()) throw invalid("name is required");
    if (!EMAIL_PATTERN.test(input.email ?? "")) throw invalid("email is not valid");
    const member: Member = { ...input, id: this.nextId("member"), joinedAt: this.clock() };
    return this.repos.members.save(member);
  }

  listBooks(): Book[] {
    return this.repos.books.list();
  }

  borrow({ bookId, memberId, loanDays = DEFAULT_LOAN_DAYS }: BorrowRequest): Loan {
    const now = this.clock();
    const member = this.requireMember(memberId);
    const book = this.requireBook(bookId);

    if (!LOANABLE_CATEGORIES.includes(book.category)) {
      throw conflict(`${book.category} books cannot leave the library`);
    }
    if (this.activeLoans(member.id).length >= MAX_ACTIVE_LOANS) {
      throw conflict(`member already has ${MAX_ACTIVE_LOANS} active loans`);
    }

    if (book.status === "on_loan") throw conflict("book is on loan");
    if (book.status === "on_hold") {
      const hold = readyReservation(this.repos, book.id);
      if (!hold || hold.memberId !== member.id) throw conflict("book is on hold for another member");
      this.repos.reservations.save({ ...hold, status: "fulfilled" });
    }

    const loan: Loan = {
      id: this.nextId("loan"),
      bookId: book.id,
      memberId: member.id,
      borrowedAt: now,
      dueAt: addDays(now, loanDays),
      returnedAt: null,
      renewals: 0,
      feeCents: 0,
    };
    this.repos.loans.save(loan);
    this.repos.books.save({ ...book, status: "on_loan" });
    return loan;
  }

  returnBook(loanId: string): Loan {
    const now = this.clock();
    const loan = this.requireOpenLoan(loanId);
    const book = this.requireBook(loan.bookId);

    const returned: Loan = { ...loan, returnedAt: now, feeCents: calculateLateFee(loan, book, now) };
    this.repos.loans.save(returned);
    promoteNext(this.repos, book.id, now);
    return returned;
  }

  renew(loanId: string): Loan {
    const loan = this.requireOpenLoan(loanId);
    if (loan.renewals > MAX_RENEWALS) throw conflict(`loan was already renewed ${MAX_RENEWALS} times`);
    if (waitingQueue(this.repos, loan.bookId).length > 0) {
      throw conflict("another member is waiting for this book");
    }
    const renewed: Loan = {
      ...loan,
      dueAt: addDays(loan.dueAt, RENEWAL_DAYS),
      renewals: loan.renewals + 1,
    };
    return this.repos.loans.save(renewed);
  }

  reserve(bookId: string, memberId: string): Reservation {
    const member = this.requireMember(memberId);
    const book = this.requireBook(bookId);

    if (book.status === "available") throw conflict("book is available; borrow it instead");
    const alreadyQueued = this.repos.reservations.list(
      (r) => r.bookId === book.id && r.memberId === member.id && (r.status === "waiting" || r.status === "ready"),
    );
    if (alreadyQueued.length > 0) throw conflict("member already reserved this book");

    const reservation: Reservation = {
      id: this.nextId("reservation"),
      bookId: book.id,
      memberId: member.id,
      createdAt: this.clock(),
      holdExpiresAt: null,
      status: "waiting",
    };
    return this.repos.reservations.save(reservation);
  }

  cancelReservation(reservationId: string): Reservation {
    const reservation = this.repos.reservations.get(reservationId);
    if (!reservation) throw notFound("reservation", reservationId);
    if (reservation.status !== "waiting" && reservation.status !== "ready") {
      throw conflict(`reservation is already ${reservation.status}`);
    }
    const cancelled: Reservation = { ...reservation, status: "cancelled" };
    this.repos.reservations.save(cancelled);
    if (reservation.status === "ready") promoteNext(this.repos, reservation.bookId, this.clock());
    return cancelled;
  }

  expireHolds(): Reservation[] {
    return expireHolds(this.repos, this.clock());
  }

  loansFor(memberId: string): Loan[] {
    this.requireMember(memberId);
    return this.repos.loans.list((l) => l.memberId === memberId);
  }

  private activeLoans(memberId: string): Loan[] {
    return this.repos.loans.list((l) => l.memberId === memberId && l.returnedAt === null);
  }

  private requireMember(id: string): Member {
    const member = this.repos.members.get(id);
    if (!member) throw notFound("member", id);
    return member;
  }

  private requireBook(id: string): Book {
    const book = this.repos.books.get(id);
    if (!book) throw notFound("book", id);
    return book;
  }

  private requireOpenLoan(id: string): Loan {
    const loan = this.repos.loans.get(id);
    if (!loan) throw notFound("loan", id);
    if (loan.returnedAt) throw conflict("loan is already closed");
    return loan;
  }
}
