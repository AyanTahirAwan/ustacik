import Craftsman from '#models/craftsman'
import { updateCraftsmanValidator } from '#validators/craftsman'
import type { HttpContext } from '@adonisjs/core/http'
import ServicePriceCatalog from '#models/service_price_catalog'

export default class CraftsmenController {
  async index({ request, response }: HttpContext) {
  const search = request.input('search')
  const categoryId = request.input('categoryId')

  const query = Craftsman.query()
    .preload('category')
    .preload('workPhotos')
    .orderBy('business_name', 'asc')

  if (search) {
    query.where((builder) => {
      builder
        .whereLike('business_name', `%${search}%`)
        .orWhereLike('bio', `%${search}%`)
    })
  }

  if (categoryId) {
    query.where('category_id', categoryId)
  }

  const craftsmen = await query

  const result = await Promise.all(
    craftsmen.map(async (craftsman) => {
      const prices = await ServicePriceCatalog.query()
        .where('craftsman_id', craftsman.userId)
        .where('is_active', true)
        .orderBy('min_price', 'asc')

      return {
        userId: craftsman.userId,
        businessName: craftsman.businessName,
        category: craftsman.category,
        bio: craftsman.bio,
        trustLevel: craftsman.trustLevel,
        trustLevelLabel: craftsman.trustLevelLabel,
        totalJobs: craftsman.totalJobs,
        workPhotos: craftsman.workPhotos,

        prices: prices.map((price) => ({
          minPrice: price.minPrice,
          maxPrice: price.maxPrice,
          currency: price.currency,
        })),
      }
    })
  )

  return response.ok({
    craftsmen: result,
  })
}
  async showOwn({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const craftsman = await Craftsman.query()
      .where('user_id', user.id)
      .preload('category')
      .preload('workPhotos')
      .firstOrFail()

    return response.ok({ craftsman })
  }

  async updateOwn({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateCraftsmanValidator)

    const craftsman = await Craftsman.findOrFail(user.id)

    craftsman.merge(payload)
    await craftsman.save()
    await craftsman.load('category')

    return response.ok({ craftsman })
  }

  async showPublic({ params, response }: HttpContext) {
  const craftsman = await Craftsman.query()
    .where('user_id', params.id)
    .preload('category')
    .preload('workPhotos')
    .preload('user')

  .firstOrFail()

  return response.ok({
    craftsman: {
      userId: craftsman.userId,
      businessName: craftsman.businessName,
      category: craftsman.category,
      bio: craftsman.bio,
      trustLevel: craftsman.trustLevel,
      trustLevelLabel: craftsman.trustLevelLabel,
      totalJobs: craftsman.totalJobs,
      phoneNormalised: craftsman.user.phoneNormalised,
      workPhotos: craftsman.workPhotos,
    },
  })
}
}
