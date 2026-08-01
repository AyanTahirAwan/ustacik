import vine from '@vinejs/vine'

export const openDisputeValidator = vine.compile(
  vine.object({
    jobId: vine.number().positive(),
    reasonCategory: vine.enum(['price', 'workmanship', 'punctuality', 'communication', 'other']),
    customerNotes: vine.string().trim().minLength(5),
  })
)