import vine from '@vinejs/vine'

export const createJobRequestValidator = vine.create({
  requestId: vine.string().trim().minLength(8).maxLength(255),
  craftsmanId: vine
    .number()
    .withoutDecimals()
    .min(1)
    .exists({ table: 'craftsmen', column: 'user_id' }),
  regionId: vine.number().withoutDecimals().min(1).exists({ table: 'regions', column: 'id' }),
  description: vine.string().trim().minLength(10).maxLength(2000),
})

export const updateJobRequestValidator = vine.create({
  description: vine.string().trim().minLength(10).maxLength(2000),
})
