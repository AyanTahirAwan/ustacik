import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(120)

export const createCategoryValidator = vine.create({
  nameEn: name().unique({ table: 'categories', column: 'name_en' }),
  nameTr: name().unique({ table: 'categories', column: 'name_tr' }),
})

export const updateCategoryValidator = vine.create({
  nameEn: name().unique({ table: 'categories', column: 'name_en' }).optional(),
  nameTr: name().unique({ table: 'categories', column: 'name_tr' }).optional(),
})
