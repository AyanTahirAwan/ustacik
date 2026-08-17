import ServicePriceCatalog from '#models/service_price_catalog'

export type CatalogSearchFilters = {
  categoryId?: number
  subServiceId?: number
  regionId?: number
  minimumPrice?: number
  maximumPrice?: number
}

export default class CatalogSearchService {
  async search(filters: CatalogSearchFilters = {}) {
    const { categoryId, subServiceId, regionId, minimumPrice, maximumPrice } = filters
    const query = ServicePriceCatalog.query()
      .where('is_active', true)
      .whereHas('craftsman', (craftsmanQuery) => {
        craftsmanQuery
          .whereNot('verification_status', 'rejected')
          .whereHas('user', (userQuery) => {
            userQuery.where('status', 'active')
          })
      })
      .preload('craftsman', (craftsmen) =>
        craftsmen.select(['userId', 'businessName', 'trustLevel'])
      )
      .preload('region')
      .preload('subService', (subServices) => subServices.preload('category'))
      .orderBy('min_price', 'asc')
      .orderBy('id', 'asc')

    if (categoryId !== undefined) {
      query.whereHas('subService', (subServices) => {
        subServices.where('category_id', categoryId)
      })
    }

    if (subServiceId !== undefined) {
      query.where('sub_service_id', subServiceId)
    }

    if (regionId !== undefined) {
      query.where('region_id', regionId)
    }

    if (minimumPrice !== undefined) {
      query.where('max_price', '>=', minimumPrice)
    }

    if (maximumPrice !== undefined) {
      query.where('min_price', '<=', maximumPrice)
    }

    return query
  }
}
