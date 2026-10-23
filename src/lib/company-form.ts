import { daysBetween, isISODate } from "./dates";
import type { CompanyInput } from "./db";
import type { VatScheme } from "./deadlines";

const VAT_SCHEMES: VatScheme[] = ["none", "quarterly", "monthly", "annual"];

export type ParseResult =
  | { ok: true; company: CompanyInput }
  | { ok: false; errors: Record<string, string> };

export function parseCompanyForm(form: FormData): ParseResult {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const errors: Record<string, string> = {};

  const date = (name: string, required: boolean) => {
    const v = text(name);
    if (!v) {
      if (required) errors[name] = "Required";
      return null;
    }
    if (!isISODate(v)) errors[name] = "Enter a valid date";
    return v;
  };

  const name = text("name");
  if (!name) errors.name = "Required";

  const vatScheme = text("vatScheme") as VatScheme;
  if (!VAT_SCHEMES.includes(vatScheme)) errors.vatScheme = "Choose a VAT scheme";
  const payeEmployer = form.get("payeEmployer") === "on";

  const company: CompanyInput = {
    name,
    companyNumber: text("companyNumber") || null,
    incorporationDate: date("incorporationDate", false),
    accountsPeriodStart: date("accountsPeriodStart", true) ?? "",
    accountsPeriodEnd: date("accountsPeriodEnd", true) ?? "",
    confirmationStatementDate: date("confirmationStatementDate", true) ?? "",
    vatScheme,
    vatPeriodEnd: date("vatPeriodEnd", vatScheme !== "none"),
    payeEmployer,
    payeFrom: date("payeFrom", payeEmployer),
    notes: text("notes"),
  };

  if (!errors.accountsPeriodStart && !errors.accountsPeriodEnd) {
    const days = daysBetween(company.accountsPeriodStart, company.accountsPeriodEnd);
    // Companies House allows an accounts period of up to 18 months.
    if (days < 0) errors.accountsPeriodEnd = "Must be after the period start";
    else if (days > 549) errors.accountsPeriodEnd = "An accounts period can't exceed 18 months";
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, company };
}
