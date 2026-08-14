import vine from '@vinejs/vine'

export const phoneVerificationSettingValidator = vine.create({
  enabled: vine.enum(['true', 'false'] as const),
})
