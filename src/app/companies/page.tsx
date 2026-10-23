import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { listCompanies } from "@/lib/db";
import { trackDeadlines } from "@/lib/tracker";

export default async function CompaniesPage() {
  await requireSession();
  const companies = listCompanies();
  const outstanding = trackDeadlines(companies).filter((d) => d.status !== "filed");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Link href="/companies/new" className="btn-primary">
          Add company
        </Link>
      </div>
      {companies.length === 0 ? (
        <p className="card p-6 text-sm text-muted">No companies yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {companies.map((c) => {
            const mine = outstanding.filter((d) => d.company.id === c.id);
            const overdue = mine.filter((d) => d.status === "overdue").length;
            const next = mine[0];
            return (
              <li key={c.id}>
                <Link href={`/companies/${c.id}`} className="card block p-5 hover:border-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.companyNumber && <div className="text-xs text-muted">{c.companyNumber}</div>}
                    </div>
                    {overdue > 0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                        {overdue} overdue
                      </span>
                    )}
                  </div>
                  <div className="mt-3 text-sm text-muted">
                    {next ? `Next: ${next.title}, ${formatDate(next.due)}` : "Nothing outstanding"}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
