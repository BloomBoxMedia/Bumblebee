import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyForm } from "@/components/CompanyForm";
import { requireSession } from "@/lib/auth";
import { getCompany } from "@/lib/db";

export default async function EditCompanyPage({ params }: PageProps<"/companies/[id]/edit">) {
  await requireSession();
  const company = getCompany(Number((await params).id));
  if (!company) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/companies/${company.id}`} className="text-sm text-muted hover:underline">
          ← {company.name}
        </Link>
        <h1 className="text-2xl font-semibold">Edit company</h1>
      </div>
      <CompanyForm id={company.id} defaults={company} />
    </div>
  );
}
