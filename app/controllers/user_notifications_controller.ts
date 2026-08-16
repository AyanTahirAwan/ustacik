import UserNotification from '#models/user_notification'
import type { HttpContext } from '@adonisjs/core/http'

export default class UserNotificationsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const notifications = await UserNotification.query()
      .where('user_id', user.id)
      .orderBy('sent_at', 'desc')

    return response.ok({
      notifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.messageBody,
        messageBody: notification.messageBody,
        isRead: Boolean(notification.isRead),
        createdAt: notification.sentAt,
        sentAt: notification.sentAt,
        target: this.targetFor(notification.type, notification.title),
      })),
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
    })
  }

  async markRead({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const notification = await UserNotification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    if (!notification.isRead) {
      notification.isRead = true
      await notification.save()
    }

    return response.ok({
      notification: { id: notification.id, isRead: Boolean(notification.isRead) },
    })
  }

  async markAllRead({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await UserNotification.query()
      .where('user_id', user.id)
      .where('is_read', false)
      .update({ isRead: true })

    return response.ok({ unreadCount: 0 })
  }

  private targetFor(type: UserNotification['type'], title: string) {
    if (type === 'job_request_received') return '/craftsman/jobs'
    if (type === 'review_received') return '/craftsman'
    if (
      ['job_accepted', 'job_declined', 'job_completed'].includes(type) ||
      (type === 'system' && title === 'Work started')
    ) {
      return '/customer/requests'
    }
    return '/notifications'
  }
}
