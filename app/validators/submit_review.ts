import vine from '@vinejs/vine'

export const submitReviewValidator = vine.compile(
  vine.object({
    jobId: vine.number().positive(),
    punctuality: vine.number().min(1).max(5),
    workmanship: vine.number().min(1).max(5),
    priceHonesty: vine.number().min(1).max(5),
    communication: vine.number().min(1).max(5),
    comment: vine.string().trim().optional(),
  })
)