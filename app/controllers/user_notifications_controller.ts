import UserNotification from '#models/user_notification'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserNotificationsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const notifications = await UserNotification.query()
      .where('user_id', user.id)
      .orderBy('sent_at', 'desc')

    return response.ok({ notifications })
  }

  async markRead({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const notification = await UserNotification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    notification.isRead = true
    await notification.save()

    return response.ok(notification)
  }
}
