import vine from '@vinejs/vine'

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

export const createServicePriceCatalogValidator = vine.create({
  subServiceId: vine.number().min(1).exists({ table: 'sub_services', column: 'id' }),
  regionId: vine.number().min(1).exists({ table: 'regions', column: 'id' }),
  minPrice: price(),
  maxPrice: price().use(maximumPriceIsNotBelowMinimum()),
  currency: vine.enum(['TRY', 'GBP', 'EUR', 'USD'] as const),
  isActive: vine.boolean().optional(),
})

export const updateServicePriceCatalogValidator = vine.create({
  subServiceId: vine.number().min(1).exists({ table: 'sub_services', column: 'id' }).optional(),
  regionId: vine.number().min(1).exists({ table: 'regions', column: 'id' }).optional(),
  minPrice: price().optional(),
  maxPrice: price().use(maximumPriceIsNotBelowMinimum()).optional(),
  currency: vine.enum(['TRY', 'GBP', 'EUR', 'USD'] as const).optional(),
  isActive: vine.boolean().optional(),
})
