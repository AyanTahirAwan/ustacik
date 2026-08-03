import vine from '@vinejs/vine'

/**
 * Rejects a max price that is lower than the supplied min price.
 *
 * Handles both number and string values in field.data to be safe
 * across JSON bodies and form-encoded payloads.
 */
const maximumPriceIsNotBelowMinimum = vine.createRule((value, _options, field) => {
  if (!field.isValid) return

  const maxVal = typeof value === 'string' ? Number(value) : value
  if (typeof maxVal !== 'number' || Number.isNaN(maxVal)) return

  const rawMinPrice = field.data.minPrice
  const minimumPrice =
    typeof rawMinPrice === 'string' ? Number(rawMinPrice) : vine.helpers.asNumber(rawMinPrice)
  if (!Number.isFinite(minimumPrice)) return

  if (maxVal < minimumPrice) {
    field.report(
      'The max price must be greater than or equal to the min price',
      'priceRange',
      field
    )
  }
})

const price = () => vine.number().min(0)

/**
 * Validates the payload for creating a service price catalog entry.
 *
 * @note `craftsmanId` is intentionally NOT accepted here. The controller
 * assigns it from the authenticated craftsman's user account.
 */
export const createServicePriceCatalogValidator = vine.create({
  subServiceId: vine.number().min(1).exists({ table: 'sub_services', column: 'id' }),
  regionId: vine.number().min(1).exists({ table: 'regions', column: 'id' }),
  minPrice: price(),
  maxPrice: price().use(maximumPriceIsNotBelowMinimum()),
  currency: vine.enum(['TRY', 'GBP', 'EUR', 'USD'] as const),
  isActive: vine.boolean().optional(),
})

/**
 * Validates the payload for updating a service price catalog entry.
 *
 * @note `craftsmanId` is intentionally NOT accepted here. Ownership is
 * enforced by the controller from the authenticated craftsman's user account.
 */
export const updateServicePriceCatalogValidator = vine.create({
  subServiceId: vine.number().min(1).exists({ table: 'sub_services', column: 'id' }).optional(),
  regionId: vine.number().min(1).exists({ table: 'regions', column: 'id' }).optional(),
  minPrice: price().optional(),
  maxPrice: price().use(maximumPriceIsNotBelowMinimum()).optional(),
  currency: vine.enum(['TRY', 'GBP', 'EUR', 'USD'] as const).optional(),
  isActive: vine.boolean().optional(),
})
