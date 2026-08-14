import vine from '@vinejs/vine'
import { emailRule, phoneRule } from '#validators/user'

export const sendEmailVerificationValidator = vine.create({
  email: emailRule(),
})

export const sendPhoneVerificationValidator = vine.create({
  phone: phoneRule(),
})

export const verifyCodeValidator = vine.create({
  code: vine
    .string()
    .trim()
    .regex(/^\d{6}$/),
})
