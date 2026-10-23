# Bumblebee

A private, single-user web app that tracks statutory filing deadlines for UK private limited companies.

For each company it lists:

| Obligation | Authority | Rule |
| --- | --- | --- |
| Confirmation statement | Companies House | 14 days after the confirmation (made-up-to) date, every year |
| Annual accounts | Companies House | 9 months after the period end. First accounts covering more than 12 months are due 21 months after incorporation |
| Corporation Tax payment | HMRC | 9 months and 1 day after the end of the CT accounting period |
| CT600 return | HMRC | 12 months after the end of the CT accounting period |
| VAT return & payment | HMRC | 1 month and 7 days after the period end (2 months for the Annual Accounting Scheme) |
| PAYE & NIC payment | HMRC | 22nd of the month after each tax month (electronic payment) |

Accounts periods longer than 12 months are split into two Corporation Tax periods automatically.
The rules live in `src/lib/deadlines.ts` and are covered by `src/lib/deadlines.test.ts`.
Large companies (quarterly instalment payments) are out of scope.

**Important:** this is a reminder tool, not advice. Check dates against the Companies House
service and your HMRC online account, particularly after changing an accounting reference date.

## How it works

Each company stores the *next* outstanding period for each obligation, as shown on Companies House
and in HMRC. Deadlines are generated forward from there for the next 15 months. **Mark filed**
records a filing; the next period is already listed.

- **Dashboard:** overdue items, items due within 30 days, and everything else outstanding.
- **Companies House lookup:** with `COMPANIES_HOUSE_API_KEY` set, enter a company number to fill
  in the name, incorporation date, accounts period and confirmation date.
- **Calendar feed:** with `CALENDAR_TOKEN` set, subscribe to the URL shown on the dashboard to
  get calendar alerts 14 days and 3 days before each deadline.

## Running locally

```bash
cp .env.example .env.local   # then fill in APP_PASSWORD and SESSION_SECRET
npm install
npm run dev                  # http://localhost:3000
npm test                     # deadline rule tests
```

Data is stored in SQLite at `./data/bumblebee.db`. Set `DATABASE_PATH` to change the location.

## Deploying

The app needs a persistent disk for the SQLite file. Any Node host with a volume works,
for example a small VPS, Railway or Fly.io. Serverless hosts like Vercel don't keep the file.

```bash
npm run build && npm start
```

Serve the app over HTTPS, set a strong `APP_PASSWORD`, and back up the database file.

## Stack

Next.js 16 (App Router, server actions), React 19, Tailwind CSS 4, better-sqlite3, and jose
for the session cookie. Vitest is used for the tests.
