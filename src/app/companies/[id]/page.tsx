import Link from "next/link";
import { notFound } from "next/navigation";
import { removeCompany } from "@/app/actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DeadlineTable } from "@/components/DeadlineTable";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getCompany } from "@/lib/db";
import { trackDeadlines } from "@/lib/tracker";

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  await requireSession();
  const company = getCompany(Number((await params).id));
  if (!company) notFound();

  const deadlines = trackDeadlines([company]);
  const outstanding = deadlines.filter((d) => d.status !== "filed");
  const filed = deadlines.filter((d) => d.status === "filed").reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/companies" className="text-sm text-muted hover:underline">
            ← Companies
          </Link>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-muted">
            {[
              company.companyNumber && `Company no. ${company.companyNumber}`,
              company.incorporationDate && `Incorporated ${formatDate(company.incorporationDate)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          {company.companyNumber && (
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(company.companyNumber)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              Companies House ↗
            </a>
          )}
          <Link href={`/companies/${company.id}/edit`} className="btn-secondary">
            Edit
          </Link>
        </div>
      </div>

      {company.notes && (
        <p className="card whitespace-pre-wrap p-4 text-sm">{company.notes}</p>
      )}

      <section className="space-y-3">
        <h2 className="font-medium">Outstanding</h2>
        <DeadlineTable deadlines={outstanding} showCompany={false} empty="Nothing outstanding." />
      </section>

      {filed.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Filed</h2>
          <DeadlineTable deadlines={filed} showCompany={false} />
        </section>
      )}

      <form action={removeCompany.bind(null, company.id)} className="border-t border-border pt-6">
        <ConfirmButton
          message={`Delete ${company.name} and its filing history? This can't be undone.`}
          className="text-sm text-red-600 hover:underline"
        >
          Delete this company and its filing history
        </ConfirmButton>
      </form>
    </div>
  );
}
