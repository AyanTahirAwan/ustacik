# Frontend Scaffold — TODO (Phase 2)

Branch: `feat/catalog-crud`

## Goal
Scaffold placeholder Edge pages + view routes for the frontend using the existing AdonisJS Edge + Alpine.js architecture. **No UI implementation, no business logic, no backend changes beyond view routes.**

## Steps

- [ ] 1. Create reusable `dashboard_layout.edge` component + `dashboard_sidebar.edge` partial
- [ ] 2. Add basic layout CSS for dashboard/page scaffolding in `resources/css/app.css`
- [ ] 3. Create public placeholder pages (5):
  - [ ] `pages/categories/index.edge`
  - [ ] `pages/categories/show.edge`
  - [ ] `pages/regions/index.edge`
  - [ ] `pages/search/index.edge`
  - [ ] `pages/craftsmen/index.edge`
- [ ] 4. Create craftsman dashboard placeholder pages (4):
  - [ ] `pages/craftsman/dashboard.edge`
  - [ ] `pages/craftsman/service-prices/index.edge`
  - [ ] `pages/craftsman/service-prices/create.edge`
  - [ ] `pages/craftsman/service-prices/edit.edge`
- [ ] 5. Create admin dashboard placeholder pages (10):
  - [ ] `pages/admin/dashboard.edge`
  - [ ] `pages/admin/categories/index.edge`
  - [ ] `pages/admin/categories/create.edge`
  - [ ] `pages/admin/categories/edit.edge`
  - [ ] `pages/admin/regions/index.edge`
  - [ ] `pages/admin/regions/create.edge`
  - [ ] `pages/admin/regions/edit.edge`
  - [ ] `pages/admin/sub-services/index.edge`
  - [ ] `pages/admin/sub-services/create.edge`
  - [ ] `pages/admin/sub-services/edit.edge`
- [ ] 6. Add view routes in `start/routes.ts`:
  - [ ] Public placeholder routes
  - [ ] Craftsman dashboard routes (auth + role craftsman|admin)
  - [ ] Admin dashboard routes (auth + role admin)
- [ ] 7. Verify scaffold (git status, route list)
- [ ] 8. Produce report (files created, routes added, components reused, placeholders created)

