import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(64)
const phone = () => vine.string().trim().minLength(8).maxLength(32)

export const signupValidator = vine.create({
  email: email().unique({ table: 'users', column: 'email', caseInsensitive: true }),
  phone: phone().unique({ table: 'users', column: 'phone_normalised' }),
  password: password().confirmed({ confirmationField: 'passwordConfirmation' }),
  role: vine.enum(['customer', 'craftsman'] as const),

  fullName: vine.string().trim().minLength(2).maxLength(160).optional(),
  businessName: vine.string().trim().minLength(2).maxLength(160).optional(),
  categoryId: vine.number().optional(),
})
