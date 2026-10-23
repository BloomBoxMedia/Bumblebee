"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { passwordMatches, requireSession } from "@/lib/auth";
import { parseCompanyForm } from "@/lib/company-form";
import { isISODate, todayInLondon } from "@/lib/dates";
import { createCompany, deleteCompany, markFiled, unmarkFiled, updateCompany } from "@/lib/db";
import { KIND_LABELS, type DeadlineKind } from "@/lib/deadlines";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  if (!process.env.APP_PASSWORD) return "APP_PASSWORD isn't configured on the server.";
  if (!passwordMatches(String(form.get("password") ?? ""))) return "Incorrect password.";
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export type CompanyFormState = { errors: Record<string, string> } | null;

export async function saveCompany(
  id: number | null,
  _prev: CompanyFormState,
  form: FormData,
): Promise<CompanyFormState> {
  await requireSession();
  const parsed = parseCompanyForm(form);
  if (!parsed.ok) return { errors: parsed.errors };

  let companyId = id;
  if (companyId === null) companyId = createCompany(parsed.company);
  else updateCompany(companyId, parsed.company);

  revalidatePath("/", "layout");
  redirect(`/companies/${companyId}`);
}

export async function removeCompany(id: number) {
  await requireSession();
  deleteCompany(id);
  revalidatePath("/", "layout");
  redirect("/companies");
}

function filingFromForm(form: FormData) {
  const companyId = Number(form.get("companyId"));
  const kind = String(form.get("kind")) as DeadlineKind;
  const periodEnd = String(form.get("periodEnd"));
  if (!Number.isInteger(companyId) || !(kind in KIND_LABELS) || !isISODate(periodEnd)) {
    throw new Error("Invalid filing");
  }
  return { companyId, kind, periodEnd };
}

export async function setFiled(form: FormData) {
  await requireSession();
  const filing = filingFromForm(form);
  if (form.get("filed") === "1") markFiled({ ...filing, filedOn: todayInLondon() });
  else unmarkFiled(filing);
  revalidatePath("/", "layout");
}
