import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(120)

export const createSubServiceValidator = vine.create({
  categoryId: vine.number().min(1).exists({ table: 'categories', column: 'id' }),
  nameEn: name(),
  nameTr: name(),
})

export const updateSubServiceValidator = vine.create({
  categoryId: vine.number().min(1).exists({ table: 'categories', column: 'id' }).optional(),
  nameEn: name().optional(),
  nameTr: name().optional(),
})
