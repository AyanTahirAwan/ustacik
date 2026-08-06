import vine from '@vinejs/vine'

export const updateCustomerValidator = vine.create({
  fullName: vine.string().trim().minLength(2).maxLength(160).optional(),

  defaultRegionId: vine
    .number()
    .withoutDecimals()
    .min(1)
    .exists({ table: 'regions', column: 'id' })
    .nullable()
    .optional(),

  language: vine.string().trim().minLength(2).maxLength(8).optional(),

  smsOptIn: vine.boolean().optional(),
})
