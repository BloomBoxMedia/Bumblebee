import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { ISODate } from "./dates";
import type { CompanyProfile, DeadlineKind, VatScheme } from "./deadlines";

export type Company = CompanyProfile & {
  id: number;
  name: string;
  companyNumber: string | null;
  notes: string;
};

export type CompanyInput = Omit<Company, "id">;

export type Filing = {
  companyId: number;
  kind: DeadlineKind;
  periodEnd: ISODate;
  filedOn: ISODate;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  company_number TEXT,
  incorporation_date TEXT,
  accounts_period_start TEXT NOT NULL,
  accounts_period_end TEXT NOT NULL,
  confirmation_statement_date TEXT NOT NULL,
  vat_scheme TEXT NOT NULL DEFAULT 'none',
  vat_period_end TEXT,
  paye_employer INTEGER NOT NULL DEFAULT 0,
  paye_from TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS filings (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  period_end TEXT NOT NULL,
  filed_on TEXT NOT NULL,
  PRIMARY KEY (company_id, kind, period_end)
);
`;

let db: Database.Database | undefined;

function getDb(): Database.Database {
  if (!db) {
    const file = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "bumblebee.db");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
  }
  return db;
}

type CompanyRow = {
  id: number;
  name: string;
  company_number: string | null;
  incorporation_date: string | null;
  accounts_period_start: string;
  accounts_period_end: string;
  confirmation_statement_date: string;
  vat_scheme: VatScheme;
  vat_period_end: string | null;
  paye_employer: number;
  paye_from: string | null;
  notes: string;
};

function toCompany(r: CompanyRow): Company {
  return {
    id: r.id,
    name: r.name,
    companyNumber: r.company_number,
    incorporationDate: r.incorporation_date,
    accountsPeriodStart: r.accounts_period_start,
    accountsPeriodEnd: r.accounts_period_end,
    confirmationStatementDate: r.confirmation_statement_date,
    vatScheme: r.vat_scheme,
    vatPeriodEnd: r.vat_period_end,
    payeEmployer: r.paye_employer === 1,
    payeFrom: r.paye_from,
    notes: r.notes,
  };
}

function toParams(c: CompanyInput) {
  return {
    name: c.name,
    company_number: c.companyNumber,
    incorporation_date: c.incorporationDate,
    accounts_period_start: c.accountsPeriodStart,
    accounts_period_end: c.accountsPeriodEnd,
    confirmation_statement_date: c.confirmationStatementDate,
    vat_scheme: c.vatScheme,
    vat_period_end: c.vatScheme === "none" ? null : c.vatPeriodEnd,
    paye_employer: c.payeEmployer ? 1 : 0,
    paye_from: c.payeEmployer ? c.payeFrom : null,
    notes: c.notes,
  };
}

export function listCompanies(): Company[] {
  const rows = getDb().prepare("SELECT * FROM companies ORDER BY name COLLATE NOCASE").all();
  return (rows as CompanyRow[]).map(toCompany);
}

export function getCompany(id: number): Company | undefined {
  const row = getDb().prepare("SELECT * FROM companies WHERE id = ?").get(id);
  return row ? toCompany(row as CompanyRow) : undefined;
}

export function createCompany(input: CompanyInput): number {
  const result = getDb()
    .prepare(
      `INSERT INTO companies (name, company_number, incorporation_date, accounts_period_start,
         accounts_period_end, confirmation_statement_date, vat_scheme, vat_period_end,
         paye_employer, paye_from, notes)
       VALUES (@name, @company_number, @incorporation_date, @accounts_period_start,
         @accounts_period_end, @confirmation_statement_date, @vat_scheme, @vat_period_end,
         @paye_employer, @paye_from, @notes)`,
    )
    .run(toParams(input));
  return Number(result.lastInsertRowid);
}

export function updateCompany(id: number, input: CompanyInput): void {
  getDb()
    .prepare(
      `UPDATE companies SET name = @name, company_number = @company_number,
         incorporation_date = @incorporation_date, accounts_period_start = @accounts_period_start,
         accounts_period_end = @accounts_period_end,
         confirmation_statement_date = @confirmation_statement_date, vat_scheme = @vat_scheme,
         vat_period_end = @vat_period_end, paye_employer = @paye_employer,
         paye_from = @paye_from, notes = @notes
       WHERE id = @id`,
    )
    .run({ ...toParams(input), id });
}

export function deleteCompany(id: number): void {
  getDb().prepare("DELETE FROM companies WHERE id = ?").run(id);
}

export function listFilings(companyId?: number): Filing[] {
  const sql =
    "SELECT company_id AS companyId, kind, period_end AS periodEnd, filed_on AS filedOn FROM filings" +
    (companyId === undefined ? "" : " WHERE company_id = ?");
  const stmt = getDb().prepare(sql);
  return (companyId === undefined ? stmt.all() : stmt.all(companyId)) as Filing[];
}

export function markFiled(f: Filing): void {
  getDb()
    .prepare(
      `INSERT INTO filings (company_id, kind, period_end, filed_on)
       VALUES (@companyId, @kind, @periodEnd, @filedOn)
       ON CONFLICT DO UPDATE SET filed_on = excluded.filed_on`,
    )
    .run(f);
}

export function unmarkFiled(f: Omit<Filing, "filedOn">): void {
  getDb()
    .prepare("DELETE FROM filings WHERE company_id = ? AND kind = ? AND period_end = ?")
    .run(f.companyId, f.kind, f.periodEnd);
}
