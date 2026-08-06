import vine from '@vinejs/vine'

export const requestPasswordRecoveryValidator = vine.create({
  email: vine.string().email().maxLength(254),
})

export const redeemPasswordRecoveryValidator = vine.create({
  password: vine
    .string()
    .minLength(8)
    .maxLength(64)
    .confirmed({ confirmationField: 'passwordConfirmation' }),
})
