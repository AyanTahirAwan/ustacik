# ustacik.com — Backend Merge & Fix Report

11 branches consolidated into `ustacik-backend-final`. This document covers
what came from where, every conflict and how it was resolved, and the two
rounds of fixes applied after the initial merge.

## Branches merged

| Branch | Contribution |
|---|---|
| `feature-db-nightshift-final` | Base repo: config, auth scaffold, most models, most migrations |
| `feat-catalog-crud` | Full catalog admin CRUD (categories/regions/sub-services/prices), admin+craftsman dashboard views, tests, API docs |
| `feature-users-routes` | Craftsman/customer/user controllers, suspended-account checks, subscription provisioning at signup |
| `feature-users-api-docs` | Correctly-named refresh-token/password-recovery/subscription controllers, user API docs |
| `feature-users-route-tests` | Auth, customer-address, and authorization test suites, shared test fixtures |
| `feature-verification-core-routes` | `request_id` migration fix, `disputed` job-status model support |
| `feature-frontend-design` | Restyled shared components, auth pages, error pages, header/layout |
| `feat-frontend` | Completed the search page (real fetch-based implementation), new `craftsman-card`/`search_filters` components |
| `feature-test-infrastructure` | Isolated test SQLite database, auto-migrate on test run |
| `feat-catalog-models`, `feature-users-schema` | Superseded entirely by `db-nightshift-final`; dropped |

## Conflicts found and how they were resolved

**`users` table migration** — two branches had independently rewritten the
same file with incompatible columns. `db-nightshift-final`'s version
(role/status/phone/password_hash) won; it's what every other branch was
already built against.

**`job_requests` migration was missing `request_id`** despite the model
requiring it — `db-nightshift-final` never had the column, only the model
field. Patched in the column from `verification-core-routes`, which had
independently found and fixed the same gap.

**`disputed` job status existed in the shipped migration but not in the
model.** The enum allowed it; `JobStatus` and `ALLOWED_TRANSITIONS` didn't
know about it, so any job that reached that status would crash
`canTransitionTo()`. Adopted `verification-core-routes`'s model, which
already had `disputed` typed with sensible transitions
(`accepted/in_progress/completed → disputed → completed/cancelled`).

**`category.ts` and `service_price_catalog.ts` models were behind their own
migrations.** `is_active` and a `subServicesCount` computed property existed
in the schema/migration but not the model. Took `catalog-crud`'s versions,
which had already caught up.

**`new_account_controller.ts` / `session_controller.ts` / `auth_middleware.ts`
diverged.** `users-routes` had two fixes `db-nightshift-final` lacked:
provisioning a free `Subscription` for new craftsmen at signup, and blocking
suspended accounts both at login (`session_controller`) and on every
subsequent request (`auth_middleware`, which also force-logs-out an
already-suspended session). Adopted `users-routes`'s versions of all three.

**Three controllers existed twice under different filenames** —
`refresh_token_controller.ts` vs `refresh_tokens_controller.ts` (and the
same pattern for password-recovery and subscriptions). Kept the
correctly-named versions from `users-api-docs`.

**Two independent, incompatible route designs for job status transitions.**
`verification-core-routes` used `router.resource()` with a single generic
`PATCH /jobs/:id` taking `{ status }` in the body. That design was rejected
in favor of named action endpoints (`/accept`, `/decline`, `/start`,
`/complete`, `/cancel`) — the generic version's `update()` method let a
customer cancel a job that had already started, and let a customer set
`status: 'disputed'` directly with no dispute record ever created. Wiring
those into `JobDisputesController` and `JobRequestsController` instead
closes both gaps.

**`api/` prefix convention.** `catalog-crud` already separated JSON
endpoints (`/api/...`) from server-rendered pages (bare paths). Every other
branch's endpoints were re-pointed under `/api/` to match, since the merged
app now serves both JSON and edge-rendered admin/craftsman pages side by
side and the two need to be distinguishable.

**`resources/views`.** `frontend-design`'s restyled shared components
(header, layout, buttons, auth pages, error pages) became the base;
`catalog-crud`'s admin/craftsman dashboard pages and public catalog pages
were layered on top, since neither branch touched the other's files.
`feat-frontend`'s search page replaced `catalog-crud`'s — the latter was
still a `TODO: API integration` placeholder; `feat-frontend`'s had the real
form and `fetch()` wiring. `feat-frontend`'s `auth_middleware.ts` and
`session_controller.ts` were **not** used — that branch predates the
suspended-account fix, so keeping it would have been a regression.

**No comments in any merged or authored code**, per instruction — stripped
programmatically from every file touched across both the merge and the fix
pass.

## Round 2: bugs found after the merge, now fixed

**Categories could be created and deleted through the admin API.**
`permissions.txt` is explicit that the 8 categories are locked — admin gets
view/edit only. `catalog-crud`'s `categories_controller.ts` had `store` and
`destroy` methods and both were routed. Removed both methods, both routes,
and the now-dead "+ Create Category" link and its `/admin/categories/create`
page route. The equivalent placeholder note in `admin/categories/index.edge`
was rewritten to say plainly why there's no create/delete action.

**Five test files were written against the rejected `.resource()` design**
and would have failed outright against the real routes: bare `/jobs`
instead of `/api/jobs`, a generic `PATCH /jobs/:id` with a `status` body
instead of the named action endpoints, unwrapped response bodies
(`response.body().status`) instead of the actual `{ job: {...} }` shape,
and in the disputes/verification-logs tests, a `jobId`/`craftsmanId` in the
request body where the real routes take it from the URL. All five were
rewritten against the actual contract:

- `job_requests.spec.ts` — `/api/jobs`, action endpoints for
  accept/decline/start/complete, `{ job }`-wrapped assertions, added cases
  for idempotent resubmission and the admin-can-cancel-in-progress /
  customer-cannot distinction.
- `reviews.spec.ts` — there is no generic `GET/DELETE /reviews` in this API;
  reading reviews is `GET /api/craftsmen/:craftsmanId/reviews` (public, no
  login), reply is `PATCH /api/reviews/:id/reply` with `{ message }`, delete
  is admin-only under `/api/admin/reviews/:id`. Rewrote around that,
  including the "no average until 3 reviews" and duplicate-helpful-vote
  cases.
- `job_disputes.spec.ts` — dispute creation is
  `POST /api/jobs/:jobId/disputes` (job id in the URL, not the body), and
  there was no customer-facing dispute listing or single-dispute fetch to
  test in the first place — removed those two cases rather than inventing
  endpoints for them. Added a `destroy` method (501, matching the same
  "audit records are never deleted" pattern already used on job requests)
  since a `DELETE` test with nothing to hit isn't a meaningful test. Fixed
  the resolution payloads to include the now-required `status` field.
- `verification_logs.spec.ts` — there is no unscoped `GET/POST /verifications`
  in this API; everything is scoped to a craftsman
  (`/api/admin/craftsmen/:craftsmanId/verification-logs`). The original
  "Admin can delete a verification log" test was actively wrong — deleting
  a verification log is exactly what `permissions.txt` forbids — replaced
  with a test asserting no such route exists (404).
- `integration_workflow.spec.ts` — same path/shape corrections applied
  across the full job → accept → start → complete → review → reply chain
  and the job → dispute → admin-resolution chain.

## What's still true from the earlier assessment, unchanged by this pass

- Never installed, migrated, or run — everything above is static analysis
  (hashing, diffing, brace-balance checks), not execution. `npm install`,
  `node ace generate:key`, a real `.env`, and `node ace migration:fresh`
  are still needed before this runs anywhere.
- No seed data for categories/sub-services/regions — tables exist, empty.
- Auth is still session-cookie only; `refresh_tokens` exists but nothing
  issues or checks a JWT.
- CORS configuration is unverified.
- Two overlapping search endpoints (`/api/search/services` and
  `/api/catalog/prices`) still both exist with different response shapes.
- Admin is still missing "Reset Passwords" / "Archive Users"; "Reject
  Verification" still isn't representable in the schema.
- No file/image upload handling — work photos and verification documents
  are plain URL string fields.
