import vine from '@vinejs/vine'

export const createJobDisputeValidator = vine.create({
  reasonCategory: vine.enum([
    'price',
    'workmanship',
    'punctuality',
    'communication',
    'other',
  ] as const),
  customerNotes: vine.string().trim().minLength(10).maxLength(2000),
})

export const resolveJobDisputeValidator = vine.create({
  status: vine.enum(['OPEN', 'INVESTIGATING', 'CLOSED'] as const),
  adminResolutionNotes: vine.string().trim().maxLength(2000).optional(),
  finalJobStatus: vine.enum(['completed', 'cancelled'] as const).optional(),
})
