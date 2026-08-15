import JobRequest from '#models/job_request'
import JobDispute from '#models/job_dispute'
import { createJobDisputeValidator, resolveJobDisputeValidator } from '#validators/job_dispute'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class JobDisputesController {
  async store({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createJobDisputeValidator)

    const job = await JobRequest.findOrFail(params.jobId)

    const belongsToUser =
      (user.role === 'customer' && job.customerId === user.id) ||
      (user.role === 'craftsman' && job.craftsmanId === user.id)

    if (!belongsToUser) {
      return response.forbidden({ message: 'You are not part of this job' })
    }

    if (!job.canTransitionTo('disputed')) {
      return response.badRequest({
        message: `Cannot open a dispute on a job with status ${job.status}`,
      })
    }

    try {
      const dispute = await db.transaction(async (trx) => {
        job.useTransaction(trx)
        await job.transitionTo('disputed')

        return JobDispute.create(
          {
            jobId: job.id,
            customerId: job.customerId,
            craftsmanId: job.craftsmanId,
            reasonCategory: payload.reasonCategory,
            customerNotes: payload.customerNotes,
            status: 'OPEN',
          },
          { client: trx }
        )
      })

      return response.created({ dispute })
    } catch (error: any) {
      return response.badRequest({ message: error?.message ?? String(error) })
    }
  }

  async index({ response }: HttpContext) {
    const disputes = await JobDispute.query()
      .preload('job')
      .preload('customer')
      .preload('craftsman')
      .orderBy('created_at', 'desc')

    return response.ok({ disputes })
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(resolveJobDisputeValidator)
    const dispute = await JobDispute.findOrFail(params.id)

    try {
      const updated = await db.transaction(async (trx) => {
        dispute.useTransaction(trx)
        dispute.status = payload.status
        if (payload.adminResolutionNotes !== undefined) {
          dispute.adminResolutionNotes = payload.adminResolutionNotes
        }

        if (payload.status === 'CLOSED') {
          dispute.resolvedAt = DateTime.now()

          if (payload.finalJobStatus) {
            const job = await JobRequest.query({ client: trx })
              .where('id', dispute.jobId)
              .firstOrFail()
            job.useTransaction(trx)
            await job.transitionTo(payload.finalJobStatus)
          }
        }

        await dispute.save()
        return dispute
      })

      return response.ok({ dispute: updated })
    } catch (error: any) {
      return response.badRequest({ message: error?.message ?? String(error) })
    }
  }

  async destroy({ response }: HttpContext) {
    return response.notImplemented({ message: 'Disputes are never deleted, only resolved' })
  }
}
