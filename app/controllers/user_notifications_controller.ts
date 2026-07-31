import UserNotification from '#models/user_notification'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserNotificationsController {
  /**
   * List the authenticated user's own notifications.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const notifications = await UserNotification.query()
      .where('user_id', user.id)
      .orderBy('sent_at', 'desc')

    return response.ok({ notifications })
  }
}
