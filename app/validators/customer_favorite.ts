import vine from '@vinejs/vine'

export const createCustomerFavoriteValidator = vine.create({
  craftsmanId: vine
    .number()
    .withoutDecimals()
    .min(1)
    .exists({ table: 'craftsmen', column: 'user_id' }),
})
