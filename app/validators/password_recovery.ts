import vine from '@vinejs/vine'
import { emailRule, passwordRule } from '#validators/user'

export const requestPasswordRecoveryValidator = vine.create({
  email: emailRule(),
})

export const redeemPasswordRecoveryValidator = vine.create({
  password: passwordRule().confirmed({ confirmationField: 'passwordConfirmation' }),
})
