import type { Book, Loan, Member, Reservation } from "../domain/types";

export interface Entity {
  id: string;
}

/**
 * A Map-backed store. Items are copied on the way in and out so callers
 * cannot mutate stored state by accident.
 */
export class InMemoryRepository<T extends Entity> {
  private readonly items = new Map<string, T>();

  get(id: string): T | undefined {
    const item = this.items.get(id);
    return item ? structuredClone(item) : undefined;
  }

  list(predicate: (item: T) => boolean = () => true): T[] {
    return [...this.items.values()].filter(predicate).map((item) => structuredClone(item));
  }

  save(item: T): T {
    this.items.set(item.id, structuredClone(item));
    return item;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

export interface Repositories {
  books: InMemoryRepository<Book>;
  members: InMemoryRepository<Member>;
  loans: InMemoryRepository<Loan>;
  reservations: InMemoryRepository<Reservation>;
}

export function createRepositories(): Repositories {
  return {
    books: new InMemoryRepository<Book>(),
    members: new InMemoryRepository<Member>(),
    loans: new InMemoryRepository<Loan>(),
    reservations: new InMemoryRepository<Reservation>(),
  };
}

export function createIdGenerator(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${next}`;
  };
}
