import User from '#models/user'
import { listUsersValidator } from '#validators/admin_user'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class UsersController {
  async index({ request, response }: HttpContext) {
    const filters = await request.validateUsing(listUsersValidator)

    const query = User.query()
      .preload('customer')
      .preload('craftsman')
      .preload('admin')
      .orderBy('id', 'desc')

    if (filters.role) {
      query.where('role', filters.role)
    }

    if (filters.status) {
      query.where('status', filters.status)
    }

    const users = await query

    return response.ok({ users })
  }

  async show({ params, response }: HttpContext) {
    const user = await User.query()
      .where('id', params.id)
      .preload('customer')
      .preload('craftsman')
      .preload('admin')
      .firstOrFail()

    return response.ok({ user })
  }

  async suspend({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    user.status = 'suspended'
    await user.save()

    return response.ok({ user })
  }

  async unsuspend({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    user.status = 'active'
    await user.save()

    return response.ok({ user })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const adminUser = auth.getUserOrFail()
    const targetUserId = Number(params.id)

    if (adminUser.id === targetUserId) {
      return response.badRequest({ message: 'You cannot delete your own admin account.' })
    }

    const user = await User.find(targetUserId)
    if (!user) {
      return response.notFound({ message: 'User not found.' })
    }

    try {
      await db.rawQuery('DELETE FROM job_disputes WHERE customer_id = ? OR craftsman_id = ?', [targetUserId, targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM review_helpful_votes WHERE customer_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM reviews WHERE customer_id = ? OR craftsman_id = ?', [targetUserId, targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM user_notifications WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM job_requests WHERE customer_id = ? OR craftsman_id = ?', [targetUserId, targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM service_price_catalogs WHERE craftsman_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM craftsman_work_photos WHERE craftsman_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM craftsman_subscriptions WHERE craftsman_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM customer_favorite_craftsmen WHERE customer_id = ? OR craftsman_id = ?', [targetUserId, targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM customer_addresses WHERE customer_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM verification_logs WHERE target_user_id = ? OR checked_by_id = ?', [targetUserId, targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM craftsman_verification_logs WHERE craftsman_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM verification_codes WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM password_reset_tokens WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM customers WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM craftsmen WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM admins WHERE user_id = ?', [targetUserId])
    } catch {}
    try {
      await db.rawQuery('DELETE FROM refresh_tokens WHERE user_id = ?', [targetUserId])
    } catch {}

    await user.delete()

    return response.ok({ success: true, message: 'User account deleted successfully.' })
  }
}
