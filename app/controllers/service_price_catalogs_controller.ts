import ServicePriceCatalog from '#models/service_price_catalog'
import {
  createServicePriceCatalogValidator,
  updateServicePriceCatalogValidator,
} from '#validators/service_price_catalog'
import { catalogPricesValidator } from '#validators/catalog_filters'
import type { HttpContext } from '@adonisjs/core/http'

import SubService from '#models/sub_service'

export default class ServicePriceCatalogsController {
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(catalogPricesValidator)
    const { categoryId, subServiceId, regionId, minPrice, maxPrice } = filters

    const query = ServicePriceCatalog.query()
      .where('is_active', true)
      .preload('craftsman')
      .preload('subService')
      .preload('region')
      .orderBy('minPrice', 'asc')
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

    if (minPrice !== undefined) {
      query.where('max_price', '>=', minPrice)
    }

    if (maxPrice !== undefined) {
      query.where('min_price', '<=', maxPrice)
    }

    const servicePriceCatalogs = await query

    return response.ok({ servicePriceCatalogs })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.role !== 'craftsman' && user.role !== 'admin') {
      return response.forbidden({ message: 'Only craftsmen can create price listings.' })
    }

    await user.load('craftsman')
    if (!user.craftsman) {
      return response.forbidden({ message: 'A craftsman profile is required.' })
    }

    const payload = await request.validateUsing(createServicePriceCatalogValidator)

    const subService = await SubService.findOrFail(payload.subServiceId)
    if (user.role === 'craftsman' && subService.categoryId !== user.craftsman.categoryId) {
      return response.forbidden({
        message: 'You can only create price listings for services under your registered category.',
      })
    }

    try {
      const servicePriceCatalog = await ServicePriceCatalog.create({
        craftsmanId: user.id,
        subServiceId: payload.subServiceId,
        regionId: payload.regionId,
        minPrice: payload.minPrice,
        maxPrice: payload.maxPrice,
        currency: payload.currency,
        isActive: payload.isActive ?? true,
      })

      await servicePriceCatalog.load('craftsman')
      await servicePriceCatalog.load('subService')
      await servicePriceCatalog.load('region')

      return response.created({ servicePriceCatalog })
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return response.conflict({
          message: 'You already have a price entry for this sub-service in this region.',
        })
      }
      throw error
    }
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    await servicePriceCatalog.load('craftsman')
    await servicePriceCatalog.load('subService')
    await servicePriceCatalog.load('region')

    return response.ok({ servicePriceCatalog })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    const payload = await request.validateUsing(updateServicePriceCatalogValidator)

    if (payload.subServiceId !== undefined) {
      const subService = await SubService.findOrFail(payload.subServiceId)
      await user.load('craftsman')
      if (user.role === 'craftsman' && user.craftsman && subService.categoryId !== user.craftsman.categoryId) {
        return response.forbidden({
          message: 'You can only assign sub-services under your registered category.',
        })
      }
      servicePriceCatalog.subServiceId = payload.subServiceId
    }

    if (payload.minPrice !== undefined) servicePriceCatalog.minPrice = payload.minPrice
    if (payload.maxPrice !== undefined) servicePriceCatalog.maxPrice = payload.maxPrice
    if (payload.currency !== undefined) servicePriceCatalog.currency = payload.currency
    if (payload.regionId !== undefined) servicePriceCatalog.regionId = payload.regionId
    if (payload.isActive !== undefined) servicePriceCatalog.isActive = payload.isActive

    if (servicePriceCatalog.maxPrice < servicePriceCatalog.minPrice) {
      return response.unprocessableEntity({
        errors: [
          {
            message: 'The max price must be greater than or equal to the min price',
            rule: 'priceRange',
            field: 'maxPrice',
          },
        ],
      })
    }

    try {
      await servicePriceCatalog.save()
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return response.conflict({
          message: 'You already have a price entry for this sub-service in this region.',
        })
      }
      throw error
    }

    return response.ok({ servicePriceCatalog })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    await servicePriceCatalog.delete()

    return response.noContent()
  }

  async toggleActive({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    servicePriceCatalog.isActive = !servicePriceCatalog.isActive
    await servicePriceCatalog.save()

    return response.ok({ servicePriceCatalog })
  }

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('UNIQUE constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
    )
  }
}
