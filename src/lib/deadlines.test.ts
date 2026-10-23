import { describe, expect, it } from "vitest";
import { addMonths, isISODate, todayInLondon } from "./dates";
import {
  accountsDue,
  confirmationStatementDue,
  corporationTaxPaymentDue,
  corporationTaxPeriods,
  ct600Due,
  deadlineStatus,
  generateDeadlines,
  vatDue,
  type CompanyProfile,
} from "./deadlines";

describe("dates", () => {
  it("clamps or sticks to month end", () => {
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-06-30", 9)).toBe("2026-03-30");
    expect(addMonths("2025-06-30", 9, { endOfMonth: true })).toBe("2026-03-31");
    expect(addMonths("2025-03-15", -3)).toBe("2024-12-15");
  });

  it("validates ISO dates", () => {
    expect(isISODate("2025-02-28")).toBe(true);
    expect(isISODate("2025-02-30")).toBe(false);
    expect(isISODate("28/02/2025")).toBe(false);
  });

  it("uses the UK calendar day", () => {
    // 23:30 UTC on 30 June is already 1 July in London (BST).
    expect(todayInLondon(new Date("2025-06-30T23:30:00Z"))).toBe("2025-07-01");
    expect(todayInLondon(new Date("2025-12-31T23:30:00Z"))).toBe("2025-12-31");
  });
});

describe("Companies House", () => {
  it("confirmation statement is due 14 days after the made-up-to date", () => {
    expect(confirmationStatementDue("2025-03-10")).toBe("2025-03-24");
  });

  it("accounts are due 9 months after the period end", () => {
    expect(accountsDue("2024-04-01", "2025-03-31", null)).toBe("2025-12-31");
    expect(accountsDue("2024-07-01", "2025-06-30", null)).toBe("2026-03-31");
    expect(accountsDue("2024-01-16", "2025-01-15", null)).toBe("2025-10-15");
  });

  it("first accounts over 12 months are due 21 months after incorporation", () => {
    // Incorporated 10 Jan 2024; first ARD 31 Jan 2025 (12 months 3 weeks).
    expect(accountsDue("2024-01-10", "2025-01-31", "2024-01-10")).toBe("2025-10-10");
  });

  it("first accounts of 12 months or less use the normal 9 month rule", () => {
    expect(accountsDue("2024-04-01", "2025-03-31", "2024-04-01")).toBe("2025-12-31");
  });
});

describe("HMRC Corporation Tax", () => {
  it("payment is due 9 months and 1 day after the period end", () => {
    expect(corporationTaxPaymentDue("2025-03-31")).toBe("2026-01-01");
    expect(corporationTaxPaymentDue("2025-06-30")).toBe("2026-04-01");
  });

  it("CT600 is due 12 months after the period end", () => {
    expect(ct600Due("2025-03-31")).toBe("2026-03-31");
    expect(ct600Due("2024-02-29")).toBe("2025-02-28");
  });

  it("splits accounts periods longer than 12 months", () => {
    expect(corporationTaxPeriods("2024-01-10", "2025-01-31")).toEqual([
      { start: "2024-01-10", end: "2025-01-09" },
      { start: "2025-01-10", end: "2025-01-31" },
    ]);
    expect(corporationTaxPeriods("2024-04-01", "2025-03-31")).toEqual([
      { start: "2024-04-01", end: "2025-03-31" },
    ]);
  });
});

describe("HMRC VAT", () => {
  it("is due 1 month and 7 days after the period end", () => {
    expect(vatDue("2025-03-31", "quarterly")).toBe("2025-05-07");
    expect(vatDue("2025-06-30", "quarterly")).toBe("2025-08-07");
    expect(vatDue("2025-01-31", "monthly")).toBe("2025-03-07");
  });

  it("annual accounting is due 2 months after the period end", () => {
    expect(vatDue("2025-03-31", "annual")).toBe("2025-05-31");
  });
});

describe("generateDeadlines", () => {
  const company: CompanyProfile = {
    incorporationDate: "2020-04-01",
    accountsPeriodStart: "2024-04-01",
    accountsPeriodEnd: "2025-03-31",
    confirmationStatementDate: "2025-04-01",
    vatScheme: "quarterly",
    vatPeriodEnd: "2025-03-31",
    payeEmployer: true,
    payeFrom: "2025-04-23",
  };

  it("produces every obligation up to the horizon, in due-date order", () => {
    const list = generateDeadlines(company, "2026-01-31");
    expect(list.map((d) => `${d.due} ${d.kind}`)).toEqual([
      "2025-04-15 confirmation_statement",
      "2025-05-07 vat_return",
      "2025-05-22 paye_payment",
      "2025-06-22 paye_payment",
      "2025-07-22 paye_payment",
      "2025-08-07 vat_return",
      "2025-08-22 paye_payment",
      "2025-09-22 paye_payment",
      "2025-10-22 paye_payment",
      "2025-11-07 vat_return",
      "2025-11-22 paye_payment",
      "2025-12-22 paye_payment",
      "2025-12-31 annual_accounts",
      "2026-01-01 ct_payment",
      "2026-01-22 paye_payment",
    ]);
  });

  it("rolls accounts and CT forward a year at a time", () => {
    const list = generateDeadlines({ ...company, vatScheme: "none", payeEmployer: false }, "2027-03-31");
    const ct600 = list.filter((d) => d.kind === "ct600").map((d) => d.periodEnd);
    expect(ct600).toEqual(["2025-03-31", "2026-03-31"]);
    const accounts = list.filter((d) => d.kind === "annual_accounts").map((d) => d.due);
    expect(accounts).toEqual(["2025-12-31", "2026-12-31"]);
  });

  it("gives a long first period two sets of CT deadlines", () => {
    const list = generateDeadlines(
      {
        incorporationDate: "2024-01-10",
        accountsPeriodStart: "2024-01-10",
        accountsPeriodEnd: "2025-01-31",
        confirmationStatementDate: "2025-01-09",
        vatScheme: "none",
        vatPeriodEnd: null,
        payeEmployer: false,
        payeFrom: null,
      },
      "2026-01-31",
    );
    expect(list.filter((d) => d.kind === "ct_payment").map((d) => d.due)).toEqual([
      "2025-10-10",
      "2025-11-01",
    ]);
    expect(list.find((d) => d.kind === "annual_accounts")?.due).toBe("2025-10-10");
  });

  it("labels the PAYE tax month correctly", () => {
    const [first] = generateDeadlines(
      { ...company, vatScheme: "none", confirmationStatementDate: "2030-01-01" },
      "2025-05-31",
    );
    expect(first).toMatchObject({
      kind: "paye_payment",
      periodStart: "2025-04-06",
      periodEnd: "2025-05-05",
      due: "2025-05-22",
    });
  });
});

describe("deadlineStatus", () => {
  const d = { due: "2025-05-07" } as Parameters<typeof deadlineStatus>[0];
  it("classifies by days remaining", () => {
    expect(deadlineStatus(d, "2025-05-08", false)).toBe("overdue");
    expect(deadlineStatus(d, "2025-05-07", false)).toBe("due_soon");
    expect(deadlineStatus(d, "2025-03-01", false)).toBe("upcoming");
    expect(deadlineStatus(d, "2025-06-01", true)).toBe("filed");
  });
});
