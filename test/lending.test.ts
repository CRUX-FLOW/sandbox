import { describe, expect, test } from "bun:test";
import { daysBetween } from "../src/domain/dates";
import { DomainError } from "../src/domain/errors";
import { setup } from "./helpers";

describe("borrow", () => {
  test("lends an available book for 14 days", () => {
    const { service, book, ana } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    expect(daysBetween(loan.borrowedAt, loan.dueAt)).toBe(14);
    expect(service.listBooks()[0]?.status).toBe("on_loan");
  });

  test("refuses reference books", () => {
    const { service, ana } = setup();
    const atlas = service.addBook({
      title: "Atlas of Imaginary Rivers",
      author: "R. Ostrander",
      isbn: "978-0-00-000003-5",
      category: "reference",
      replacementCostCents: 6500,
    });
    expect(() => service.borrow({ bookId: atlas.id, memberId: ana.id })).toThrow(DomainError);
  });

  test("refuses a sixth active loan", () => {
    const { service, ana } = setup();
    for (let i = 0; i < 6; i++) {
      const copy = service.addBook({
        title: `Copy ${i}`,
        author: "Anon",
        isbn: `978-0-00-00010${i}-0`,
        category: "general",
        replacementCostCents: 1000,
      });
      if (i < 5) service.borrow({ bookId: copy.id, memberId: ana.id });
      else expect(() => service.borrow({ bookId: copy.id, memberId: ana.id })).toThrow("5 active loans");
    }
  });
});

describe("return and reservations", () => {
  test("a return with nobody waiting puts the book back on the shelf", () => {
    const { service, book, ana } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    const returned = service.returnBook(loan.id);
    expect(returned.returnedAt).not.toBeNull();
    expect(returned.feeCents).toBe(0);
    expect(service.listBooks()[0]?.status).toBe("available");
  });

  test("a return holds the book for the first member in the queue", () => {
    const { service, book, ana, ben } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    service.reserve(book.id, ben.id);
    service.returnBook(loan.id);

    expect(service.listBooks()[0]?.status).toBe("on_hold");
    expect(() => service.borrow({ bookId: book.id, memberId: ana.id })).toThrow("on hold for another member");
    expect(service.borrow({ bookId: book.id, memberId: ben.id }).memberId).toBe(ben.id);
  });

  test("an expired hold passes the book to the shelf", () => {
    const { service, clock, book, ana, ben } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    service.reserve(book.id, ben.id);
    service.returnBook(loan.id);
    clock.advanceDays(4);

    expect(service.expireHolds()).toHaveLength(1);
    expect(service.listBooks()[0]?.status).toBe("available");
  });

  test("an available book cannot be reserved", () => {
    const { service, book, ana } = setup();
    expect(() => service.reserve(book.id, ana.id)).toThrow("borrow it instead");
  });
});

describe("renew", () => {
  test("extends the due date by 14 days", () => {
    const { service, book, ana } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    const renewed = service.renew(loan.id);
    expect(daysBetween(loan.dueAt, renewed.dueAt)).toBe(14);
    expect(renewed.renewals).toBe(1);
  });

  test("is refused while another member waits", () => {
    const { service, book, ana, ben } = setup();
    const loan = service.borrow({ bookId: book.id, memberId: ana.id });
    service.reserve(book.id, ben.id);
    expect(() => service.renew(loan.id)).toThrow("waiting");
  });
});
