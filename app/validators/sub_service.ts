import vine from '@vinejs/vine'

/**
 * Shared rules for localized sub-service names.
 */
const name = () => vine.string().trim().minLength(2).maxLength(120)

/**
 * Validates the payload for creating a sub-service.
 *
 * @note The database enforces a composite unique constraint on
 * (category_id, name_en). VineJS validates individual fields only;
 * a duplicate (categoryId + nameEn) pair is rejected at the database
 * level and should be surfaced as a 409 by the controller.
 */
export const createSubServiceValidator = vine.create({
  categoryId: vine.number().min(1).exists({ table: 'categories', column: 'id' }),
  nameEn: name(),
  nameTr: name(),
})

/**
 * Validates the payload for updating a sub-service.
 */
export const updateSubServiceValidator = vine.create({
  categoryId: vine.number().min(1).exists({ table: 'categories', column: 'id' }).optional(),
  nameEn: name().optional(),
  nameTr: name().optional(),
})
