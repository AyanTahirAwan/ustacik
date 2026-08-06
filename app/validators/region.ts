import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(2).maxLength(120)

export const createRegionValidator = vine.create({
  nameEn: name().unique({ table: 'regions', column: 'name_en' }),
  nameTr: name().unique({ table: 'regions', column: 'name_tr' }),
})

export const updateRegionValidator = vine.create({
  nameEn: name().unique({ table: 'regions', column: 'name_en' }).optional(),
  nameTr: name().unique({ table: 'regions', column: 'name_tr' }).optional(),
})
