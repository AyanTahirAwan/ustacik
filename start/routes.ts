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
