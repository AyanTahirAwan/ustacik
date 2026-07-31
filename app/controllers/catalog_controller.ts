import Category from '#models/category'
import Region from '#models/region'
import SubService from '#models/sub_service'
import CatalogSearchService from '#services/catalog_search_service'
import { catalogSearchValidator } from '#validators/catalog_search'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Exposes public catalog listings and craftsman service-price search results.
 */
export default class CatalogController {
  private readonly catalogSearchService = new CatalogSearchService()

  /**
   * Return all available service categories.
   */
  async categories({ response }: HttpContext) {
    const categories = await Category.query()

    return response.ok({ data: categories })
  }

  /**
   * Return the sub-services available within a category.
   */
  async subServices({ request, response }: HttpContext) {
    const categoryId = request.param('categoryId')
    const subServices = await SubService.query().where('category_id', categoryId)

    return response.ok({ data: subServices })
  }

  /**
   * Return all available regions.
   */
  async regions({ response }: HttpContext) {
    const regions = await Region.query()

    return response.ok({ data: regions })
  }

  /**
   * Search craftsmen's service prices using validated optional filters.
   */
  async search({ request, response }: HttpContext) {
    const filters = await request.validateUsing(catalogSearchValidator)
    const results = await this.catalogSearchService.search({
      categoryId: filters.categoryId,
      subServiceId: filters.subServiceId,
      regionId: filters.regionId,
      minimumPrice: filters.minPrice,
      maximumPrice: filters.maxPrice,
    })

    return response.ok({ data: results })
  }
}
