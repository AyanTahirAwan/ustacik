import ServicePriceCatalog from '#models/service_price_catalog'
import {
  createServicePriceCatalogValidator,
  updateServicePriceCatalogValidator,
} from '#validators/service_price_catalog'
import { catalogPricesValidator } from '#validators/catalog_filters'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Craftsman price management for the service price catalog.
 *
 * IMPORTANT DATABASE RULE:
 * `service_price_catalogs.craftsman_id` references `craftsmen.user_id`.
 * The authenticated user's ID is therefore the craftsman ID.
 *
 * `craftsmanId` is NEVER accepted from the request payload — it is always
 * derived from the authenticated user (`auth.getUserOrFail().id`).
 *
 * Ownership is enforced on every show/update/destroy/toggle: a craftsman
 * may only access records where `craftsmanId === auth.user.id`.
 */
export default class ServicePriceCatalogsController {
  /**
   * Public browsing endpoint.
   *
   * Returns active service prices only (`is_active = true`) with optional
   * filters, preloading the craftsman, sub-service, and region.
   */
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

  /**
   * Craftsman creates their own price entry.
   *
   * The authenticated user must have a craftsman profile. The `craftsmanId`
   * is always taken from `auth.user.id` and never from the request body.
   */
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

    try {
      const servicePriceCatalog = await ServicePriceCatalog.create({
        // Never trust a client-supplied craftsmanId. The authenticated
        // user's ID equals craftsmen.user_id by database design.
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

  /**
   * Return a single price record.
   *
   * Craftsmen may only view their own records; admins may view any record.
   */
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

  /**
   * Update a price record.
   *
   * Only the owner craftsman (or an admin) may update. Ownership cannot be
   * changed — `craftsmanId` is never part of the update payload.
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    const payload = await request.validateUsing(updateServicePriceCatalogValidator)

    if (payload.minPrice !== undefined) servicePriceCatalog.minPrice = payload.minPrice
    if (payload.maxPrice !== undefined) servicePriceCatalog.maxPrice = payload.maxPrice
    if (payload.currency !== undefined) servicePriceCatalog.currency = payload.currency
    if (payload.subServiceId !== undefined) servicePriceCatalog.subServiceId = payload.subServiceId
    if (payload.regionId !== undefined) servicePriceCatalog.regionId = payload.regionId
    if (payload.isActive !== undefined) servicePriceCatalog.isActive = payload.isActive
    await servicePriceCatalog.save()

    return response.ok({ servicePriceCatalog })
  }

  /**
   * Delete a price record.
   *
   * Only the owner craftsman (or an admin) may delete.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const servicePriceCatalog = await ServicePriceCatalog.findOrFail(params.id)

    if (user.role !== 'admin' && servicePriceCatalog.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Access denied.' })
    }

    await servicePriceCatalog.delete()

    return response.noContent()
  }

  /**
   * Toggle a price listing between active and inactive.
   *
   * Only the owner craftsman (or an admin) may toggle.
   * Example: PATCH /service-prices/:id/toggle
   */
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

  /**
   * Detect SQLite unique-constraint failures thrown by Lucid.
   */
  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('UNIQUE constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
    )
  }
}
