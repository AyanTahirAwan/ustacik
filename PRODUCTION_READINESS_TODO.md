# Production Readiness — Task Checklist

## Progress Legend
- [x] = Done
- [ ] = Pending

## Test Coverage Expansion
- [x] Verify existing `catalog_crud.spec.ts` passes (24/24)
- [x] Create `tests/functional/helpers.ts` (shared fixtures)
- [x] Create `tests/functional/regions_crud.spec.ts` (admin region CRUD + auth + validation)
- [x] Create `tests/functional/auth_matrix.spec.ts` (role-based authorization matrix)
- [x] Add service-price `GET /:id` ownership tests (owner, cross-craftsman, admin, deleted→404)
- [x] Verify response body has no `passwordHash` leak
- [x] Run `npm run typecheck` — ✅ PASS
- [x] Run `npm run lint` — ✅ PASS
- [x] Run `npm test` — ✅ 66/66 passing

## Bug Found & Fixed
- [x] Fix unhandled 500 on partial price update (min > max) in `service_price_catalogs_controller.ts`
- [x] Add regression test for the fix

## Security Audit (non-blocking recommendations)
- [x] Document rate-limiting recommendation (login/signup/public endpoints)
- [x] Document CSP enablement recommendation
- [x] Document login brute-force throttling recommendation

## Reporting
- [x] Create `PRODUCTION_READINESS_AUDIT.md` (findings, severity, fixes, readiness score)

## Final Status
- [x] All checks green: typecheck, lint, test
- [x] No commit (user reviews first)
