import vine from '@vinejs/vine'

export const recordVerificationValidator = vine.create({
  levelGranted: vine.enum(['registered', 'verified', 'approved'] as const),
  idCardVerified: vine.boolean().optional(),
  pastCustomer1Called: vine.boolean().optional(),
  pastCustomer2Called: vine.boolean().optional(),
  bizRegDocUrl: vine.string().trim().url().maxLength(500).optional(),
  guaranteeDocUrl: vine.string().trim().url().maxLength(500).optional(),
  verbalConsentAudited: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(2000).optional(),
})
