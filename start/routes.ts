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
const VerificationController = () => import('#controllers/verification_controller')
const JobRequestsController = () => import('#controllers/job_requests_controller')
const ReviewsController = () => import('#controllers/reviews_controller')
const JobDisputesController = () => import('#controllers/job_disputes_controller')
const AccountController = () => import('#controllers/account_controller')
const PlatformSettingsController = () => import('#controllers/platform_settings_controller')
const AdminVerificationsController = () =>
  import('#controllers/admin_verifications_controller')

router.on('/').render('pages/home').as('home')

router.get('lang/:locale', async ({ params, session, response, request }) => {
  const locale = params.locale === 'tr' ? 'tr' : 'en'
  session.put('lang', locale)
  response.cookie('lang', locale, { maxAge: '1y', path: '/' })
  return response.redirect().toPath(request.header('referer') || '/')
})

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])

    router.post('api/password-recovery', [PasswordRecoveryRequestsController, 'store'])
    router.patch('api/password-recovery/:shortcode', [PasswordRecoveryRequestsController, 'update'])
    router.get('forgot-password', [PasswordRecoveryRequestsController, 'createRequest'])
    router.post('forgot-password', [PasswordRecoveryRequestsController, 'storeFromForm'])
    router.get('password-reset/:shortcode', [PasswordRecoveryRequestsController, 'create'])
    router.post('password-reset/:shortcode', [PasswordRecoveryRequestsController, 'updateFromForm'])
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
router.get('craftsmen/:id', ({ params, view }) =>
  view.render('pages/craftsmen/show', { craftsmanId: params.id })
)

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])

    router.get('api/auth/refresh-tokens', [RefreshTokensController, 'index'])
    router.delete('api/auth/refresh-tokens/:id', [RefreshTokensController, 'destroy'])

    router.post('api/verification/verify-email', [VerificationController, 'verifyEmailCode'])
    router.post('api/verification/verify-phone', [VerificationController, 'verifyPhoneCode'])
    router.post('api/verification/send-email-code', [VerificationController, 'sendEmailCode'])
    router.post('api/verification/send-phone-code', [VerificationController, 'sendPhoneCode'])

    router.get('api/jobs', [JobRequestsController, 'index'])
    router.get('api/jobs/:id', [JobRequestsController, 'show'])

    router.get('api/notifications', [UserNotificationsController, 'index'])
    router.patch('api/notifications/read-all', [UserNotificationsController, 'markAllRead'])
    router.patch('api/notifications/:id/read', [UserNotificationsController, 'markRead'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('customer/profile', ({ view }) => view.render('pages/customer/profile'))
    router.get('customer/addresses', ({ view }) => view.render('pages/customer/addresses'))
    router.get('customer/favorites', ({ view }) => view.render('pages/customer/favorites'))
    router.get('customer/notifications', ({ view }) => view.render('pages/customer/notifications'))

    router.get('api/customer/profile', [CustomersController, 'show'])
    router.patch('api/customer/profile', [CustomersController, 'update'])
    router.get('api/customer/addresses', [CustomerAddressesController, 'index'])
    router.post('api/customer/addresses', [CustomerAddressesController, 'store'])
    router.patch('api/customer/addresses/:id', [CustomerAddressesController, 'update'])
    router.delete('api/customer/addresses/:id', [CustomerAddressesController, 'destroy'])
    router.get('api/customer/favorites', [CustomerFavoritesController, 'index'])
    router.post('api/customer/favorites', [CustomerFavoritesController, 'store'])
    router.delete('api/customer/favorites/:craftsmanId', [CustomerFavoritesController, 'destroy'])

    router.post('api/jobs', [JobRequestsController, 'store'])
    router.patch('api/jobs/:id', [JobRequestsController, 'update'])
    router.get('api/jobs/:id/contact', [JobRequestsController, 'contact'])

    router.post('api/reviews', [ReviewsController, 'store'])
    router.post('api/reviews/:id/helpful', [ReviewsController, 'markHelpful'])

    router.get('craftsmen/:id/request', ({ params, view }) =>
      view.render('pages/customer/request-service', { craftsmanId: params.id })
    )
    router.get('customer/requests', ({ view }) => view.render('pages/customer/requests'))
    router.get('customer/requests/:jobId/review', [ReviewsController, 'create'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer'] }))

router
  .group(() => {
    router.patch('api/jobs/:id/cancel', [JobRequestsController, 'cancel'])
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
    router.get('notifications', ({ view }) => view.render('pages/notifications/index'))
    router.get('account/settings', ({ view }) => view.render('pages/customer/profile'))
    router.patch('api/account/password', [AccountController, 'updatePassword'])

    router.get('api/craftsman/profile', [CraftsmenController, 'showOwn'])
    router.patch('api/craftsman/profile', [CraftsmenController, 'updateOwn'])
    router.get('api/craftsman/work-photos', [WorkPhotosController, 'index'])
    router.post('api/craftsman/work-photos', [WorkPhotosController, 'store'])
    router.delete('api/craftsman/work-photos/:id', [WorkPhotosController, 'destroy'])
    router.get('api/craftsman/subscription', [SubscriptionsController, 'show'])
    router.get('api/craftsman/verification-logs', [VerificationLogsController, 'own'])
    router.get('api/craftsman/dashboard', [CraftsmenController, 'dashboard'])

    router.post('api/craftsman/service-prices', [ServicePriceCatalogsController, 'store'])
    router.get('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'show'])
    router.patch('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'update'])
    router.delete('api/craftsman/service-prices/:id', [ServicePriceCatalogsController, 'destroy'])
    router.patch('api/craftsman/service-prices/:id/toggle-active', [
      ServicePriceCatalogsController,
      'toggleActive',
    ])
    router.post('api/craftsman/sub-services', [SubServicesController, 'store']).as('craftsman.sub_services.store')

    router.patch('api/jobs/:id/accept', [JobRequestsController, 'accept'])
    router.patch('api/jobs/:id/decline', [JobRequestsController, 'decline'])
    router.patch('api/jobs/:id/start', [JobRequestsController, 'start'])
    router.patch('api/jobs/:id/complete', [JobRequestsController, 'complete'])

    router.patch('api/reviews/:id/reply', [ReviewsController, 'reply'])
    router.patch('craftsman', [ReviewsController, 'replyDirect']).as('craftsman.dashboard.patch')
    router.post('craftsman', [ReviewsController, 'replyDirect']).as('craftsman.dashboard.post')

    router.get('craftsman', ({ view }) => view.render('pages/craftsman/dashboard'))
    router.get('craftsman/profile', ({ view }) => view.render('pages/craftsman/profile'))
    router.get('craftsman/jobs', ({ view }) => view.render('pages/craftsman/jobs'))
    router.get('craftsman/work-photos', ({ view }) => view.render('pages/craftsman/work-photos'))
    router.get('craftsman/subscription', ({ view }) => view.render('pages/craftsman/subscription'))
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
  .use(middleware.role({ roles: ['craftsman', 'customer'] }))

router
  .group(() => {
    router.get('api/admin/verifications', [AdminVerificationsController, 'index'])
    router.patch('api/admin/craftsmen/:id/verify/approve', [AdminVerificationsController, 'approve'])
    router.patch('api/admin/craftsmen/:id/verify/reject', [AdminVerificationsController, 'reject'])

    router.get('api/admin/users', [UsersController, 'index'])
    router.get('api/admin/users/:id', [UsersController, 'show'])
    router.patch('api/admin/users/:id/suspend', [UsersController, 'suspend'])
    router.patch('api/admin/users/:id/unsuspend', [UsersController, 'unsuspend'])
    router.delete('api/admin/users/:id', [UsersController, 'destroy'])

    router.get('api/admin/categories', [CategoriesController, 'index'])
    router.post('api/admin/categories', [CategoriesController, 'store'])
    router.get('api/admin/categories/:id', [CategoriesController, 'show'])
    router.patch('api/admin/categories/:id', [CategoriesController, 'update'])
    router.delete('api/admin/categories/:id', [CategoriesController, 'destroy'])

    router.get('api/admin/sub-services', [SubServicesController, 'index'])
    router.post('api/admin/sub-services', [SubServicesController, 'store']).as('admin.sub_services.store')
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

    router.get('admin', [PlatformSettingsController, 'dashboard'])
    router.post('admin/settings/phone-verification', [
      PlatformSettingsController,
      'updatePhoneVerification',
    ])

    router.get('admin/verifications', ({ view }) => view.render('pages/admin/verifications/index'))
    router.get('admin/users', ({ view }) => view.render('pages/admin/users/index'))
    router.get('admin/users/:userId', ({ params, view }) =>
      view.render('pages/admin/users/show', { userId: params.userId })
    )

    router.get('admin/categories', ({ view }) => view.render('pages/admin/categories/index'))
    router.get('admin/categories/create', ({ view }) => view.render('pages/admin/categories/create'))
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
