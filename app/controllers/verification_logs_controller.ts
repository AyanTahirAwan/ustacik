import VerificationLog from '#models/verification_log'
import { recordVerificationValidator } from '#validators/verification_log'
import type { HttpContext } from '@adonisjs/core/http'

export default class VerificationLogsController {
  async own({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const logs = await VerificationLog.query()
      .where('craftsman_id', user.id)
      .orderBy('verified_at', 'desc')

    return response.ok({ logs })
  }

  async forCraftsman({ params, response }: HttpContext) {
    const logs = await VerificationLog.query()
      .where('craftsman_id', params.craftsmanId)
      .preload('checkedBy')
      .orderBy('verified_at', 'desc')

    return response.ok({ logs })
  }

  async store({ auth, params, request, response }: HttpContext) {
    const admin = auth.getUserOrFail()
    const payload = await request.validateUsing(recordVerificationValidator)

    const log = await VerificationLog.record({
      craftsmanId: Number(params.craftsmanId),
      checkedById: admin.id,
      ...payload,
    })

    return response.created({ log })
  }
}
