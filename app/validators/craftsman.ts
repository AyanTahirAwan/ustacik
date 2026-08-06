import vine from '@vinejs/vine'

export const updateCraftsmanValidator = vine.create({
  businessName: vine.string().trim().minLength(2).maxLength(160).optional(),

  categoryId: vine
    .number()
    .withoutDecimals()
    .min(1)
    .exists({ table: 'categories', column: 'id' })
    .optional(),

  bio: vine.string().trim().maxLength(2000).nullable().optional(),

  bizRegNo: vine.string().trim().maxLength(64).nullable().optional(),

  verbalConsent: vine.boolean().optional(),
})
