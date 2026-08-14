import PlatformSetting from '#models/platform_setting'

const PHONE_VERIFICATION_KEY = 'phone_verification_enabled'

export class PlatformSettingsService {
  static async isPhoneVerificationEnabled() {
    const setting = await PlatformSetting.findBy('key', PHONE_VERIFICATION_KEY)
    return setting?.value === 'true'
  }

  static async setPhoneVerificationEnabled(enabled: boolean) {
    const setting = await PlatformSetting.firstOrCreate(
      { key: PHONE_VERIFICATION_KEY },
      { value: String(enabled) }
    )

    setting.value = String(enabled)
    await setting.save()
    return enabled
  }
}
