import RefreshToken from '#models/refresh_token'
import type { HttpContext } from '@adonisjs/core/http'

export default class RefreshTokensController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const refreshTokens = await RefreshToken.query()
      .where('user_id', user.id)
      .where('revoked', false)
      .orderBy('created_at', 'desc')

    return response.ok({ refreshTokens })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const refreshToken = await RefreshToken.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    refreshToken.revoked = true
    await refreshToken.save()

    return response.noContent()
  }
}