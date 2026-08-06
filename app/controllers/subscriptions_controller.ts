import Subscription from '#models/subscription'
import type { HttpContext } from '@adonisjs/core/http'

export default class SubscriptionsController {
  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const subscription = await Subscription.query()
      .where('craftsman_id', user.id)
      .firstOrFail()

    return response.ok({ subscription })
  }
}
