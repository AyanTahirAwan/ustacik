import vine from '@vinejs/vine'

export const listUsersValidator = vine.create({
  role: vine.enum(['customer', 'craftsman', 'admin'] as const).optional(),
  status: vine.enum(['active', 'suspended'] as const).optional(),
})
