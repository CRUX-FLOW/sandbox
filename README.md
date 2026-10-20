# library-lending

A small lending service for a neighbourhood library: books, members, loans with due
dates, late fees and a first-come-first-served reservations queue. It runs on
[Bun](https://bun.sh), keeps everything in memory, and speaks JSON over HTTP.

The design notes and rules live in the companion wiki repository (`sandbox-wiki`).

## Run it

```sh
bun install
bun run start          # http://localhost:3000, PORT overrides the port
bun test               # unit + HTTP tests
bun run typecheck      # tsc --noEmit
```

The server starts with three demo books and no members. Data is lost on restart.

## Layout

```
src/
  domain/        types, lending policy constants, date helpers, domain errors
  repository/    InMemoryRepository<T> and the id generator
  fees/          late-fee calculation (pure functions)
  service/       LendingService (use cases) and the reservations queue
  http/          a tiny router and the JSON handlers
  index.ts       wires everything together and starts Bun.serve
test/            bun test suites; helpers.ts builds a service with a fixed clock
```

Dependencies point inwards: `http` → `service` → `fees` / `repository` → `domain`.
Nothing in `domain` or `fees` knows about HTTP or storage.

## HTTP API

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true }` |
| GET | `/books` | — | all books |
| POST | `/books` | `{ title, author, isbn, category, replacementCostCents }` | 201 book |
| POST | `/members` | `{ name, email }` | 201 member |
| GET | `/members/:id/loans` | — | the member's loans |
| POST | `/loans` | `{ bookId, memberId, loanDays? }` | 201 loan |
| POST | `/loans/:id/return` | — | closed loan with `feeCents` |
| POST | `/loans/:id/renew` | — | loan with the new `dueAt` |
| POST | `/reservations` | `{ bookId, memberId }` | 201 reservation |
| DELETE | `/reservations/:id` | — | cancelled reservation |

Errors are `{ error, code }` with `code` one of `invalid` (400), `not_found` (404) or
`conflict` (409).

## Lending rules at a glance

All numbers live in `src/domain/policy.ts`.

- Loans last 14 days by default and can be renewed by 14 days while nobody is waiting.
- A member has at most 5 active loans.
- Reference books never leave the library.
- Late fees are 25¢ per day (half for children's books), capped at the replacement cost.
- When a book with a queue is returned, it is held for the first member for 3 days.

## Example

```sh
curl -s localhost:3000/members -d '{"name":"Ana Example","email":"ana@example.test"}'
curl -s localhost:3000/loans -d '{"bookId":"book_1","memberId":"member_1"}'
curl -s -X POST localhost:3000/loans/loan_1/return
```
