import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.store': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.store': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.index': { paramsTuple?: []; params?: {} }
    'sub_services.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.index': { paramsTuple?: []; params?: {} }
    'regions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'catalog.categories': { paramsTuple?: []; params?: {} }
    'catalog.sub_services': { paramsTuple: [ParamValue]; params: {'categoryId': ParamValue} }
    'catalog.regions': { paramsTuple?: []; params?: {} }
    'catalog.search': { paramsTuple?: []; params?: {} }
    'categories.index': { paramsTuple?: []; params?: {} }
    'categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.index': { paramsTuple?: []; params?: {} }
    'sub_services.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.index': { paramsTuple?: []; params?: {} }
    'regions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.index': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'categories.store': { paramsTuple?: []; params?: {} }
    'sub_services.store': { paramsTuple?: []; params?: {} }
    'regions.store': { paramsTuple?: []; params?: {} }
    'service_price_catalogs.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.toggle_active': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'sub_services.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'regions.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'service_price_catalogs.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}