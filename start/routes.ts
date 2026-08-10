import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
const CustomersController = () => import('#controllers/customers_controller')
const CustomerAddressesController = () => import('#controllers/customer_addresses_controller')
const CustomerFavoritesController = () => import('#controllers/customer_favorites_controller')
const CraftsmenController = () => import('#controllers/craftsmen_controller')
const WorkPhotosController = () => import('#controllers/work_photos_controller')
const UserNotificationsController = () => import('#controllers/user_notifications_controller')
const UsersController = () => import('#controllers/users_controller')
const RefreshTokensController = () => import('#controllers/refresh_tokens_controller')
const PasswordRecoveryRequestsController = () =>
  import('#controllers/password_recovery_requests_controller')
const SubscriptionsController = () => import('#controllers/subscriptions_controller')
const CatalogController = () => import('#controllers/catalog_controller')
const CategoriesController = () => import('#controllers/categories_controller')
const SubServicesController = () => import('#controllers/sub_services_controller')
const RegionsController = () => import('#controllers/regions_controller')
const ServicePriceCatalogsController = () =>
  import('#controllers/service_price_catalogs_controller')
const VerificationLogsController = () => import('#controllers/verification_logs_controller')
const JobRequestsController = () => import('#controllers/job_requests_controller')
const ReviewsController = () => import('#controllers/reviews_controller')
const JobDisputesController = () => import('#controllers/job_disputes_controller')

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])

    router.post('api/password-recovery', [PasswordRecoveryRequestsController, 'store'])
    router.patch('api/password-recovery/:shortcode', [
      PasswordRecoveryRequestsController,
      'update',
    ])
  })
  .use(middleware.guest())

router.get('api/catalog/categories', [CatalogController, 'categories'])
router.get('api/catalog/categories/:categoryId/sub-services', [CatalogController, 'subServices'])
router.get('api/catalog/regions', [CatalogController, 'regions'])
router.get('api/catalog/prices', [ServicePriceCatalogsController, 'index'])
router.get('api/search/services', [CatalogController, 'search'])
router.get('api/craftsmen', [CraftsmenController, 'index'])
router.get('api/craftsmen/:id', [CraftsmenController, 'showPublic'])
router.get('api/craftsmen/:craftsmanId/reviews', [ReviewsController, 'forCraftsman'])

router.get('categories', ({ view }) => view.render('pages/categories/index'))
router.get('categories/:categoryId', ({ params, view }) =>
  view.render('pages/categories/show', { categoryId: params.categoryId })
)
router.get('regions', ({ view }) => view.render('pages/regions/index'))
router.get('search', ({ view }) => view.render('pages/search/index'))
router.get('craftsmen', ({ view }) => view.render('pages/craftsmen/index'))

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])

    router.get('api/auth/refresh-tokens', [RefreshTokensController, 'index'])
    router.delete('api/auth/refresh-tokens/:id', [RefreshTokensController, 'destroy'])

    router.get('api/jobs', [JobRequestsController, 'index'])
    router.get('api/jobs/:id', [JobRequestsController, 'show'])

    router.get('api/notifications', [UserNotificationsController, 'index']).as('api.notifications.index')
    router.get('notifications', [UserNotificationsController, 'index']).as('notifications.index')
    router.patch('api/notifications/:id/read', [UserNotificationsController, 'markRead'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('customer/profile', [CustomersController, 'show']).as('customer.profile.show')
    router.patch('customer/profile', [CustomersController, 'update']).as('customer.profile.update')
    router.get('api/customer/profile', [CustomersController, 'show']).as('api.customer.profile.show')
    router.patch('api/customer/profile', [CustomersController, 'update']).as('api.customer.profile.update')
    router.get('api/customer/addresses', [CustomerAddressesController, 'index']).as('api.customer.addresses.index')
    router.post('api/customer/addresses', [CustomerAddressesController, 'store']).as('api.customer.addresses.store')
    router.patch('api/customer/addresses/:id', [CustomerAddressesController, 'update']).as('api.customer.addresses.update')
    router.delete('api/customer/addresses/:id', [CustomerAddressesController, 'destroy']).as('api.customer.addresses.destroy')
    router.get('customer/addresses', [CustomerAddressesController, 'index']).as('customer.addresses.index')
    router.post('customer/addresses', [CustomerAddressesController, 'store']).as('customer.addresses.store')
    router.patch('customer/addresses/:id', [CustomerAddressesController, 'update']).as('customer.addresses.update')
    router.delete('customer/addresses/:id', [CustomerAddressesController, 'destroy']).as('customer.addresses.destroy')
    router.get('api/customer/favorites', [CustomerFavoritesController, 'index']).as('api.customer.favorites.index')
    router.post('api/customer/favorites', [CustomerFavoritesController, 'store']).as('api.customer.favorites.store')
    router.delete('api/customer/favorites/:craftsmanId', [CustomerFavoritesController, 'destroy']).as('api.customer.favorites.destroy')
    router.get('customer/favorites', [CustomerFavoritesController, 'index']).as('customer.favorites.index')
    router.post('customer/favorites', [CustomerFavoritesController, 'store']).as('customer.favorites.store')
    router.delete('customer/favorites/:craftsmanId', [CustomerFavoritesController, 'destroy']).as('customer.favorites.destroy')

    router.post('api/jobs', [JobRequestsController, 'store'])
    router.patch('api/jobs/:id', [JobRequestsController, 'update'])

    router.post('api/reviews', [ReviewsController, 'store'])
    router.post('api/reviews/:id/helpful', [ReviewsController, 'markHelpful'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer'] }))

router
  .group(() => {
    router.patch('api/jobs/:id/cancel', [JobRequestsController, 'cancel'])
    router.delete('api/jobs/:id', [JobRequestsController, 'destroy'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer', 'admin'] }))

router
  .group(() => {
    router.post('api/jobs/:jobId/disputes', [JobDisputesController, 'store'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer', 'craftsman'] }))

router
  .group(() => {
    router.get('api/craftsman/profile', [CraftsmenController, 'showOwn']).as('api.craftsman.profile.show')
    router.patch('api/craftsman/profile', [CraftsmenController, 'updateOwn']).as('api.craftsman.profile.update')
    router.get('craftsman/profile', [CraftsmenController, 'showOwn']).as('craftsman.profile.show')
    router.patch('craftsman/profile', [CraftsmenController, 'updateOwn']).as('craftsman.profile.update')
    router.get('api/craftsman/work-photos', [WorkPhotosController, 'index'])
    router.post('api/craftsman/work-photos', [WorkPhotosController, 'store'])
    router.delete('api/craftsman/work-photos/:id', [WorkPhotosController, 'destroy']).as('api.craftsman.work-photos.destroy')
    router.delete('craftsman/work-photos/:id', [WorkPhotosController, 'destroy']).as('craftsman.work-photos.destroy')
    router.get('api/craftsman/subscription', [SubscriptionsController, 'show'])
    router.get('api/craftsman/verification-logs', [VerificationLogsController, 'own'])

    router.post('api/craftsman/service-prices', [ServicePriceCatalogsController, 'store'])
    router.get('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'show'])
    router.patch('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'update'])
    router.delete('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'destroy'])
    router.patch('api/craftsman/service-prices/:id/toggle-active', [
      ServicePriceCatalogsController,
      'toggleActive',
    ])

    router.patch('api/jobs/:id/accept', [JobRequestsController, 'accept'])
    router.patch('api/jobs/:id/decline', [JobRequestsController, 'decline'])
    router.patch('api/jobs/:id/start', [JobRequestsController, 'start'])
    router.patch('api/jobs/:id/complete', [JobRequestsController, 'complete'])

    router.patch('api/reviews/:id/reply', [ReviewsController, 'reply'])

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

router
  .group(() => {
    router.get('api/admin/users', [UsersController, 'index']).as('api.admin.users.index')
    router.get('admin/users', [UsersController, 'index']).as('admin.users.index')
    router.get('api/admin/users/:id', [UsersController, 'show']).as('api.admin.users.show')
    router.get('admin/users/:id', [UsersController, 'show']).as('admin.users.show')
    router.patch('api/admin/users/:id/suspend', [UsersController, 'suspend']).as('api.admin.users.suspend')
    router.patch('admin/users/:id/suspend', [UsersController, 'suspend']).as('admin.users.suspend')

    router.get('api/admin/categories', [CategoriesController, 'index'])
    router.post('api/admin/categories', [CategoriesController, 'store'])
    router.get('api/admin/categories/:id', [CategoriesController, 'show'])
    router.patch('api/admin/categories/:id', [CategoriesController, 'update'])
    router.delete('api/admin/categories/:id', [CategoriesController, 'destroy'])

    router.get('api/admin/sub-services', [SubServicesController, 'index'])
    router.post('api/admin/sub-services', [SubServicesController, 'store'])
    router.get('api/admin/sub-services/:id', [SubServicesController, 'show'])
    router.patch('api/admin/sub-services/:id', [SubServicesController, 'update'])
    router.delete('api/admin/sub-services/:id', [SubServicesController, 'destroy'])

    router.get('api/admin/regions', [RegionsController, 'index'])
    router.post('api/admin/regions', [RegionsController, 'store'])
    router.get('api/admin/regions/:id', [RegionsController, 'show'])
    router.patch('api/admin/regions/:id', [RegionsController, 'update'])
    router.delete('api/admin/regions/:id', [RegionsController, 'destroy'])

    router.get('api/admin/craftsmen/:craftsmanId/verification-logs', [
      VerificationLogsController,
      'forCraftsman',
    ])
    router.post('api/admin/craftsmen/:craftsmanId/verification-logs', [
      VerificationLogsController,
      'store',
    ])

    router.get('api/admin/disputes', [JobDisputesController, 'index'])
    router.patch('api/admin/disputes/:id', [JobDisputesController, 'update'])
    router.delete('api/admin/disputes/:id', [JobDisputesController, 'destroy'])

    router.delete('api/admin/reviews/:id', [ReviewsController, 'destroy'])

    router.get('admin', ({ view }) => view.render('pages/admin/dashboard'))

    router.get('admin/categories', ({ view }) => view.render('pages/admin/categories/index'))
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
