import { expect, test } from "bun:test";
import { createApp } from "../src/http/handlers";
import { setup } from "./helpers";

function post(path: string, body?: unknown): Request {
  return new Request(`http://library.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("borrow and return over HTTP", async () => {
  const { service, book, ana } = setup();
  const app = createApp(service);

  const borrowed = await app.fetch(post("/loans", { bookId: book.id, memberId: ana.id }));
  expect(borrowed.status).toBe(201);
  const loan = (await borrowed.json()) as { id: string };

  const returned = await app.fetch(post(`/loans/${loan.id}/return`));
  expect(returned.status).toBe(200);

  const loans = await app.fetch(new Request(`http://library.test/members/${ana.id}/loans`));
  expect(await loans.json()).toHaveLength(1);
});

test("an invalid member is a 400", async () => {
  const { service } = setup();
  const res = await createApp(service).fetch(post("/members", { name: "Cy", email: "not-an-email" }));
  expect(res.status).toBe(400);
});

test("borrowing a book on loan is a 409", async () => {
  const { service, book, ana, ben } = setup();
  const app = createApp(service);
  await app.fetch(post("/loans", { bookId: book.id, memberId: ana.id }));
  const res = await app.fetch(post("/loans", { bookId: book.id, memberId: ben.id }));
  expect(res.status).toBe(409);
});

test("an unknown route is a 404", async () => {
  const { service } = setup();
  const res = await createApp(service).fetch(new Request("http://library.test/nope"));
  expect(res.status).toBe(404);
});
