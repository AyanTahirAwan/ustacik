import vine from '@vinejs/vine'

const rating = () => vine.number().withoutDecimals().min(1).max(5)

export const createReviewValidator = vine.create({
  jobId: vine.number().withoutDecimals().min(1).exists({ table: 'job_requests', column: 'id' }),
  punctuality: rating(),
  workmanship: rating(),
  priceHonesty: rating(),
  communication: rating(),
  comment: vine.string().trim().maxLength(2000).optional(),
})

export const replyReviewValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(1000),
})
