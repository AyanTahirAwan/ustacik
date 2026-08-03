import vine from '@vinejs/vine'

/**
 * Validates optional query-string filters for the public price-listing
 * endpoints (`/api/catalog/prices`). Malformed values previously fell
 * through to raw `request.input` usage and could surface as 500s.
 */
export const catalogPricesValidator = vine.create({
  categoryId: vine.number().positive().withoutDecimals().optional(),
  subServiceId: vine.number().positive().withoutDecimals().optional(),
  regionId: vine.number().positive().withoutDecimals().optional(),
  minPrice: vine.number().positive().withoutDecimals().optional(),
  maxPrice: vine.number().positive().withoutDecimals().optional(),
})

/**
 * Validates the `:categoryId` path parameter used by
 * `/api/catalog/categories/:categoryId/sub-services`.
 */
export const catalogSubServicesValidator = vine.create({
  categoryId: vine.number().positive().withoutDecimals(),
})
