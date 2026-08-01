import type { HttpContext } from '@adonisjs/core/http'
import JobDispute from '#models/job_dispute'
import JobRequest from '#models/job_request'
import { openDisputeValidator } from '#validators/open_dispute'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class JobDisputesController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.role === 'admin') {
      const disputes = await JobDispute.query().orderBy('created_at', 'desc')
      return response.json(disputes)
    }

    if (user.role === 'customer') {
      const disputes = await JobDispute.query().where('customer_id', user.id).orderBy('created_at', 'desc')
      return response.json(disputes)
    }

    if (user.role === 'craftsman') {
      const disputes = await JobDispute.query().where('craftsman_id', user.id).orderBy('created_at', 'desc')
      return response.json(disputes)
    }

    return response.forbidden('Invalid user role')
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'customer') {
      return response.forbidden('Only customers can open a dispute')
    }

    const payload = await request.validateUsing(openDisputeValidator)
    const job = await JobRequest.findOrFail(payload.jobId)

    if (job.customerId !== user.id) {
      return response.forbidden('You can only dispute your own job requests')
    }

    if (!job.canTransitionTo('disputed')) {
      return response.badRequest(`Cannot dispute job in status '${job.status}'`)
    }

    const dispute = await db.transaction(async (trx) => {
      // Transition job request status to 'disputed'
      job.useTransaction(trx)
      await job.transitionTo('disputed')

      // Create dispute record
      const newDispute = await JobDispute.create(
        {
          jobId: job.id,
          customerId: user.id,
          craftsmanId: job.craftsmanId,
          reasonCategory: payload.reasonCategory,
          customerNotes: payload.customerNotes,
          status: 'OPEN',
        },
        { client: trx }
      )

      return newDispute
    })

    return response.created(dispute)
  }

  async show({ params, response, auth }: HttpContext) {
    const dispute = await JobDispute.findOrFail(params.id)
    const user = auth.user!

    if (user.role === 'admin') {
      return response.json(dispute)
    }
    if (user.role === 'customer' && dispute.customerId === user.id) {
      return response.json(dispute)
    }
    if (user.role === 'craftsman' && dispute.craftsmanId === user.id) {
      return response.json(dispute)
    }

    return response.forbidden('You do not have access to this dispute')
  }

  async update({ params, request, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only administrators can resolve disputes')
    }

    const dispute = await JobDispute.findOrFail(params.id)
    const notes = request.input('adminResolutionNotes')
    const finalJobStatus = request.input('finalJobStatus') // 'completed' or 'cancelled'

    if (!notes) {
      return response.badRequest('Admin resolution notes are required to resolve a dispute')
    }

    if (finalJobStatus && finalJobStatus !== 'completed' && finalJobStatus !== 'cancelled') {
      return response.badRequest("Final job status must be either 'completed' or 'cancelled'")
    }

    await db.transaction(async (trx) => {
      dispute.useTransaction(trx)
      dispute.adminResolutionNotes = notes
      dispute.status = 'CLOSED'
      dispute.resolvedAt = DateTime.now()
      await dispute.save()

      if (finalJobStatus) {
        const job = await JobRequest.findOrFail(dispute.jobId)
        job.useTransaction(trx)
        await job.transitionTo(finalJobStatus)
      }
    })

    return response.json(dispute)
  }

  async destroy({ response }: HttpContext) {
    return response.notImplemented('Deleting disputes is not allowed')
  }
}