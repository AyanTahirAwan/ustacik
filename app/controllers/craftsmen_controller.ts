import Craftsman from '#models/craftsman'
import { updateCraftsmanValidator } from '#validators/craftsman'
import type { HttpContext } from '@adonisjs/core/http'

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
        builder.whereLike('business_name', `%${search}%`).orWhereLike('bio', `%${search}%`)
      })
    }

    if (categoryId) {
      query.where('category_id', categoryId)
    }

    const craftsmen = await query

    return response.ok({
      craftsmen: craftsmen.map((craftsman) => ({
        userId: craftsman.userId,
        businessName: craftsman.businessName,
        category: craftsman.category,
        bio: craftsman.bio,
        trustLevel: craftsman.trustLevel,
        trustLevelLabel: craftsman.trustLevelLabel,
        totalJobs: craftsman.totalJobs,
        workPhotos: craftsman.workPhotos,
      })),
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
        workPhotos: craftsman.workPhotos,
      },
    })
  }
}
