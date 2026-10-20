import { describe, expect, test } from "bun:test";
import { feeForDays, formatCents, overdueDays } from "../src/fees/feeCalculator";

const general = { category: "general" as const, replacementCostCents: 2400 };
const children = { category: "children" as const, replacementCostCents: 1200 };

describe("overdueDays", () => {
  test("is zero when the book comes back early", () => {
    expect(overdueDays(new Date(2026, 2, 16, 10), new Date(2026, 2, 14, 9))).toBe(0);
  });

  test("is zero when the book comes back before the due moment", () => {
    expect(overdueDays(new Date(2026, 2, 16, 10), new Date(2026, 2, 16, 9))).toBe(0);
  });
});

describe("feeForDays", () => {
  test("charges the daily rate for general books", () => {
    expect(feeForDays(4, general)).toBe(100);
  });

  test("charges half rate for children's books and rounds the total half up", () => {
    expect(feeForDays(3, children)).toBe(38);
  });

  test("never exceeds the replacement cost", () => {
    expect(feeForDays(500, general)).toBe(2400);
  });

  test("is zero for no overdue days", () => {
    expect(feeForDays(0, general)).toBe(0);
  });
});

test("formatCents renders dollars", () => {
  expect(formatCents(1234)).toBe("$12.34");
});
