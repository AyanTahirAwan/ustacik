import vine from '@vinejs/vine'

/**
 * Shared rules for localized region names.
 */
const name = () => vine.string().trim().minLength(2).maxLength(120)

/**
 * Validates the payload for creating a region.
 */
export const createRegionValidator = vine.create({
  nameEn: name().unique({ table: 'regions', column: 'name_en' }),
  nameTr: name().unique({ table: 'regions', column: 'name_tr' }),
})

/**
 * Validates the payload for updating a region.
 */
export const updateRegionValidator = vine.create({
  nameEn: name().unique({ table: 'regions', column: 'name_en' }).optional(),
  nameTr: name().unique({ table: 'regions', column: 'name_tr' }).optional(),
})
