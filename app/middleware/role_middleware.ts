import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type UserRole = 'customer' | 'craftsman' | 'admin'

type RoleOptions = {
  roles: UserRole[]
}

export default class RoleMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn, options: RoleOptions) {
    const user = auth.getUserOrFail()

    if (!options.roles.includes(user.role)) {
      return response.forbidden({
        message: 'You do not have permission to access this resource',
      })
    }

    return next()
  }
}
