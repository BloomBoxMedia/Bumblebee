import "server-only";
import type { CompanyInput } from "./db";

// Companies House public data API: https://developer.company-information.service.gov.uk/
// A free "REST" API key goes in COMPANIES_HOUSE_API_KEY.

type CompanyProfileResponse = {
  company_name: string;
  company_number: string;
  date_of_creation?: string;
  accounts?: {
    next_accounts?: { period_start_on?: string; period_end_on?: string };
    next_made_up_to?: string;
  };
  confirmation_statement?: { next_made_up_to?: string };
};

export function companiesHouseEnabled(): boolean {
  return Boolean(process.env.COMPANIES_HOUSE_API_KEY);
}

export async function lookupCompany(
  companyNumber: string,
): Promise<{ ok: true; data: Partial<CompanyInput> } | { ok: false; error: string }> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return { ok: false, error: "COMPANIES_HOUSE_API_KEY is not set." };

  const number = companyNumber.trim().toUpperCase().padStart(8, "0");
  if (!/^[A-Z0-9]{8}$/.test(number)) return { ok: false, error: "That doesn't look like a company number." };

  let res: Response;
  try {
    res = await fetch(`https://api.company-information.service.gov.uk/company/${number}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` },
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Couldn't reach Companies House." };
  }
  if (res.status === 404) return { ok: false, error: `No company found with number ${number}.` };
  if (!res.ok) return { ok: false, error: `Companies House returned an error (${res.status}).` };

  const p = (await res.json()) as CompanyProfileResponse;
  return {
    ok: true,
    data: {
      name: p.company_name,
      companyNumber: p.company_number,
      incorporationDate: p.date_of_creation ?? null,
      accountsPeriodStart: p.accounts?.next_accounts?.period_start_on,
      accountsPeriodEnd: p.accounts?.next_accounts?.period_end_on ?? p.accounts?.next_made_up_to,
      confirmationStatementDate: p.confirmation_statement?.next_made_up_to,
    },
  };
}
