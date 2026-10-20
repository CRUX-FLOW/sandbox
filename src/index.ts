import { createApp } from "./http/handlers";
import { createRepositories } from "./repository/inMemory";
import { LendingService } from "./service/lendingService";

const HOLD_SWEEP_MS = 60 * 60 * 1000;

const service = new LendingService(createRepositories());

// Demo catalogue so a fresh server has something to lend.
service.addBook({
  title: "The Lighthouse Ledger",
  author: "Mira Castell",
  isbn: "978-0-00-000001-1",
  category: "general",
  replacementCostCents: 2400,
});
service.addBook({
  title: "Otto and the Paper Moon",
  author: "Jun Halloway",
  isbn: "978-0-00-000002-8",
  category: "children",
  replacementCostCents: 1200,
});
service.addBook({
  title: "Atlas of Imaginary Rivers",
  author: "R. Ostrander",
  isbn: "978-0-00-000003-5",
  category: "reference",
  replacementCostCents: 6500,
});

const app = createApp(service);
const server = Bun.serve({ port: Number(Bun.env.PORT ?? 3000), fetch: app.fetch });

setInterval(() => {
  const expired = service.expireHolds();
  if (expired.length > 0) console.log(`expired ${expired.length} hold(s)`);
}, HOLD_SWEEP_MS);

console.log(`library-lending listening on ${server.url}`);
