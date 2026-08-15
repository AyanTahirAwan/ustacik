import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.store': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.update': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'password_recovery_requests.create_request': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.store_from_form': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.create': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'password_recovery_requests.update_from_form': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'craftsmen.index': { paramsTuple?: []; params?: {} }
    'craftsmen.show_public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'refresh_tokens.index': { paramsTuple?: []; params?: {} }
    'refresh_tokens.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'verification.verify_email_code': { paramsTuple?: []; params?: {} }
    'verification.verify_phone_code': { paramsTuple?: []; params?: {} }
    'verification.send_email_code': { paramsTuple?: []; params?: {} }
    'verification.send_phone_code': { paramsTuple?: []; params?: {} }
    'job_requests.index': { paramsTuple?: []; params?: {} }
    'job_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'user_notifications.index': { paramsTuple?: []; params?: {} }
    'user_notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'user_notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customers.show': { paramsTuple?: []; params?: {} }
    'customers.update': { paramsTuple?: []; params?: {} }
    'customer_addresses.index': { paramsTuple?: []; params?: {} }
    'customer_addresses.store': { paramsTuple?: []; params?: {} }
    'customer_addresses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customer_addresses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customer_favorites.index': { paramsTuple?: []; params?: {} }
    'customer_favorites.store': { paramsTuple?: []; params?: {} }
    'customer_favorites.destroy': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'job_requests.store': { paramsTuple?: []; params?: {} }
    'job_requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.contact': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.store': { paramsTuple?: []; params?: {} }
    'reviews.mark_helpful': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.create': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'job_requests.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_disputes.store': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'account.update_password': { paramsTuple?: []; params?: {} }
    'craftsmen.show_own': { paramsTuple?: []; params?: {} }
    'craftsmen.update_own': { paramsTuple?: []; params?: {} }
    'work_photos.index': { paramsTuple?: []; params?: {} }
    'work_photos.store': { paramsTuple?: []; params?: {} }
    'work_photos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'subscriptions.show': { paramsTuple?: []; params?: {} }
    'verification_logs.own': { paramsTuple?: []; params?: {} }
    'craftsmen.dashboard': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.store': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.start': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.unsuspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.index': { paramsTuple?: []; params?: {} }
    'sub_services.store': { paramsTuple?: []; params?: {} }
    'sub_services.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.index': { paramsTuple?: []; params?: {} }
    'regions.store': { paramsTuple?: []; params?: {} }
    'regions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'verification_logs.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'verification_logs.store': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'job_disputes.index': { paramsTuple?: []; params?: {} }
    'job_disputes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_disputes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'platform_settings.dashboard': { paramsTuple?: []; params?: {} }
    'platform_settings.update_phone_verification': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.create_request': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.create': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'craftsmen.index': { paramsTuple?: []; params?: {} }
    'craftsmen.show_public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'refresh_tokens.index': { paramsTuple?: []; params?: {} }
    'job_requests.index': { paramsTuple?: []; params?: {} }
    'job_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'user_notifications.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple?: []; params?: {} }
    'customer_addresses.index': { paramsTuple?: []; params?: {} }
    'customer_favorites.index': { paramsTuple?: []; params?: {} }
    'job_requests.contact': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.create': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'craftsmen.show_own': { paramsTuple?: []; params?: {} }
    'work_photos.index': { paramsTuple?: []; params?: {} }
    'subscriptions.show': { paramsTuple?: []; params?: {} }
    'verification_logs.own': { paramsTuple?: []; params?: {} }
    'craftsmen.dashboard': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.index': { paramsTuple?: []; params?: {} }
    'sub_services.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.index': { paramsTuple?: []; params?: {} }
    'regions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'verification_logs.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'job_disputes.index': { paramsTuple?: []; params?: {} }
    'platform_settings.dashboard': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.create_request': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.create': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'craftsmen.index': { paramsTuple?: []; params?: {} }
    'craftsmen.show_public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'refresh_tokens.index': { paramsTuple?: []; params?: {} }
    'job_requests.index': { paramsTuple?: []; params?: {} }
    'job_requests.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'user_notifications.index': { paramsTuple?: []; params?: {} }
    'customers.show': { paramsTuple?: []; params?: {} }
    'customer_addresses.index': { paramsTuple?: []; params?: {} }
    'customer_favorites.index': { paramsTuple?: []; params?: {} }
    'job_requests.contact': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.create': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'craftsmen.show_own': { paramsTuple?: []; params?: {} }
    'work_photos.index': { paramsTuple?: []; params?: {} }
    'subscriptions.show': { paramsTuple?: []; params?: {} }
    'verification_logs.own': { paramsTuple?: []; params?: {} }
    'craftsmen.dashboard': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.index': { paramsTuple?: []; params?: {} }
    'users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.index': { paramsTuple?: []; params?: {} }
    'sub_services.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.index': { paramsTuple?: []; params?: {} }
    'regions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'verification_logs.for_craftsman': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'job_disputes.index': { paramsTuple?: []; params?: {} }
    'platform_settings.dashboard': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.store': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.store_from_form': { paramsTuple?: []; params?: {} }
    'password_recovery_requests.update_from_form': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'verification.verify_email_code': { paramsTuple?: []; params?: {} }
    'verification.verify_phone_code': { paramsTuple?: []; params?: {} }
    'verification.send_email_code': { paramsTuple?: []; params?: {} }
    'verification.send_phone_code': { paramsTuple?: []; params?: {} }
    'customer_addresses.store': { paramsTuple?: []; params?: {} }
    'customer_favorites.store': { paramsTuple?: []; params?: {} }
    'job_requests.store': { paramsTuple?: []; params?: {} }
    'reviews.store': { paramsTuple?: []; params?: {} }
    'reviews.mark_helpful': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_disputes.store': { paramsTuple: [ParamValue]; params: {'jobId': ParamValue} }
    'work_photos.store': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.store': { paramsTuple?: []; params?: {} }
    'sub_services.store': { paramsTuple?: []; params?: {} }
    'regions.store': { paramsTuple?: []; params?: {} }
    'verification_logs.store': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'platform_settings.update_phone_verification': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'password_recovery_requests.update': { paramsTuple: [ParamValue]; params: {'shortcode': ParamValue} }
    'user_notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'user_notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customers.update': { paramsTuple?: []; params?: {} }
    'customer_addresses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.update_password': { paramsTuple?: []; params?: {} }
    'craftsmen.update_own': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.decline': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.start': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_requests.complete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.reply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'users.unsuspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_disputes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'refresh_tokens.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customer_addresses.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'customer_favorites.destroy': { paramsTuple: [ParamValue]; params: {'craftsmanId': ParamValue} }
    'work_photos.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'job_disputes.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'reviews.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}