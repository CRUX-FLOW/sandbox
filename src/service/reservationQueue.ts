import { addDays } from "../domain/dates";
import { HOLD_DAYS } from "../domain/policy";
import type { Reservation } from "../domain/types";
import type { Repositories } from "../repository/inMemory";

/** Reservations of one book that are still waiting, oldest first (FIFO). */
export function waitingQueue(repos: Repositories, bookId: string): Reservation[] {
  return repos.reservations
    .list((r) => r.bookId === bookId && r.status === "waiting")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function readyReservation(repos: Repositories, bookId: string): Reservation | undefined {
  return repos.reservations.list((r) => r.bookId === bookId && r.status === "ready")[0];
}

/**
 * Hands a returned (or released) copy to the next waiting member.
 * Returns the reservation that is now ready, or undefined when nobody is waiting
 * and the book went back on the shelf.
 */
export function promoteNext(repos: Repositories, bookId: string, now: Date): Reservation | undefined {
  const book = repos.books.get(bookId);
  if (!book) return undefined;

  const next = waitingQueue(repos, bookId)[0];
  if (!next) {
    repos.books.save({ ...book, status: "available" });
    return undefined;
  }

  const ready: Reservation = { ...next, status: "ready", holdExpiresAt: addDays(now, HOLD_DAYS) };
  repos.reservations.save(ready);
  repos.books.save({ ...book, status: "on_hold" });
  return ready;
}

/** Expires every ready hold whose time ran out and passes each copy on. */
export function expireHolds(repos: Repositories, now: Date): Reservation[] {
  const expired = repos.reservations.list(
    (r) => r.status === "ready" && r.holdExpiresAt !== null && r.holdExpiresAt.getTime() < now.getTime(),
  );
  for (const reservation of expired) {
    repos.reservations.save({ ...reservation, status: "expired" });
    promoteNext(repos, reservation.bookId, now);
  }
  return expired;
}
