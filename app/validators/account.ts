import vine from '@vinejs/vine'
import { passwordRule } from '#validators/user'

export const updateAccountPasswordValidator = vine.create({
  currentPassword: vine.string().minLength(1).maxLength(128),
  newPassword: passwordRule().confirmed({ confirmationField: 'newPasswordConfirmation' }),
})
