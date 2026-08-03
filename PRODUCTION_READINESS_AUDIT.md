# Production Readiness Audit & Test Coverage Expansion

**Branch:** `feat/catalog-crud`
**Date:** Mon 03 Aug 2026
**Status:** All checks passing

---

## 1. Command Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ PASS (exit 0, no errors) |
| `npm test` | ✅ PASS — **127/127 tests** (24 existing + 103 new) |
| `npm run lint` | ✅ PASS (exit 0, no errors) |

---

## 2. Test Coverage Added

### New Files
- `tests/functional/helpers.ts` — Shared fixture helpers (`createAdmin`, `createCraftsman`, `createCustomer`, `seedCatalog`, `createPriceEntry`).
- `tests/functional/regions_crud.spec.ts` — Admin CRUD for regions (create/list/show/update/delete), authorization (customer/craftsman blocked), validation (missing name, duplicates, invalid types, empty, max length), 404 handling, 409 on cascade-restricted delete.
- `tests/functional/auth_matrix.spec.ts` — Role-based authorization matrix:
  - Unauthenticated → 401 on admin & craftsman routes (JSON API).
  - Customer → blocked from admin & craftsman routes (403).
  - Craftsman → blocked from admin routes; can manage own prices; cannot view/edit others' prices.
  - Admin → full access to admin routes; can view/edit/delete any craftsman price.
- `tests/functional/categories_crud.spec.ts` — Admin category CRUD index/show/update/delete, `subServicesCount` preload serialization, response shape, ordering, 404/409 handling.
- `tests/functional/sub_services_crud.spec.ts` — Admin sub-service CRUD, `categoryId` filtering, category preload on show, 404 handling.
- `tests/functional/validation.spec.ts` — Comprehensive 422 coverage: missing fields, invalid types, length constraints, invalid foreign keys, price rules (negative, max<min, invalid currency).
- `tests/functional/edge_cases.spec.ts` — Deleted/duplicate/non-existent resources, empty search results, malformed query params, and no `passwordHash` leaks.

### Coverage Areas (per team-leader requirements)
1. ✅ Complete CRUD for categories, sub-services, regions, service-price catalog
2. ✅ Edge cases: 404 / 409 / 422
3. ✅ Input validation (missing fields, duplicates, invalid types, empty, max length, negative prices, price range violation)
4. ✅ Response body verification — including **no `passwordHash` leak**
5. ✅ Authorization matrix (`auth_matrix.spec.ts`)
6. ✅ Service-price catalog `GET /api/craftsman/service-prices/:id` (owner view, cross-craftsman forbidden, admin access, deleted → 404)

---

## 3. Real Bug Found & Fixed

### Bug: Partial update of service price can throw unhandled 500
**File:** `app/controllers/service_price_catalogs_controller.ts`

**Severity:** High (stability / data-integrity)

**Issue:** The `maximumPriceIsNotBelowMinimum` Vine rule only compares `minPrice` / `maxPrice` **when both exist in the same request payload**. A partial update that raises `minPrice` above the existing `maxPrice` (or vice versa) passed validation, then hit the DB `CHECK (max_price >= min_price)` constraint and threw an **unhandled 500**.

**Fix:** In `update()`, after applying the new field values, validate the final combined range against the existing record before saving. If `maxPrice < minPrice`, return a `422` with a structured `errors` array (consistent with the rest of the API) instead of a 500.

**Test added:** `admin cannot lower minPrice above existing maxPrice (422)` in `auth_matrix.spec.ts`.

### Bug: `subServicesCount` omitted from category list API response
**File:** `app/models/category.ts`

**Severity:** Medium (API contract / missing feature data)

**Issue:** The admin `CategoriesController.index()` used `.withCount('subServices')`, but Lucid stores the aggregate in the model's `$extras` bag, which is **not serialized by default**. The `subServicesCount` field was therefore missing from the JSON response (`$extras` was `undefined`).

**Fix:** Added a `@computed()` getter `subServicesCount` that reads `this.$extras.subServices_count` (the alias Lucid generates for `withCount('subServices')`). This makes the count appear in the JSON payload.

**Test added:** `admin can list categories with subServicesCount` in `categories_crud.spec.ts`.

---

## 4. Security Observations (from audit)

- **Authentication** — Session-based `web` guard with scrypt hashing (cost 16384). Password hashes are `serializeAs: null` (never serialized). ✅
- **Authorization** — `auth` + `role` middleware correctly applied to admin and craftsman route groups. ✅
- **Ownership** — Craftsman price records enforce `craftsmanId === auth.user.id` on show/update/destroy/toggle. ✅
- **CSRF** — Shield CSRF enabled for POST/PUT/PATCH/DELETE, `sameSite: lax`, `httpOnly: true`. ✅
- **Session** — `httpOnly`, `secure` in production, `sameSite: lax`, 2h age. ✅
- **Input validation** — Vine validators on all write endpoints + catalog search. ✅
- **SQL injection** — All queries use Lucid query builder / parameterized values. ✅
- **XSS** — Shield CSP can be enabled; Edge templates. `xFrame: DENY`, `nosniff`. ✅
- **Environment leaks** — `.env` files are gitignored; `APP_KEY` is a secret. Debug mode disabled in production. ✅

### Recommended (non-blocking, pre-Monday)
- **Rate limiting** — No rate limiting middleware configured. **Recommendation:** add rate limiting (e.g. `@adonisjs/limiter`) for login/signup and public price-search endpoints before public launch. *(Medium)*
- **CSP** — Shield `csp.enabled` is `false`. Enable a default CSP policy before production launch. *(Medium)*
- **Login brute-force** — signup/login currently has no throttling. Combine with rate limiting.

---

## 5. Final Readiness Score for Monday Demo

**9 / 10 — READY**

All functional requirements are met, all **127 tests** pass, typecheck and lint are clean, and the real bugs found during the audit (price range partial-update 500, `subServicesCount` missing from category response) have been fixed. The only remaining items (rate limiting, CSP) are non-blocking for the Monday demo but recommended before public launch.
