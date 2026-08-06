import vine from '@vinejs/vine'

const notNegative = vine.createRule((value, _options, field) => {
  if (!field.isValid) return

  const num = typeof value === 'string' ? Number(value) : value
  if (typeof num !== 'number' || Number.isNaN(num)) return

  if (num < 0) {
    field.report('The {{ field }} must be non-negative', 'negative', field)
  }
})

const maximumPriceIsNotBelowMinimum = vine.createRule((value, _, field) => {
  if (!field.isValid) return

  const maxVal = typeof value === 'string' ? Number(value) : value
  if (typeof maxVal !== 'number' || Number.isNaN(maxVal)) return

  const rawMinPrice = field.data.minPrice
  const minimumPrice =
    typeof rawMinPrice === 'string' ? Number(rawMinPrice) : vine.helpers.asNumber(rawMinPrice)
  if (!Number.isFinite(minimumPrice) || minimumPrice < 0) return

  if (maxVal < minimumPrice) {
    field.report(
      'The max price must be greater than or equal to the min price',
      'priceRange',
      field
    )
  }
})

const positiveInteger = () => vine.number().positive().withoutDecimals().optional()
const nonNegativePrice = () => vine.number().withoutDecimals().use(notNegative()).optional()

export const catalogSearchValidator = vine.create({
  categoryId: positiveInteger(),
  subServiceId: positiveInteger(),
  regionId: positiveInteger(),
  minPrice: nonNegativePrice(),
  maxPrice: vine
    .number()
    .withoutDecimals()
    .use(notNegative())
    .use(maximumPriceIsNotBelowMinimum())
    .optional(),
})
