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

router.on('/').render('pages/home').as('home')

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])

    router.post('password-recovery', [PasswordRecoveryRequestsController, 'store'])
    router.patch('password-recovery/:shortcode', [PasswordRecoveryRequestsController, 'update'])
  })
  .use(middleware.guest())

router
  .group(() => {
    router.post('logout', [controllers.Session, 'destroy'])
    router.get('auth/refresh-tokens', [RefreshTokensController, 'index'])
    router.delete('auth/refresh-tokens/:id', [RefreshTokensController, 'destroy'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('customer/profile', [CustomersController, 'show'])
    router.patch('customer/profile', [CustomersController, 'update'])
    router.get('customer/addresses', [CustomerAddressesController, 'index'])
    router.post('customer/addresses', [CustomerAddressesController, 'store'])
    router.patch('customer/addresses/:id', [CustomerAddressesController, 'update'])
    router.delete('customer/addresses/:id', [CustomerAddressesController, 'destroy'])
    router.get('customer/favorites', [CustomerFavoritesController, 'index'])
    router.post('customer/favorites', [CustomerFavoritesController, 'store'])
    router.delete('customer/favorites/:craftsmanId', [CustomerFavoritesController, 'destroy'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer'] }))

router.get('craftsmen', [CraftsmenController, 'index'])
router.get('craftsmen/:id', [CraftsmenController, 'showPublic'])

router
  .group(() => {
    router.get('craftsman/profile', [CraftsmenController, 'showOwn'])
    router.patch('craftsman/profile', [CraftsmenController, 'updateOwn'])
    router.get('craftsman/work-photos', [WorkPhotosController, 'index'])
    router.post('craftsman/work-photos', [WorkPhotosController, 'store'])
    router.delete('craftsman/work-photos/:id', [WorkPhotosController, 'destroy'])
    router.get('craftsman/subscription', [SubscriptionsController, 'show'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['craftsman'] }))

router
  .get('notifications', [UserNotificationsController, 'index'])
  .use(middleware.auth())
  .use(middleware.role({ roles: ['customer', 'craftsman'] }))

router
  .group(() => {
    router.get('admin/users', [UsersController, 'index'])
    router.get('admin/users/:id', [UsersController, 'show'])
    router.patch('admin/users/:id/suspend', [UsersController, 'suspend'])
  })
  .use(middleware.auth())
  .use(middleware.role({ roles: ['admin'] }))