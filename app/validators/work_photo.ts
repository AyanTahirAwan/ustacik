import vine from '@vinejs/vine'

export const createWorkPhotoValidator = vine.create({
  image: vine.file({
    size: '5mb',
    extnames: ['jpg', 'jpeg', 'png', 'webp'],
  }),
})
