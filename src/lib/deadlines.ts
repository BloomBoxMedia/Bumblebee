import { addDays, addMonths, daysBetween, type ISODate } from "./dates";

// Statutory filing deadlines for a UK private limited company.
//
// Each company stores the *next* outstanding period for each obligation (as
// shown on Companies House / HMRC). Deadlines are generated forward from those
// anchors, so anything before them is assumed to be dealt with already.

export type VatScheme = "none" | "quarterly" | "monthly" | "annual";

export type CompanyProfile = {
  incorporationDate: ISODate | null;
  accountsPeriodStart: ISODate;
  accountsPeriodEnd: ISODate;
  confirmationStatementDate: ISODate;
  vatScheme: VatScheme;
  vatPeriodEnd: ISODate | null;
  payeEmployer: boolean;
  /** PAYE payments are tracked from the first one due on or after this date. */
  payeFrom: ISODate | null;
};

export type DeadlineKind =
  | "confirmation_statement"
  | "annual_accounts"
  | "ct_payment"
  | "ct600"
  | "vat_return"
  | "paye_payment";

export type Deadline = {
  kind: DeadlineKind;
  authority: "Companies House" | "HMRC";
  title: string;
  /** End of the period the filing covers; together with `kind` this identifies it. */
  periodEnd: ISODate;
  periodStart?: ISODate;
  due: ISODate;
};

export const KIND_LABELS: Record<DeadlineKind, string> = {
  confirmation_statement: "Confirmation statement",
  annual_accounts: "Annual accounts",
  ct_payment: "Corporation Tax payment",
  ct600: "Corporation Tax return (CT600)",
  vat_return: "VAT return & payment",
  paye_payment: "PAYE & NIC payment",
};

const EOM = { endOfMonth: true };

/** Companies House: due 14 days after the confirmation (made-up-to) date. */
export function confirmationStatementDue(madeUpTo: ISODate): ISODate {
  return addDays(madeUpTo, 14);
}

/**
 * Companies House accounts deadline for a private company: 9 months after the
 * period end. First accounts covering more than 12 months are instead due 21
 * months after incorporation.
 */
export function accountsDue(
  periodStart: ISODate,
  periodEnd: ISODate,
  incorporationDate: ISODate | null,
): ISODate {
  const isFirst = incorporationDate !== null && periodStart === incorporationDate;
  if (isFirst && periodEnd > lastDayOfTwelveMonths(periodStart)) {
    return addMonths(incorporationDate, 21);
  }
  return addMonths(periodEnd, 9, EOM);
}

function lastDayOfTwelveMonths(start: ISODate): ISODate {
  return addDays(addMonths(start, 12), -1);
}

/**
 * A Corporation Tax accounting period can't exceed 12 months, so a longer
 * accounts period (typically a company's first) is split into a 12-month
 * period plus the remainder.
 */
export function corporationTaxPeriods(
  start: ISODate,
  end: ISODate,
): { start: ISODate; end: ISODate }[] {
  const periods: { start: ISODate; end: ISODate }[] = [];
  let s = start;
  while (end > lastDayOfTwelveMonths(s)) {
    const e = lastDayOfTwelveMonths(s);
    periods.push({ start: s, end: e });
    s = addDays(e, 1);
  }
  periods.push({ start: s, end });
  return periods;
}

/** HMRC: payment 9 months and 1 day after the period ends (non-large companies). */
export function corporationTaxPaymentDue(periodEnd: ISODate): ISODate {
  return addDays(addMonths(periodEnd, 9, EOM), 1);
}

/** HMRC: CT600 return 12 months after the period ends. */
export function ct600Due(periodEnd: ISODate): ISODate {
  return addMonths(periodEnd, 12, EOM);
}

/** HMRC: 1 calendar month and 7 days after the VAT period ends; 2 months for annual accounting. */
export function vatDue(periodEnd: ISODate, scheme: Exclude<VatScheme, "none">): ISODate {
  if (scheme === "annual") return addMonths(periodEnd, 2, EOM);
  return addDays(addMonths(periodEnd, 1, EOM), 7);
}

const VAT_PERIOD_MONTHS = { monthly: 1, quarterly: 3, annual: 12 } as const;

/**
 * All deadlines from the company's anchors up to `until` (inclusive, by due date).
 */
export function generateDeadlines(company: CompanyProfile, until: ISODate): Deadline[] {
  const out: Deadline[] = [];

  // Confirmation statement: every 12 months from the next made-up-to date.
  for (let d = company.confirmationStatementDate; ; d = addMonths(d, 12, EOM)) {
    const due = confirmationStatementDue(d);
    if (due > until) break;
    out.push({
      kind: "confirmation_statement",
      authority: "Companies House",
      title: KIND_LABELS.confirmation_statement,
      periodEnd: d,
      due,
    });
  }

  // Accounts and Corporation Tax, one accounts period at a time.
  let start = company.accountsPeriodStart;
  let end = company.accountsPeriodEnd;
  for (;;) {
    const batch: Deadline[] = [
      {
        kind: "annual_accounts",
        authority: "Companies House",
        title: KIND_LABELS.annual_accounts,
        periodStart: start,
        periodEnd: end,
        due: accountsDue(start, end, company.incorporationDate),
      },
    ];
    for (const p of corporationTaxPeriods(start, end)) {
      batch.push(
        {
          kind: "ct_payment",
          authority: "HMRC",
          title: KIND_LABELS.ct_payment,
          periodStart: p.start,
          periodEnd: p.end,
          due: corporationTaxPaymentDue(p.end),
        },
        {
          kind: "ct600",
          authority: "HMRC",
          title: KIND_LABELS.ct600,
          periodStart: p.start,
          periodEnd: p.end,
          due: ct600Due(p.end),
        },
      );
    }
    const inRange = batch.filter((d) => d.due <= until);
    out.push(...inRange);
    if (inRange.length === 0) break;
    start = addDays(end, 1);
    end = addMonths(end, 12, EOM);
  }

  if (company.vatScheme !== "none" && company.vatPeriodEnd) {
    const scheme = company.vatScheme;
    const step = VAT_PERIOD_MONTHS[scheme];
    for (let e = company.vatPeriodEnd; ; e = addMonths(e, step, EOM)) {
      const due = vatDue(e, scheme);
      if (due > until) break;
      out.push({
        kind: "vat_return",
        authority: "HMRC",
        title: KIND_LABELS.vat_return,
        periodStart: addDays(addMonths(e, -step, EOM), 1),
        periodEnd: e,
        due,
      });
    }
  }

  if (company.payeEmployer && company.payeFrom) {
    // Electronic PAYE payments are due on the 22nd after each tax month (6th–5th).
    let due = company.payeFrom.slice(0, 8) + "22";
    if (due < company.payeFrom) due = addMonths(due, 1);
    for (; due <= until; due = addMonths(due, 1)) {
      const taxMonthEnd = due.slice(0, 8) + "05";
      out.push({
        kind: "paye_payment",
        authority: "HMRC",
        title: KIND_LABELS.paye_payment,
        periodStart: addDays(addMonths(taxMonthEnd, -1), 1),
        periodEnd: taxMonthEnd,
        due,
      });
    }
  }

  return out.sort((a, b) => a.due.localeCompare(b.due) || a.kind.localeCompare(b.kind));
}

export type DeadlineStatus = "filed" | "overdue" | "due_soon" | "upcoming";

export function deadlineStatus(
  deadline: Deadline,
  today: ISODate,
  filed: boolean,
  soonDays = 30,
): DeadlineStatus {
  if (filed) return "filed";
  const days = daysBetween(today, deadline.due);
  if (days < 0) return "overdue";
  if (days <= soonDays) return "due_soon";
  return "upcoming";
}

export function deadlineKey(d: Pick<Deadline, "kind" | "periodEnd">): string {
  return `${d.kind}:${d.periodEnd}`;
}
