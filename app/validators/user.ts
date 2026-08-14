import vine from '@vinejs/vine'

export const emailRule = () => vine.string().trim().toLowerCase().email().maxLength(254)
export const phoneRule = () =>
  vine
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/)
export const passwordRule = () =>
  vine.string().minLength(12).maxLength(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/)

export const signupValidator = vine.create({
  email: emailRule().unique({ table: 'users', column: 'email' }),
  phone: phoneRule().unique({ table: 'users', column: 'phone_normalised' }),
  password: passwordRule().confirmed({ confirmationField: 'passwordConfirmation' }),
  role: vine.enum(['customer', 'craftsman'] as const),

  fullName: vine.string().trim().minLength(2).maxLength(160).optional(),
  businessName: vine.string().trim().minLength(2).maxLength(160).optional(),
  categoryId: vine.number().optional(),
})

export const loginValidator = vine.create({
  email: emailRule(),
  password: vine.string().minLength(1).maxLength(128),
})
