import User from '#models/user'
import { listUsersValidator } from '#validators/admin_user'
import type { HttpContext } from '@adonisjs/core/http'

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
}
