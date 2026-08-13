import vine from '@vinejs/vine'

export const updateAccountPasswordValidator = vine.create({
  currentPassword: vine.string().minLength(1).maxLength(64),
  newPassword: vine
    .string()
    .minLength(8)
    .maxLength(64)
    .confirmed({ confirmationField: 'newPasswordConfirmation' }),
})
