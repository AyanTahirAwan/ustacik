import Category from '#models/category'
import Region from '#models/region'
import SubService from '#models/sub_service'
import CatalogSearchService from '#services/catalog_search_service'
import { catalogSearchValidator } from '#validators/catalog_search'
import { catalogSubServicesValidator } from '#validators/catalog_filters'
import type { HttpContext } from '@adonisjs/core/http'

export default class CatalogController {
  private readonly catalogSearchService = new CatalogSearchService()

  async categories({ response }: HttpContext) {
    const categories = await Category.query()

    return response.ok({ data: categories })
  }

  async subServices({ request, response }: HttpContext) {
    const { categoryId } = await request.validateUsing(catalogSubServicesValidator, {
      data: { categoryId: request.param('categoryId') },
    })
    const subServices = await SubService.query().where('category_id', categoryId)

    return response.ok({ data: subServices })
  }

  async regions({ response }: HttpContext) {
    const regions = await Region.query()

    return response.ok({ data: regions })
  }

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
