import { updateAccountPasswordValidator } from '#validators/account'
import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'

export default class AccountController {
  async updatePassword({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateAccountPasswordValidator)

    const currentPasswordMatches = await hash.verify(user.passwordHash, payload.currentPassword)
    if (!currentPasswordMatches) {
      return response.unprocessableEntity({
        errors: [{ field: 'currentPassword', message: 'Current password is incorrect.' }],
      })
    }

    const passwordIsUnchanged = await hash.verify(user.passwordHash, payload.newPassword)
    if (passwordIsUnchanged) {
      return response.unprocessableEntity({
        errors: [
          {
            field: 'newPassword',
            message: 'New password must be different from the current password.',
          },
        ],
      })
    }

    user.passwordHash = payload.newPassword
    await user.save()

    return response.ok({ message: 'Password updated successfully.' })
  }
}
