"use client";

import { useActionState, useState } from "react";
import { saveCompany, type CompanyFormState } from "@/app/actions";
import type { CompanyInput } from "@/lib/db";
import type { VatScheme } from "@/lib/deadlines";

type Defaults = Partial<CompanyInput>;

export function CompanyForm({ id, defaults }: { id: number | null; defaults: Defaults }) {
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(
    saveCompany.bind(null, id),
    null,
  );
  const [vatScheme, setVatScheme] = useState<VatScheme>(defaults.vatScheme ?? "none");
  const [paye, setPaye] = useState(defaults.payeEmployer ?? false);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="space-y-8">
      {Object.keys(errors).length > 0 && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Please fix the highlighted fields.
        </p>
      )}

      <Section title="Company">
        <Field label="Company name" name="name" error={errors.name}>
          <input name="name" defaultValue={defaults.name} className="input" required />
        </Field>
        <Field label="Company number" name="companyNumber" error={errors.companyNumber}>
          <input name="companyNumber" defaultValue={defaults.companyNumber ?? ""} className="input" />
        </Field>
        <Field
          label="Incorporation date"
          name="incorporationDate"
          error={errors.incorporationDate}
          hint="Used to work out the deadline for a company's first accounts."
        >
          <DateInput name="incorporationDate" value={defaults.incorporationDate} />
        </Field>
      </Section>

      <Section
        title="Companies House"
        description="Use the dates under 'Accounts' and 'Confirmation statement' on the company's Companies House page."
      >
        <Field
          label="Next accounts period starts"
          name="accountsPeriodStart"
          error={errors.accountsPeriodStart}
          hint="The day after the last accounts were made up to, or the incorporation date for first accounts."
        >
          <DateInput name="accountsPeriodStart" value={defaults.accountsPeriodStart} required />
        </Field>
        <Field
          label="Next accounts made up to"
          name="accountsPeriodEnd"
          error={errors.accountsPeriodEnd}
          hint="Corporation Tax deadlines are worked out from the same period."
        >
          <DateInput name="accountsPeriodEnd" value={defaults.accountsPeriodEnd} required />
        </Field>
        <Field
          label="Next confirmation statement date"
          name="confirmationStatementDate"
          error={errors.confirmationStatementDate}
          hint="Companies House calls this the 'next statement date'. The filing is due 14 days after it."
        >
          <DateInput
            name="confirmationStatementDate"
            value={defaults.confirmationStatementDate}
            required
          />
        </Field>
      </Section>

      <Section title="VAT and payroll">
        <Field label="VAT" name="vatScheme" error={errors.vatScheme}>
          <select
            name="vatScheme"
            value={vatScheme}
            onChange={(e) => setVatScheme(e.target.value as VatScheme)}
            className="input"
          >
            <option value="none">Not VAT registered</option>
            <option value="quarterly">Quarterly returns</option>
            <option value="monthly">Monthly returns</option>
            <option value="annual">Annual Accounting Scheme</option>
          </select>
        </Field>
        {vatScheme !== "none" && (
          <Field
            label="Current VAT period ends"
            name="vatPeriodEnd"
            error={errors.vatPeriodEnd}
            hint="The end of the next VAT period you haven't filed yet. It's shown in your HMRC VAT account."
          >
            <DateInput name="vatPeriodEnd" value={defaults.vatPeriodEnd} required />
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="payeEmployer"
            checked={paye}
            onChange={(e) => setPaye(e.target.checked)}
          />
          Runs a payroll (PAYE employer, including director-only payroll)
        </label>
        {paye && (
          <Field
            label="Track PAYE payments from"
            name="payeFrom"
            error={errors.payeFrom}
            hint="PAYE is due on the 22nd of each month. Payments are listed from this date onwards."
          >
            <DateInput name="payeFrom" value={defaults.payeFrom} required />
          </Field>
        )}
      </Section>

      <Section title="Notes">
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          rows={3}
          className="input"
          placeholder="Accountant, UTR, authentication codes location…"
        />
      </Section>

      <button className="btn-primary" disabled={pending}>
        {pending ? "Saving…" : id === null ? "Add company" : "Save changes"}
      </button>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card space-y-4 p-5">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

function DateInput({
  name,
  value,
  required,
}: {
  name: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <input
      id={name}
      type="date"
      name={name}
      defaultValue={value ?? ""}
      required={required}
      className="input max-w-xs"
    />
  );
}
