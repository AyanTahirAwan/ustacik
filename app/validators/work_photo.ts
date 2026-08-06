import vine from '@vinejs/vine'

export const createWorkPhotoValidator = vine.create({
  imageUrl: vine.string().trim().url().maxLength(500),
})
