import User from '#models/user'
import PasswordRecoveryRequest from '#models/password_recovery_request'
import {
  requestPasswordRecoveryValidator,
  redeemPasswordRecoveryValidator,
} from '#validators/password_recovery'
import { randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class PasswordRecoveryRequestsController {
  async store({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(requestPasswordRecoveryValidator)

    const user = await User.findBy('email', email)

    if (user) {
      await PasswordRecoveryRequest.create({
        userId: user.id,
        shortcode: randomBytes(24).toString('hex'),
        expiryDate: DateTime.now().plus({ hours: 1 }),
      })
    }

    return response.ok({
      message: 'If that email exists, a password recovery link has been sent',
    })
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(redeemPasswordRecoveryValidator)

    const recoveryRequest = await PasswordRecoveryRequest.query()
      .where('shortcode', params.shortcode)
      .firstOrFail()

    if (!recoveryRequest.isUsable) {
      return response.badRequest({ message: 'This recovery link is invalid or has expired' })
    }

    const user = await User.findOrFail(recoveryRequest.userId)
    user.passwordHash = payload.password
    await user.save()

    recoveryRequest.recoveredAt = DateTime.now()
    await recoveryRequest.save()

    return response.ok({ message: 'Password updated successfully' })
  }
}