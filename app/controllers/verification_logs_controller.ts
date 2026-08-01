import type { HttpContext } from '@adonisjs/core/http'
import VerificationLog from '#models/verification_log'
import { submitVerificationLogValidator } from '#validators/submit_verification_log'

export default class VerificationLogsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only administrators can access verification logs')
    }

    const logs = await VerificationLog.query().orderBy('verified_at', 'desc')
    return response.json(logs)
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only administrators can perform verifications')
    }

    const payload = await request.validateUsing(submitVerificationLogValidator)

    try {
      const log = await VerificationLog.record({
        ...payload,
        checkedById: user.id,
      })
      return response.created(log)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      return response.badRequest({ message })
    }
  }

  async show({ params, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only administrators can view verification logs')
    }

    const log = await VerificationLog.findOrFail(params.id)
    return response.json(log)
  }

  async update({ response }: HttpContext) {
    return response.notImplemented('Updating verification logs is not allowed')
  }

  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only administrators can delete verification logs')
    }

    const log = await VerificationLog.findOrFail(params.id)
    await log.delete()
    return response.noContent()
  }
}