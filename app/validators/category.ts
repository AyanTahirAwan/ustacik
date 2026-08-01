import vine from '@vinejs/vine'

/**
 * Shared rules for localized category names.
 */
const name = () => vine.string().trim().minLength(2).maxLength(120)

/**
 * Validates the payload for creating a category.
 */
export const createCategoryValidator = vine.create({
  nameEn: name().unique({ table: 'categories', column: 'name_en' }),
  nameTr: name().unique({ table: 'categories', column: 'name_tr' }),
})

/**
 * Validates the payload for updating a category.
 */
export const updateCategoryValidator = vine.create({
  nameEn: name().unique({ table: 'categories', column: 'name_en' }).optional(),
  nameTr: name().unique({ table: 'categories', column: 'name_tr' }).optional(),
})
