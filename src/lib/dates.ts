// Calendar-date helpers. All dates are ISO "YYYY-MM-DD" strings handled in UTC,
// so there are no time-of-day or daylight-saving surprises.

export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  return toISO(fromISO(value)) === value;
}

function fromISO(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function isLastDayOfMonth(date: ISODate): boolean {
  const d = fromISO(date);
  return d.getUTCDate() === daysInMonth(d.getUTCFullYear(), d.getUTCMonth());
}

/**
 * Add calendar months. Days that don't exist in the target month are clamped
 * (31 Jan + 1 month = 28/29 Feb). With `endOfMonth`, a date on the last day of
 * its month always lands on the last day of the target month (30 Jun + 9 months
 * = 31 Mar), which is how Companies House and HMRC count from month-end dates.
 */
export function addMonths(
  date: ISODate,
  months: number,
  { endOfMonth = false }: { endOfMonth?: boolean } = {},
): ISODate {
  const d = fromISO(date);
  const total = d.getUTCMonth() + months;
  const year = d.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const last = daysInMonth(year, month);
  const day =
    endOfMonth && isLastDayOfMonth(date) ? last : Math.min(d.getUTCDate(), last);
  return toISO(new Date(Date.UTC(year, month, day)));
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = fromISO(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 86_400_000);
}

/** Today's date in the UK, regardless of the server's timezone. */
export function todayInLondon(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatDate(date: ISODate): string {
  return fromISO(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
