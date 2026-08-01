import vine from '@vinejs/vine'

export const updateJobRequestValidator = vine.compile(
  vine.object({
    status: vine.enum([
      'pending',
      'accepted',
      'declined',
      'in_progress',
      'completed',
      'cancelled',
      'expired',
      'disputed',
    ]),
  })
)