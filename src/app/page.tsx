import Link from "next/link";
import { headers } from "next/headers";
import { logout } from "./actions";
import { DeadlineTable } from "@/components/DeadlineTable";
import { requireSession } from "@/lib/auth";
import { listCompanies } from "@/lib/db";
import { HORIZON_MONTHS, trackDeadlines } from "@/lib/tracker";

export default async function DashboardPage() {
  await requireSession();
  const companies = listCompanies();

  if (companies.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">Welcome to Bumblebee</h1>
        <p className="mt-2 text-sm text-muted">
          Add your first company to see its Companies House and HMRC deadlines.
        </p>
        <Link href="/companies/new" className="btn-primary mt-6">
          Add a company
        </Link>
      </div>
    );
  }

  const all = trackDeadlines(companies);
  const outstanding = all.filter((d) => d.status !== "filed");
  const overdue = outstanding.filter((d) => d.status === "overdue").length;
  const dueSoon = outstanding.filter((d) => d.status === "due_soon").length;
  const calendarUrl = await calendarFeedUrl();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deadlines</h1>
          <p className="text-sm text-muted">
            Everything outstanding across {companies.length}{" "}
            {companies.length === 1 ? "company" : "companies"}, for the next {HORIZON_MONTHS} months.
          </p>
        </div>
        <form action={logout}>
          <button className="btn-secondary">Log out</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Overdue" value={overdue} tone={overdue ? "text-red-600 dark:text-red-400" : ""} />
        <Stat label="Due in 30 days" value={dueSoon} tone={dueSoon ? "text-amber-600 dark:text-amber-400" : ""} />
        <Stat label="Outstanding" value={outstanding.length} />
      </div>

      <DeadlineTable deadlines={outstanding} empty="All caught up. Nothing outstanding." />

      {calendarUrl && (
        <div className="card p-4 text-sm">
          <div className="font-medium">Calendar reminders</div>
          <p className="mt-1 text-muted">
            Subscribe to this feed in Google Calendar, Apple Calendar or Outlook to get alerts 14
            days and 3 days before each deadline. Keep the link private.
          </p>
          <code className="mt-2 block break-all rounded bg-background p-2 text-xs">{calendarUrl}</code>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

async function calendarFeedUrl(): Promise<string | null> {
  const token = process.env.CALENDAR_TOKEN;
  if (!token) return null;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/calendar?token=${encodeURIComponent(token)}`;
}
