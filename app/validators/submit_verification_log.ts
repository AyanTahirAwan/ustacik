import vine from '@vinejs/vine'

export const submitVerificationLogValidator = vine.compile(
  vine.object({
    craftsmanId: vine.number().positive(),
    levelGranted: vine.enum(['registered', 'verified', 'approved']),
    idCardVerified: vine.boolean().optional(),
    pastCustomer1Called: vine.boolean().optional(),
    pastCustomer2Called: vine.boolean().optional(),
    bizRegDocUrl: vine.string().url().optional(),
    guaranteeDocUrl: vine.string().url().optional(),
    verbalConsentAudited: vine.boolean().optional(),
    notes: vine.string().trim().optional(),
  })
)