import vine from '@vinejs/vine'

export const catalogPricesValidator = vine.create({
  categoryId: vine.number().positive().withoutDecimals().optional(),
  subServiceId: vine.number().positive().withoutDecimals().optional(),
  regionId: vine.number().positive().withoutDecimals().optional(),
  minPrice: vine.number().positive().withoutDecimals().optional(),
  maxPrice: vine.number().positive().withoutDecimals().optional(),
})

export const catalogSubServicesValidator = vine.create({
  categoryId: vine.number().positive().withoutDecimals(),
})
