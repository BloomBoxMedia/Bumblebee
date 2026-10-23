import Link from "next/link";
import { setFiled } from "@/app/actions";
import { formatDate, daysBetween, todayInLondon } from "@/lib/dates";
import type { DeadlineStatus } from "@/lib/deadlines";
import type { TrackedDeadline } from "@/lib/tracker";

const STATUS_STYLES: Record<DeadlineStatus, string> = {
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  due_soon: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  upcoming: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  filed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

function statusText(d: TrackedDeadline, today: string): string {
  if (d.status === "filed") return `Filed ${formatDate(d.filedOn!)}`;
  const days = daysBetween(today, d.due);
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

function period(d: TrackedDeadline): string {
  if (d.kind === "confirmation_statement") return `Made up to ${formatDate(d.periodEnd)}`;
  return d.periodStart
    ? `${formatDate(d.periodStart)} – ${formatDate(d.periodEnd)}`
    : `Period ending ${formatDate(d.periodEnd)}`;
}

export function DeadlineTable({
  deadlines,
  showCompany = true,
  empty = "Nothing to show.",
}: {
  deadlines: TrackedDeadline[];
  showCompany?: boolean;
  empty?: string;
}) {
  if (deadlines.length === 0) {
    return <p className="card p-6 text-sm text-muted">{empty}</p>;
  }
  const today = todayInLondon();
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">Due</th>
            {showCompany && <th className="px-4 py-2 font-medium">Company</th>}
            <th className="px-4 py-2 font-medium">Obligation</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {deadlines.map((d) => (
            <tr key={`${d.company.id}-${d.kind}-${d.periodEnd}`}>
              <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                {formatDate(d.due)}
              </td>
              {showCompany && (
                <td className="px-4 py-3">
                  <Link href={`/companies/${d.company.id}`} className="hover:underline">
                    {d.company.name}
                  </Link>
                </td>
              )}
              <td className="px-4 py-3">
                <div>{d.title}</div>
                <div className="text-xs text-muted">
                  {d.authority} · {period(d)}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[d.status]}`}
                >
                  {statusText(d, today)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <form action={setFiled}>
                  <input type="hidden" name="companyId" value={d.company.id} />
                  <input type="hidden" name="kind" value={d.kind} />
                  <input type="hidden" name="periodEnd" value={d.periodEnd} />
                  <input type="hidden" name="filed" value={d.status === "filed" ? "0" : "1"} />
                  <button className="btn-secondary whitespace-nowrap text-xs">
                    {d.status === "filed" ? "Undo" : "Mark filed"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
