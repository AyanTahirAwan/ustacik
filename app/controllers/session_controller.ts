import User from '#models/user'
import { getRoleLandingPath } from '#services/role_landing_service'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, auth, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    if (user.status === 'suspended') {
      return response.forbidden({
        message: 'Your account has been suspended',
      })
    }

    await auth.use('web').login(user)
    return response.redirect(getRoleLandingPath(user.role))
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
