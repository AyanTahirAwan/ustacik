import Craftsman from '#models/craftsman'
import User from '#models/user'
import VerificationLog from '#models/verification_log'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminVerificationsController {
  async index({ response }: HttpContext) {
    const pendingCraftsmen = await Craftsman.query()
      .preload('user')
      .preload('category')
      .orderBy('createdAt', 'desc')

    return response.ok({ craftsmen: pendingCraftsmen })
  }

  async approve({ auth, params, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const craftsman = await Craftsman.findOrFail(params.id)
    const user = await User.findOrFail(craftsman.userId)

    craftsman.verificationStatus = 'approved'
    craftsman.trustLevel = Math.max(craftsman.trustLevel, 1)
    await craftsman.save()

    user.status = 'active'
    await user.save()

    await VerificationLog.record({
      craftsmanId: craftsman.userId,
      checkedById: admin.id,
      levelGranted: 'registered',
      idCardVerified: true,
      notes: 'ID Card verified and approved by admin.',
    })

    return response.ok({
      message: 'Craftsman verification approved successfully',
      craftsman,
      user,
    })
  }

  async reject({ params, response }: HttpContext) {
    const craftsman = await Craftsman.findOrFail(params.id)
    const user = await User.findOrFail(craftsman.userId)

    craftsman.verificationStatus = 'rejected'
    await craftsman.save()

    user.status = 'suspended'
    await user.save()

    return response.ok({
      message: 'Craftsman verification rejected',
      craftsman,
      user,
    })
  }
}
