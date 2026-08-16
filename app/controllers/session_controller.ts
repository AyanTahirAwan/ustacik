import User from '#models/user'
import { getRoleLandingPath } from '#services/role_landing_service'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class SessionController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/login')
  }

  async store({ request, auth, response, session }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)

    const isTr = session.get('lang') === 'tr'

    const isJson = request.accepts(['html', 'json']) === 'json'

    if (user.status === 'suspended') {
      if (isJson) {
        return response.forbidden({
          message: isTr ? 'Hesabınız askıya alınmıştır.' : 'Your account has been suspended',
        })
      }
      session.flash('error', isTr ? 'Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.' : 'Your account has been suspended. Please contact support.')
      return response.redirect().toRoute('session.create')
    }

    if (user.status === 'pending') {
      if (isJson) {
        return response.forbidden({
          message: isTr ? 'Hesabınız yönetici onayı beklemektedir.' : 'Your account is pending administrator approval',
        })
      }
      session.flash(
        'error',
        isTr
          ? 'Usta hesabınız şu anda yönetici kimlik doğrulaması aşamasındadır. Onaylandıktan sonra giriş yapabileceksiniz.'
          : 'Your craftsman account is currently pending administrator ID verification. You will be able to log in once approved.'
      )
      return response.redirect().toRoute('session.create')
    }

    await auth.use('web').login(user)
    return response.redirect(getRoleLandingPath(user.role))
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    response.redirect().toRoute('session.create')
  }
}
