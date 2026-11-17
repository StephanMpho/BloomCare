# BloomCare — Pregnancy Nutrition & Wellness

*Nourishing you, caring for your little one.*

BloomCare is a private, mobile-first web app for a pregnant woman and, with her consent, her partner. It covers food, fluid and symptom logging, nausea-friendly meal planning, a ZAR grocery budget, supplements, appointments, pregnancy dating, reports, and partner sharing that she controls.

> **Medical safety.** BloomCare supports self-monitoring and general education. It does not diagnose, prescribe or replace antenatal care. Safety notices escalate to clinicians. Emergency in South Africa: **10177**, or **112** from a cellphone.

---

## Features

| Area | What works |
|---|---|
| **Onboarding** | Name, LMP, an optional clinician or ultrasound due date, and a quick symptom screen. Concerning answers show an **urgent-assessment notice before any tracking starts**. Acknowledging the notice is recorded, and the app says clearly that reading it doesn't mean she's been assessed. |
| **Dashboard** | Greeting, week and day, days to due date, today's plan with eaten/partly/not eaten/replaced/not tolerated, nutrition overview, tolerance lists, hydration, symptoms, next appointment, budget, partner requests and a 7-day chart. |
| **Food diary** | Instant search of SA foods plus her own custom foods, favourites and recents, portion size, amount eaten, tolerance, nausea or vomiting afterwards, and notes. Timeline with edit, duplicate and delete. Approximate nutrients show how many items had data. |
| **Nausea & symptoms** | Nausea on a 0–10 scale, vomiting, fluids kept down, appetite, warning signs, triggers and weight. Charts for today, 7 days and 30 days. "When to get help" guidance. A tolerance journal built only from what she logged. |
| **Safety rules** | `src/lib/safety.ts` holds transparent, unit-tested rules: **emergency** (severe pain, fainting, shoulder-tip pain, heavy bleeding), **urgent** (fluids not kept down, reduced urine, dizziness, weakness, weight loss, repeated vomiting, any pain before ultrasound confirmation, fever) and **contact a clinician** (spotting). They're evaluated over the last 24 hours of logs, drinks and check-ins, with no vomiting threshold to wait for. |
| **Hydration** | Drink type, ml offered and drunk, kept down / partly / not, temperature and notes. "Drunk" and "kept down" are always shown separately and never presented as a hydration status. |
| **Meal planner** | A 7-day plan from nausea-friendly templates. It skips foods she logged as not tolerated or listed as triggers, prefers foods she tolerates, and has a "gentle plan" for hard days. She can swap, remove, repeat or add her own meals, and save favourites. Marking a meal also adds it to the diary. If an urgent alert is active, the planner says medical care comes first. |
| **Grocery budget** | R3 000 by default (editable). Spent, remaining, planned, projected month-end and weekly average. Items can be grouped by category, supermarket (Shoprite, Checkers, Pick n Pay, Spar, Boxer) or weekly/monthly. The list is generated from the meal plan. Pantry items are excluded from cost. Actual prices replace estimates. |
| **Supplements** | Records only what a clinician or pharmacist recommends: dose as given, frequency, and who recommended it. Reminders work only for approved items. Flags overlapping ingredients and retinol (vitamin A). Taken/missed log and side effects. |
| **Food safety guide** | "Can I eat this?" checker over a sourced library: polony and cold meats, eggs, fish, dairy, caffeine, alcohol, herbal remedies and more. Foods it doesn't know get general rules plus "ask your clinician". It never generates answers. |
| **Nutrition guide** | Ten key nutrients: role, guidance, affordable SA foods, preparation, whether supplements may be needed, and when to ask a professional. Sources are linked. |
| **Journey** | LMP-based dating with ultrasound/clinician override, first-trimester stages (weeks 4–6, 7–9, 10–12, 13–14), and a weekly journal with private entries. |
| **Appointments** | Real appointments only, nothing invented. Questions before the visit, recommendations after, and costs. |
| **Reports** | 7 days, 30 days or a custom range. Charts plus CSV exports (food, symptoms, hydration, supplements, groceries, appointments). A printable clinician summary saves as PDF from the browser. |
| **Partner** | She creates a single-use invite and ticks exactly what to share (nothing by default). The partner gets a supportive dashboard and permission-gated pages. Access can be changed or revoked immediately. Partner views of sensitive areas are audit-logged. |
| **Privacy** | Full JSON export, account deletion with cascading removal, and an access log in Settings. |
| **UX** | Sidebar on desktop, bottom navigation on mobile, a floating **Log** button, dark mode, large touch targets, reduced-motion support and a table view for every chart. |

## Tech stack

Next.js 15 (App Router, server actions) · TypeScript · React 19 · Tailwind CSS v4 · Lucide · Recharts · **PostgreSQL + Drizzle ORM** · Zod · bcrypt · Vitest · Playwright.

**Why Drizzle instead of Prisma:** Prisma needs native engine binaries downloaded at install time, which weren't available in the build environment. Drizzle is pure TypeScript and fully typed, uses plain SQL migrations (`drizzle/`), and has no binaries to manage on any host. If you prefer Prisma, the schema in `src/db/schema.ts` maps one-to-one.

Authentication is custom and small: bcrypt (cost 12) password hashes, plus random 256-bit session tokens in an `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie. Only the **SHA-256 of the token** is stored. Login and reset attempts are rate-limited.

## Run locally

Requirements: Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env            # set DATABASE_URL and APP_URL
createdb bloomcare              # or create it in your Postgres tool
npm run db:migrate              # applies SQL migrations in drizzle/
npm run db:seed                 # reference food list (also auto-seeds on first use)
npm run dev                     # http://localhost:3000
```

Register her account first and complete onboarding. Then, in **Settings → Partner access**, create an invite and send the link. The partner registers with their own account and accepts.

### Tests

```bash
npm test                         # unit tests: dating, safety rules, permissions, budget, planner, nutrition, supplements, CSV
npm run build && npm start       # in another terminal, for the e2e run
CHROME_PATH=/usr/bin/google-chrome npm run test:e2e   # or `npx playwright install chromium` and omit CHROME_PATH
npm run lint && npm run typecheck
```

The end-to-end suite (mobile viewport) covers onboarding with the urgent notice, then workflows A–F: logging breakfast, recording vomiting and seeing the alert, meal plan to grocery list, shopping and budget, the doctor summary, and partner invite → limited view → denied section → revocation.

## Deploying (South Africa)

Keep health data in South Africa where you can. One straightforward option, since you already know Azure:

1. **Database:** Azure Database for PostgreSQL – Flexible Server in **South Africa North**. Turn on automated backups (7–35 days retention) and require TLS. Set `DATABASE_SSL=true`.
2. **App:** Azure App Service (Linux, Node 20) in the same region, or a container (`npm run build` then `npm start`). Set the `DATABASE_URL`, `APP_URL` (your https URL) and `NODE_ENV=production` app settings.
3. Run `npm run db:migrate` from CI or a one-off shell before each release.
4. Force HTTPS. Security headers (HSTS, frame-deny, nosniff, referrer policy) are already set in `next.config.ts`.

AWS **af-south-1 (Cape Town)** with RDS plus App Runner or ECS works the same way.

**Backup & recovery:** rely on the managed point-in-time restore, and test a restore once. Before risky migrations, take a manual `pg_dump`. Users can also download a full JSON export from Settings.

## Privacy & POPIA notes

- **Data minimisation:** only fields used by the features are collected. Every health question is optional.
- **Consent:** the partner sees nothing until she creates an invite (her consent is timestamped) and the partner accepts. Permissions are re-checked on **every request**, so revocation is immediate.
- **Special personal information** (health): it's stored only in her own pregnancy record. Personal notes are a separate permission, and journal entries can be private.
- **Access logging:** partner views of the food, symptoms, hydration, supplements and appointments pages, plus every export, are written to `audit_logs`. She can see this log in Settings.
- **Right of access / deletion:** JSON export, and account deletion that cascades through every table.
- **Retention:** records are kept until she deletes them. Expired sessions are cleaned up automatically. Before going live, write a short privacy notice and name an Information Officer (POPIA) — even for a family app this is good practice.

## Honest limitations / next steps

- **Nutrient data** comes from approximate USDA FoodData Central values for generic foods. It is **not SAFOODS (SAMRC)** data. SA-fortified foods (bread, maize meal) deliberately show "no data" and point to the pack label. Have a dietitian review the values, or license SAFOODS data and replace `src/lib/foods-data.ts`.
- **Medical content** was compiled from NHS, WHO, ACOG, RCOG and SA Department of Health sources (linked in-app, compiled 17 Nov 2026) but **hasn't been reviewed by a clinician**. The app says so.
- **Reminders** fire while the app is open in a browser tab (browser notifications or on-screen). True background push needs Web Push with a service worker and VAPID keys, or SMS/WhatsApp. That's a sensible next step.
- **Password-reset emails:** the reset link is written to the server log. Connect an email provider (e.g. Resend or SendGrid) in `forgotAction` before production.
- **Grocery prices** are labelled estimates. There's no live supermarket pricing, because no permitted public price feed exists.
- **Journal photos** aren't enabled yet. They need private object storage (e.g. Azure Blob with SAS URLs).
- The rate limiter is in-memory, so use a shared store if you run more than one instance.

## Project structure

```
src/
  app/
    (auth)/        login, register, forgot, reset
    (app)/         dashboard, food, hydration, symptoms, check-in, planner, groceries,
                   supplements, guide, journey, appointments, reports, settings, partner, more
    onboarding/    3-step onboarding with the safety notice
    invite/        partner invite acceptance
    actions/       server actions (Zod-validated, ownership + permission checked)
    api/           logout, CSV/JSON exports
  components/      UI kit, shell, safety banners, charts, forms
  db/              Drizzle schema + client
  lib/             dating, safety rules, permissions, nutrition, budget, meal templates,
                   content (nutrients, food safety, journey, sources)
drizzle/           SQL migrations
tests/unit         Vitest
tests/e2e          Playwright
```
