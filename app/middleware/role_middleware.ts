import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

type UserRole = 'customer' | 'craftsman' | 'admin'

type RoleOptions = {
  roles: UserRole[]
}

/**
 * Role middleware is used to restrict access to routes based on the
 * authenticated user's role.
 *
 * Authentication is handled separately by the "auth" middleware. This
 * middleware only verifies that the authenticated user's role is included
 * in the allowed list. A 403 JSON response is returned when the role is
 * not permitted.
 */
export default class RoleMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn, options: RoleOptions) {
    const user = auth.getUserOrFail()
    const role = user.role as UserRole

    if (!options.roles.includes(role)) {
      return response.forbidden({ message: 'Insufficient permissions' })
    }

    return next()
  }
}

