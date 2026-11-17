# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

BloomCare is a mobile-first Next.js 15 app (App Router, server actions, React 19, Tailwind v4) for pregnancy nutrition and symptom tracking, with consent-based partner sharing. It uses PostgreSQL with Drizzle ORM (not Prisma). The audience is South African: dates use SAST and money is ZAR.

## Commands

```bash
npm run dev            # http://localhost:3000 (needs .env from .env.example: DATABASE_URL, APP_URL, DATABASE_SSL)
npm run lint           # eslint src
npm run typecheck      # tsc --noEmit
npm test               # Vitest unit tests (tests/**/*.test.ts)
npx vitest run -t "safety rules"          # run one describe/it block by name
npx vitest run tests/unit/core.test.ts    # run one file
npm run test:e2e       # Playwright (Pixel 7 mobile project); needs the app running at E2E_BASE_URL (default :3000),
                       # e.g. `npm run build && npm start` first. Set CHROME_PATH or `npx playwright install chromium`.
npm run db:generate    # generate a SQL migration in drizzle/ after editing src/db/schema.ts
npm run db:migrate     # apply migrations
npm run db:seed        # idempotent upsert of reference foods (src/lib/foods-data.ts); also auto-seeds on first use
```

Unit tests alias `server-only` to `tests/server-only-stub.ts`, so pure `src/lib` modules can be imported in tests. Keep business rules pure and DB-free (`safety.ts`, `pregnancy.ts`, `budget.ts`, `permissions.ts`, etc.) so they stay unit-testable.

## Architecture

**Data ownership.** Every health record hangs off one `pregnancies` row (owned by the pregnant user, `ownerId`) through a `pregnancyId` FK. Deleting an account cascades through every table. Schema: `src/db/schema.ts`. The client and pooled `db` live in `src/db/index.ts`, imported as `import { db, schema } from "@/db"`.

**Request context and authorisation (`src/lib/context.ts`).** This is the central piece. `getContext()` (React `cache`d) resolves the signed-in user to either:
- **OWNER**, who sees their own pregnancy, or
- **PARTNER**, who sees one only through an accepted, non-revoked `partner_access` row. Permissions are re-read from the DB on every request, so revocation takes effect immediately.

Use the right guard:
- Pages: `requireContext()` (redirects to `/login` or `/onboarding`), `requirePermission(p, { audit })`, `requireOwner()`.
- Server actions: `actionContext(p?)`, which throws user-safe errors instead of redirecting.
- Partner views or writes of sensitive areas must call `audit(ctx, action)` and write to `audit_logs`, which the owner can see in Settings.

Permission keys and the area → permission map are in `src/lib/permissions.ts`. Nothing is shared by default, and `can()` always returns true for owners.

**Server actions (`src/app/actions/*.ts`).** These follow a fixed pattern. `useActionState`-style signature `(prev: ActionResult, fd: FormData)` → wrap the body in `safe()` from `src/lib/form.ts` (turns Zod or thrown errors into `{ error }` and lets `NEXT_REDIRECT` through) → `actionContext(permission)` → parse with Zod using the `str/bool/numOrNull/isoDate/hhmm` helpers → for edits and deletes, check that the row's `pregnancyId` matches `ctx.pregnancy.id` → write → `revalidatePath` on the affected pages → `redirect`. Write error messages in plain, supportive language, because they're shown directly to users.

**Safety rules.** `src/lib/safety.ts` holds pure, unit-tested rules that map symptom snapshots to EMERGENCY / URGENT / CONTACT_CLINICIAN alerts. `src/lib/safety-status.ts` (server-only) merges the last 24 hours of symptom logs, drink retention and today's check-in, then applies acknowledgements. `src/app/(app)/layout.tsx` renders active alerts on every app page, for owners and for partners with `VIEW_SYMPTOMS`. Changes here are medically sensitive: keep rules transparent, add tests, and never add a "wait for N vomits" threshold. Logging vomiting in the food diary also creates a symptom log.

**Dates and money.** Calendar dates are `YYYY-MM-DD` strings in Africa/Johannesburg. Use `src/lib/dates.ts` (`todayISO`, `dayBounds`, `sastInstant`), never raw `new Date()` arithmetic. Money is stored as integer cents (ZAR); format and parse it with `src/lib/money.ts`. Pregnancy dating (LMP with ultrasound/clinician override) lives in `src/lib/pregnancy.ts`.

**Routing.** `src/app/(auth)` holds the public auth pages. `src/app/(app)` holds the authenticated app, whose layout calls `requireContext()` and renders the `Shell`. `onboarding/` is the 3-step setup with the urgent-assessment notice. `invite/[token]` handles partner invite acceptance. `api/export/[kind]` serves CSV/JSON exports (audited), and `api/logout` ends the session. Shared read queries are in `src/lib/queries.ts`.

**Auth (`src/lib/auth.ts`).** Custom: bcrypt (cost 12) password hashes, random session tokens in an httpOnly cookie, and only the SHA-256 of the token stored in `sessions`. The rate limiter is in memory. Password-reset links are currently only logged to the server console.

**Content.** Medical and nutrition content in `src/lib/content/` is static and cites sources (`sources.ts`). The food-safety checker only returns curated answers and never generates them. Nutrient data in `foods-data.ts` is approximate USDA data, and SA-fortified foods intentionally have no data.

## Conventions

- Path alias `@/` → `src/`. Server-only modules start with `import "server-only"`.
- The app must not diagnose or prescribe. Supplements record only clinician-recommended items, and appointments are never invented. Keep the "not medical advice" framing and emergency numbers (10177 / 112) intact.
- After schema changes, run `npm run db:generate` and commit the generated SQL in `drizzle/`.
