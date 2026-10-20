import { createRepositories } from "../src/repository/inMemory";
import { LendingService } from "../src/service/lendingService";

/** A clock the test can move forward by whole days. */
export function testClock(start = new Date(2026, 2, 2, 10, 0, 0)) {
  let now = new Date(start);
  return {
    now: () => new Date(now),
    advanceDays(days: number) {
      now = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, now.getHours(), now.getMinutes());
    },
  };
}

export function setup() {
  const clock = testClock();
  const repos = createRepositories();
  const service = new LendingService(repos, clock.now);
  const book = service.addBook({
    title: "The Lighthouse Ledger",
    author: "Mira Castell",
    isbn: "978-0-00-000001-1",
    category: "general",
    replacementCostCents: 2400,
  });
  const ana = service.addMember({ name: "Ana Example", email: "ana@example.test" });
  const ben = service.addMember({ name: "Ben Example", email: "ben@example.test" });
  return { clock, repos, service, book, ana, ben };
}
