import { defineConfig } from 'vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    adonisjs({
      /**
       * Entrypoints of your application. Each entrypoint will
       * result in a separate bundle.
       */
      entrypoints: [
        'resources/css/app.css',
        'resources/css/customer-account.css',
        'resources/js/app.js',
        'resources/js/customer-account.js',
        'resources/js/customer-profile.js',
        'resources/js/customer-addresses.js',
        'resources/js/customer-favorites.js',
        'resources/js/customer-notifications.js',
        'resources/css/craftsman-account.css',
        'resources/js/craftsman-profile.js',
        'resources/js/public-craftsman-profile.js',
        'resources/js/craftsman-jobs.js',
        'resources/js/craftsman-work-photos.js',
        'resources/js/craftsman-subscription.js',
        'resources/js/request-service.js',
        'resources/js/customer-requests.js',
        'resources/js/customer-review.js',
        'resources/js/notifications.js',
        'resources/css/craftsman-dashboard.css',
        'resources/js/craftsman-dashboard.js',
        'resources/js/craftsman-dashboard-page.js',
        'resources/css/admin-users.css',
        'resources/js/admin-users.js',
        'resources/js/admin-user-detail.js',
        'resources/css/admin-dashboard.css',
        'resources/js/admin-dashboard.js',
      ],

      /**
       * Paths to watch and reload the browser on file change
       */
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  server: {
    watch: {
      ignored: ['**/storage/**', '**/tmp/**'],
    },
  },
})
