import CustomerFavorite from '#models/customer_favorite'
import { createCustomerFavoriteValidator } from '#validators/customer_favorite'
import type { HttpContext } from '@adonisjs/core/http'

export default class CustomerFavoritesController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const favorites = await CustomerFavorite.query()
      .where('customer_id', user.id)
      .orderBy('id', 'desc')

    return response.ok({ favorites })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createCustomerFavoriteValidator)

    const existingFavorite = await CustomerFavorite.query()
      .where('customer_id', user.id)
      .where('craftsman_id', payload.craftsmanId)
      .first()

    if (existingFavorite) {
      return response.conflict({
        message: 'Craftsman is already in favorites',
      })
    }

    const favorite = await CustomerFavorite.create({
      customerId: user.id,
      craftsmanId: payload.craftsmanId,
    })

    return response.created({ favorite })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const favorite = await CustomerFavorite.query()
      .where('customer_id', user.id)
      .where('craftsman_id', params.craftsmanId)
      .firstOrFail()

    await favorite.delete()

    return response.noContent()
  }
}
