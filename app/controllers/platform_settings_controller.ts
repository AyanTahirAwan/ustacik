import type { HttpContext } from '@adonisjs/core/http'
import { PlatformSettingsService } from '#services/platform_settings_service'
import { phoneVerificationSettingValidator } from '#validators/platform_settings'

export default class PlatformSettingsController {
  async dashboard({ view }: HttpContext) {
    return view.render('pages/admin/dashboard', {
      phoneVerificationEnabled: await PlatformSettingsService.isPhoneVerificationEnabled(),
    })
  }

  async updatePhoneVerification({ request, response, session }: HttpContext) {
    const { enabled } = await request.validateUsing(phoneVerificationSettingValidator)
    const isEnabled = enabled === 'true'
    await PlatformSettingsService.setPhoneVerificationEnabled(isEnabled)

    session.flash(
      'success',
      isEnabled
        ? 'Phone verification is enabled. SMS delivery must also be configured.'
        : 'Phone verification is disabled.'
    )
    return response.redirect('/admin')
  }
}
