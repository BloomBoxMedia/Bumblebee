import "server-only";
import { addMonths, todayInLondon, type ISODate } from "./dates";
import { listCompanies, listFilings, type Company } from "./db";
import {
  deadlineKey,
  deadlineStatus,
  generateDeadlines,
  type Deadline,
  type DeadlineStatus,
} from "./deadlines";

export type TrackedDeadline = Deadline & {
  company: Pick<Company, "id" | "name">;
  status: DeadlineStatus;
  filedOn: ISODate | null;
};

/** How far ahead to list deadlines. */
export const HORIZON_MONTHS = 15;

export function trackDeadlines(companies: Company[] = listCompanies()): TrackedDeadline[] {
  const today = todayInLondon();
  const until = addMonths(today, HORIZON_MONTHS);
  const filed = new Map(
    listFilings().map((f) => [`${f.companyId}|${deadlineKey(f)}`, f.filedOn]),
  );

  return companies
    .flatMap((company) =>
      generateDeadlines(company, until).map((d) => {
        const filedOn = filed.get(`${company.id}|${deadlineKey(d)}`) ?? null;
        return {
          ...d,
          company: { id: company.id, name: company.name },
          status: deadlineStatus(d, today, filedOn !== null),
          filedOn,
        };
      }),
    )
    .sort((a, b) => a.due.localeCompare(b.due) || a.company.name.localeCompare(b.company.name));
}
