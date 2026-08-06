import vine from '@vinejs/vine'

const regionId = () =>
  vine.number().withoutDecimals().min(1).exists({ table: 'regions', column: 'id' })

const label = () => vine.string().trim().minLength(1).maxLength(80)
const street = () => vine.string().trim().minLength(2).maxLength(200)
const landmark = () => vine.string().trim().maxLength(200).nullable().optional()

export const createCustomerAddressValidator = vine.create({
  regionId: regionId(),
  label: label(),
  street: street(),
  landmark: landmark(),
  isDefault: vine.boolean().optional(),
})

export const updateCustomerAddressValidator = vine.create({
  regionId: regionId().optional(),
  label: label().optional(),
  street: street().optional(),
  landmark: landmark(),
  isDefault: vine.boolean().optional(),
})
