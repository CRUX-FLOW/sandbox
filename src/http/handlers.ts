import { DomainError, type DomainErrorCode } from "../domain/errors";
import type { LendingService } from "../service/lendingService";
import { Router } from "./router";

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  not_found: 404,
  conflict: 409,
  invalid: 400,
};

export interface App {
  fetch(req: Request): Promise<Response>;
}

export function createApp(service: LendingService): App {
  const router = new Router()
    .on("GET", "/health", () => Response.json({ ok: true }))
    .on("GET", "/books", () => Response.json(service.listBooks()))
    .on("POST", "/books", async (req) => Response.json(service.addBook(await body(req)), { status: 201 }))
    .on("POST", "/members", async (req) => Response.json(service.addMember(await body(req)), { status: 201 }))
    .on("GET", "/members/:id/loans", (_req, { id }) => Response.json(service.loansFor(id!)))
    .on("POST", "/loans", async (req) => {
      const { bookId, memberId, loanDays } = await body(req);
      return Response.json(service.borrow({ bookId, memberId, loanDays }), { status: 201 });
    })
    .on("POST", "/loans/:id/return", (_req, { id }) => Response.json(service.returnBook(id!)))
    .on("POST", "/loans/:id/renew", (_req, { id }) => Response.json(service.renew(id!)))
    .on("POST", "/reservations", async (req) => {
      const { bookId, memberId } = await body(req);
      return Response.json(service.reserve(bookId, memberId), { status: 201 });
    })
    .on("DELETE", "/reservations/:id", (_req, { id }) => Response.json(service.cancelReservation(id!)));

  return {
    async fetch(req) {
      const { pathname } = new URL(req.url);
      const match = router.match(req.method, pathname);
      if (!match) return Response.json({ error: "route not found" }, { status: 404 });
      try {
        return await match.handler(req, match.params);
      } catch (error) {
        return toErrorResponse(error);
      }
    },
  };
}

// Bodies are typed loosely here: the service validates every field it uses.
async function body(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw new DomainError("invalid", "request body must be JSON");
  }
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json({ error: error.message, code: error.code }, { status: STATUS_BY_CODE[error.code] });
  }
  console.error(error);
  return Response.json({ error: "internal error" }, { status: 500 });
}
