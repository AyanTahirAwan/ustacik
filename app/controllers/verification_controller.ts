import type { HttpContext } from '@adonisjs/core/http'
import { verifyCodeValidator } from '#validators/verification'
import { VerificationService } from '#services/verification_service'
import { EmailDeliveryService } from '#services/email_delivery_service'
import { SmsDeliveryService } from '#services/sms_delivery_service'
import { PlatformSettingsService } from '#services/platform_settings_service'

export default class VerificationController {
  /**
   * Send email verification code
   */
  async sendEmailCode({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      if (user.emailVerifiedAt) return response.ok({ message: 'Email is already verified' })
      if (!EmailDeliveryService.isConfigured) {
        return response.serviceUnavailable({ message: 'Email delivery is not configured' })
      }

      const { code } = await VerificationService.sendEmailVerification(user, user.email)
      await EmailDeliveryService.send({
        to: user.email,
        subject: 'Verify your Ustacik email address',
        text: `Your Ustacik email verification code is ${code}. It expires in 10 minutes.`,
      })

      return response.ok({
        message: 'Verification code sent to your email',
      })
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to send verification code',
      })
    }
  }

  /**
   * Send phone verification code
   */
  async sendPhoneCode({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      if (user.phoneVerifiedAt) return response.ok({ message: 'Phone is already verified' })
      if (!(await PlatformSettingsService.isPhoneVerificationEnabled())) {
        return response.serviceUnavailable({
          message: 'Phone verification is currently unavailable',
        })
      }
      if (!SmsDeliveryService.isConfigured) {
        return response.serviceUnavailable({ message: 'Phone verification is not configured' })
      }

      const { code } = await VerificationService.sendPhoneVerification(user, user.phoneNormalised)
      await SmsDeliveryService.send({
        to: user.phoneNormalised,
        message: `Your Ustacik phone verification code is ${code}. It expires in 10 minutes.`,
      })

      return response.ok({
        message: 'Verification code sent to your phone',
      })
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to send verification code',
      })
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { code } = await request.validateUsing(verifyCodeValidator)

      await VerificationService.verifyCode(user, 'email', code)

      return response.ok({
        message: 'Email verified successfully',
      })
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to verify code',
      })
    }
  }

  /**
   * Verify phone code
   */
  async verifyPhoneCode({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const { code } = await request.validateUsing(verifyCodeValidator)

      if (!(await PlatformSettingsService.isPhoneVerificationEnabled())) {
        return response.serviceUnavailable({
          message: 'Phone verification is currently unavailable',
        })
      }

      await VerificationService.verifyCode(user, 'phone', code)

      return response.ok({
        message: 'Phone verified successfully',
      })
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to verify code',
      })
    }
  }
}
