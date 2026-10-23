import { CompanyForm } from "@/components/CompanyForm";
import { requireSession } from "@/lib/auth";
import { companiesHouseEnabled, lookupCompany } from "@/lib/companies-house";

export default async function NewCompanyPage({ searchParams }: PageProps<"/companies/new">) {
  await requireSession();
  const { lookup } = await searchParams;
  const number = typeof lookup === "string" ? lookup.trim() : "";
  const result = number ? await lookupCompany(number) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Add a company</h1>

      {companiesHouseEnabled() && (
        <form className="card flex flex-wrap items-end gap-3 p-5">
          <label className="flex-1 space-y-1 text-sm">
            <span className="font-medium">Fill in from Companies House</span>
            <input
              name="lookup"
              defaultValue={number}
              placeholder="Company number, e.g. 12345678"
              className="input"
            />
          </label>
          <button className="btn-secondary">Look up</button>
          {result && !result.ok && <p className="w-full text-sm text-red-600">{result.error}</p>}
          {result?.ok && (
            <p className="w-full text-sm text-emerald-700 dark:text-emerald-400">
              Found {result.data.name}. Check the details below and add VAT and payroll.
            </p>
          )}
        </form>
      )}

      <CompanyForm
        key={number}
        id={null}
        defaults={{ vatScheme: "none", ...(result?.ok ? result.data : {}) }}
      />
    </div>
  );
}
