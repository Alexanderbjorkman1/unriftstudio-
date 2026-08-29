# DetailFlow

A complete car detailing business app: an admin workspace for you, a public booking
website for your customers, and a mobile job app for your technicians — all on one
database.

Built with Next.js (App Router), TypeScript, Tailwind v4 and SQLite.

---

## Quick start

```bash
npm install
npm run seed     # creates ./data/detailflow.db with demo data
npm run dev      # http://localhost:3000
```

### Demo accounts

| Role       | Email                  | Password   |
| ---------- | ---------------------- | ---------- |
| Owner      | `alex@detailflow.se`   | `demo1234` |
| Technician | `johan@detailflow.se`  | `demo1234` |
| Technician | `emil@detailflow.se`   | `demo1234` |

## The three surfaces

### 1. Admin workspace (`/dashboard`) — owner only

| Page         | What it does                                                                       |
| ------------ | ---------------------------------------------------------------------------------- |
| Dashboard    | Today's KPIs, revenue chart (week / 30 days), today's schedule, recent jobs         |
| Calendar     | Month / week / day views, overlapping jobs laid out side by side, click a slot to book |
| Jobs         | Filter by status, technician or search; full job detail with checklist, photos, notes, products used |
| Customers    | CRM with lifetime spend, vehicles, job history and invoices                          |
| Vehicles     | Every car you've touched, with its full service history and size class               |
| Quotes       | Draft → sent → accepted, printable, one click to convert into a job                  |
| Invoices     | Auto-drafted when a job completes; printable; paid / overdue tracking                |
| Products     | Chemicals and consumables with stock levels, margins and reorder alerts              |
| Employees    | Team members, calendar colours, hourly rates and 30-day output                       |
| Reports      | Revenue over time, by service, by technician, top customers                          |
| Settings     | Business details, opening hours, booking rules, service packages, pricing rules      |

Global search (`⌘K`) spans customers, jobs, vehicles and invoices. The bell surfaces
overdue invoices, unassigned jobs, new online bookings and low stock.

### 2. Customer booking website (`/`)

Marketing page plus a four-step wizard: **choose service → your vehicle → location &
date → summary**. It reads live availability from the same calendar the shop works
from, prices the job as the customer fills it in (vehicle size × condition + travel
fee), and on submit creates the customer, the vehicle and the job — assigning a free
technician and generating the service's checklist.

The customer gets a booking number and an "add to calendar" link at
`/booking/<number>`.

### 3. Technician app (`/app`)

Mobile-first, for the person doing the work: today / this week / all jobs, start and
complete a job, tick off the checklist, shoot before & after photos, add notes, call or
navigate to the customer, and a profile tab with their own 30-day numbers.

## How pricing works

One rule set, applied identically on the booking site and in the admin
(`src/lib/pricing.ts`):

```
total = round(base_price × size_multiplier)
      + condition_surcharge%
      + travel_fee (mobile jobs only)
```

Size multipliers, condition surcharges, the travel fee and VAT are all editable under
**Settings → Pricing rules**. Dirty and very dirty cars also add 30 / 60 minutes to the
booked slot, so the calendar stays honest.

## Availability

Slots come from `src/lib/availability.ts`: opening days and hours, slot length, minimum
notice and how far ahead people may book — minus jobs already on the calendar, capped
by how many technicians are working that day. The slot is re-checked server side when
the booking is submitted, so a wizard left open in a tab can't double-book a bay.

## Project layout

```
src/
  app/
    (admin)/      dashboard, calendar, jobs, customers, vehicles,
                  quotes, invoices, products, employees, reports, settings
    (site)/       public booking website + confirmation
    (tech)/app/   technician mobile app
    api/          booking + availability, photo upload/serving, search, notifications
  components/
    ui/           buttons, cards, fields, tables, badges
    charts/       line, bar, donut, sparkline (hand-rolled SVG, no chart library)
    admin/  booking/  tech/
    car-art.tsx   parametric SVG vehicle silhouettes
  lib/
    db.ts schema + connection   seed.ts demo data
    repo/         typed queries per domain
    actions/      server actions
    auth.ts pricing.ts availability.ts dates.ts format.ts
```

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Development server                                  |
| `npm run build`     | Production build                                    |
| `npm start`         | Run the production build                            |
| `npm run seed`      | Drop and rebuild the demo database                  |
| `npm run lint`      | ESLint                                              |
| `npm run typecheck` | TypeScript, no emit                                 |

## Configuration

Copy `.env.example` to `.env.local`:

| Variable              | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `DATABASE_PATH`       | SQLite file (default `./data/detailflow.db`)        |
| `SESSION_SECRET`      | Change this in production                          |
| `NEXT_PUBLIC_APP_URL` | Base URL used in booking links                     |

## Notes on data

The database and uploaded photos live in `./data` and are git-ignored. The schema is
created on first connection and seeded automatically if the `users` table is empty, so
a fresh clone works with just `npm run dev`.

Job photos are stored on disk and served through `/api/uploads/<file>`, which requires a
signed-in session — customer cars never end up on a public URL.

Passwords are hashed with scrypt from Node's standard library; sessions are httpOnly
cookies stored in the `sessions` table.
