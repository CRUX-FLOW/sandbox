export type DomainErrorCode = "not_found" | "conflict" | "invalid";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (what: string, id: string) =>
  new DomainError("not_found", `${what} ${id} not found`);

export const conflict = (message: string) => new DomainError("conflict", message);

export const invalid = (message: string) => new DomainError("invalid", message);
