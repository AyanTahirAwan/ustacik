import { getRoleLandingPath } from '#services/role_landing_service'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'

export default class GuestMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    for (let guard of options.guards || [ctx.auth.defaultGuard]) {
      const authenticator = ctx.auth.use(guard)

      if (await authenticator.check()) {
        const user = authenticator.getUserOrFail()

        ctx.session.reflash()
        return ctx.response.redirect(getRoleLandingPath(user.role), true)
      }
    }

    return next()
  }
}
