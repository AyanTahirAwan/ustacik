import User from '#models/user'
import PasswordRecoveryRequest from '#models/password_recovery_request'
import {
  requestPasswordRecoveryValidator,
  redeemPasswordRecoveryValidator,
} from '#validators/password_recovery'
import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { EmailDeliveryService } from '#services/email_delivery_service'

export default class PasswordRecoveryRequestsController {
  private tokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  async create({ view, params }: HttpContext) {
    return view.render('pages/auth/reset_password', { token: params.shortcode })
  }

  async createRequest({ view }: HttpContext) {
    return view.render('pages/auth/forgot_password')
  }

  async store({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(requestPasswordRecoveryValidator)
    await this.issueReset(email)

    return response.ok({
      message: 'If that email exists, a password recovery link has been sent',
    })
  }

  async storeFromForm({ request, response, session }: HttpContext) {
    const { email } = await request.validateUsing(requestPasswordRecoveryValidator)
    await this.issueReset(email)

    session.flash('success', 'If that email exists, a password recovery link has been sent')
    return response.redirect().toRoute('session.create')
  }

  private async issueReset(email: string) {
    const user = await User.findBy('email', email)

    if (user) {
      // Only the digest is persisted. Earlier requests are invalidated first.
      await PasswordRecoveryRequest.query()
        .where('user_id', user.id)
        .whereNull('recovered_at')
        .update({
          recovered_at: DateTime.now().toSQL(),
        })
      const token = randomBytes(32).toString('base64url')
      await PasswordRecoveryRequest.create({
        userId: user.id,
        shortcode: this.tokenHash(token),
        expiryDate: DateTime.now().plus({ hours: 1 }),
      })
      try {
        await EmailDeliveryService.send({
          to: user.email,
          subject: 'Reset your Ustacik password',
          text: `Use this link to reset your password within one hour: ${new URL(`/password-reset/${token}`, env.get('APP_URL')).toString()}`,
        })
      } catch {
        // Keep the response indistinguishable from an unknown email address.
      }
    }
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(redeemPasswordRecoveryValidator)
    const reset = await this.redeem(params.shortcode, payload.password)

    if (!reset) {
      return response.badRequest({ message: 'This recovery link is invalid or has expired' })
    }

    return response.ok({ message: 'Password updated successfully' })
  }

  async updateFromForm({ params, request, response, session }: HttpContext) {
    const payload = await request.validateUsing(redeemPasswordRecoveryValidator)
    const reset = await this.redeem(params.shortcode, payload.password)

    if (!reset) {
      session.flash('error', 'This recovery link is invalid or has expired')
      return response.redirect().back()
    }

    session.flash('success', 'Password updated successfully. You can now log in.')
    return response.redirect().toRoute('session.create')
  }

  private async redeem(shortcode: string, password: string) {
    const recoveryRequest = await PasswordRecoveryRequest.query()
      .where('shortcode', this.tokenHash(shortcode))
      .first()

    if (!recoveryRequest || !recoveryRequest.isUsable) return false

    const user = await User.findOrFail(recoveryRequest.userId)
    user.passwordHash = password
    await user.save()

    recoveryRequest.recoveredAt = DateTime.now()
    await recoveryRequest.save()

    return true
  }
}
