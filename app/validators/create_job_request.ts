import vine from '@vinejs/vine'

export const createJobRequestValidator = vine.compile(
  vine.object({
    requestId: vine.string().trim().maxLength(255).optional(),
    craftsmanId: vine.number().positive().optional(),
    categoryId: vine.number().positive(),
    regionId: vine.number().positive(),
    description: vine.string().trim().minLength(5),
  })
)