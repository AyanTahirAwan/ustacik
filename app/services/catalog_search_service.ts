import ServicePriceCatalog from '#models/service_price_catalog'

export type CatalogSearchFilters = {
  categoryId?: number
  subServiceId?: number
  regionId?: number
  minimumPrice?: number
  maximumPrice?: number
}

/**
 * Searches published service prices and loads the catalog context needed to
 * display a craftsman's offering.
 */
export default class CatalogSearchService {
  async search(filters: CatalogSearchFilters = {}) {
    const { categoryId, subServiceId, regionId, minimumPrice, maximumPrice } = filters
    const query = ServicePriceCatalog.query()
      .preload('craftsman', (craftsmen) => craftsmen.select(['id', 'full_name']))
      .preload('region')
      .preload('subService', (subServices) => subServices.preload('category'))
      .orderBy('price', 'asc')
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
      query.where('price', '>=', minimumPrice)
    }

    if (maximumPrice !== undefined) {
      query.where('price', '<=', maximumPrice)
    }

    return query
  }
}
