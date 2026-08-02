/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
| The routes file is used for defining the HTTP routes.
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

/*
|--------------------------------------------------------------------------
| Guest routes (no auth required)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

/*
|--------------------------------------------------------------------------
| Public catalog routes (no auth required)
|--------------------------------------------------------------------------
*/
router.get('api/catalog/categories', [controllers.Catalog, 'categories'])
router.get('api/catalog/categories/:categoryId/sub-services', [controllers.Catalog, 'subServices'])
router.get('api/catalog/regions', [controllers.Catalog, 'regions'])
router.get('api/search/services', [controllers.Catalog, 'search'])

/*
|--------------------------------------------------------------------------
| Public view routes — placeholder pages (no auth required)
|--------------------------------------------------------------------------
*/
router.get('categories', ({ view }) => view.render('pages/categories/index'))
router.get('categories/:categoryId', ({ params, view }) =>
  view.render('pages/categories/show', { categoryId: params.categoryId })
)
router.get('regions', ({ view }) => view.render('pages/regions/index'))
router.get('search', ({ view }) => view.render('pages/search/index'))
router.get('craftsmen', ({ view }) => view.render('pages/craftsmen/index'))

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
  })
  .use(middleware.auth())

/*
|--------------------------------------------------------------------------
| Admin CRUD — Categories
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('api/admin/categories', [controllers.Categories, 'index'])
    router.post('api/admin/categories', [controllers.Categories, 'store'])
    router.get('api/admin/categories/:id', [controllers.Categories, 'show'])
    router.patch('api/admin/categories/:id', [controllers.Categories, 'update'])
    router.delete('api/admin/categories/:id', [controllers.Categories, 'destroy'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['admin'] }))

/*
|--------------------------------------------------------------------------
| Admin CRUD — Sub-Services
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('api/admin/sub-services', [controllers.SubServices, 'index'])
    router.post('api/admin/sub-services', [controllers.SubServices, 'store'])
    router.get('api/admin/sub-services/:id', [controllers.SubServices, 'show'])
    router.patch('api/admin/sub-services/:id', [controllers.SubServices, 'update'])
    router.delete('api/admin/sub-services/:id', [controllers.SubServices, 'destroy'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['admin'] }))

/*
|--------------------------------------------------------------------------
| Admin CRUD — Regions
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('api/admin/regions', [controllers.Regions, 'index'])
    router.post('api/admin/regions', [controllers.Regions, 'store'])
    router.get('api/admin/regions/:id', [controllers.Regions, 'show'])
    router.patch('api/admin/regions/:id', [controllers.Regions, 'update'])
    router.delete('api/admin/regions/:id', [controllers.Regions, 'destroy'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['admin'] }))

/*
|--------------------------------------------------------------------------
| Public price search (no auth required)
|--------------------------------------------------------------------------
*/
router.get('api/catalog/prices', [controllers.ServicePriceCatalogs, 'index'])

/*
|--------------------------------------------------------------------------
| Craftsman — Service Price Catalog
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.post('api/craftsman/service-prices', [controllers.ServicePriceCatalogs, 'store'])
    router.get('api/craftsman/service-prices/:id', [controllers.ServicePriceCatalogs, 'show'])
    router.patch('api/craftsman/service-prices/:id', [controllers.ServicePriceCatalogs, 'update'])
    router.delete('api/craftsman/service-prices/:id', [controllers.ServicePriceCatalogs, 'destroy'])
    router.patch('api/craftsman/service-prices/:id/toggle-active', [
      controllers.ServicePriceCatalogs,
      'toggleActive',
    ])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['craftsman', 'admin'] }))

/*
|--------------------------------------------------------------------------
| Craftsman dashboard view routes — placeholder pages (auth + role)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('craftsman', ({ view }) => view.render('pages/craftsman/dashboard'))

    router.get('craftsman/service-prices', ({ view }) =>
      view.render('pages/craftsman/service-prices/index')
    )
    router.get('craftsman/service-prices/create', ({ view }) =>
      view.render('pages/craftsman/service-prices/create')
    )
    router.get('craftsman/service-prices/:priceId/edit', ({ params, view }) =>
      view.render('pages/craftsman/service-prices/edit', { priceId: params.priceId })
    )
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['craftsman', 'admin'] }))

/*
|--------------------------------------------------------------------------
| Admin dashboard view routes — placeholder pages (auth + role admin)
|--------------------------------------------------------------------------
*/
router
  .group(() => {
    router.get('admin', ({ view }) => view.render('pages/admin/dashboard'))

    router.get('admin/categories', ({ view }) => view.render('pages/admin/categories/index'))
    router.get('admin/categories/create', ({ view }) =>
      view.render('pages/admin/categories/create')
    )
    router.get('admin/categories/:categoryId/edit', ({ params, view }) =>
      view.render('pages/admin/categories/edit', { categoryId: params.categoryId })
    )

    router.get('admin/regions', ({ view }) => view.render('pages/admin/regions/index'))
    router.get('admin/regions/create', ({ view }) => view.render('pages/admin/regions/create'))
    router.get('admin/regions/:regionId/edit', ({ params, view }) =>
      view.render('pages/admin/regions/edit', { regionId: params.regionId })
    )

    router.get('admin/sub-services', ({ view }) => view.render('pages/admin/sub-services/index'))
    router.get('admin/sub-services/create', ({ view }) =>
      view.render('pages/admin/sub-services/create')
    )
    router.get('admin/sub-services/:subServiceId/edit', ({ params, view }) =>
      view.render('pages/admin/sub-services/edit', { subServiceId: params.subServiceId })
    )
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['admin'] }))
