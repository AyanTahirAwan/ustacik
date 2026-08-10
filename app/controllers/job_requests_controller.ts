import JobRequest from '#models/job_request'
import Craftsman from '#models/craftsman'
import { createJobRequestValidator, updateJobRequestValidator } from '#validators/job_request'
import type { HttpContext } from '@adonisjs/core/http'

type TransitionStatus = 'accepted' | 'declined' | 'in_progress' | 'completed'

export default class JobRequestsController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createJobRequestValidator)

    const craftsman = await Craftsman.findOrFail(payload.craftsmanId)

    const job = await JobRequest.submit({
      requestId: payload.requestId,
      customerId: user.id,
      craftsmanId: craftsman.userId,
      categoryId: craftsman.categoryId,
      regionId: payload.regionId,
      description: payload.description,
    })

    return response.created({ job })
  }

  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const query = JobRequest.query().orderBy('created_at', 'desc')

    if (user.role === 'customer') {
      query.where('customer_id', user.id)
    } else if (user.role === 'craftsman') {
      query.where('craftsman_id', user.id)
    }

    const jobs = await query
    return response.ok({ jobs })
  }

  async show({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const job = await JobRequest.query()
      .where('id', params.id)
      .preload('customer')
      .preload('craftsman')
      .preload('category')
      .preload('region')
      .firstOrFail()

    const forbidden =
      (user.role === 'customer' && job.customerId !== user.id) ||
      (user.role === 'craftsman' && job.craftsmanId !== user.id)

    if (forbidden) {
      return response.forbidden({ message: 'You do not have access to this job' })
    }

    return response.ok({ job })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateJobRequestValidator)

    const job = await JobRequest.query()
      .where('id', params.id)
      .where('customer_id', user.id)
      .firstOrFail()

    if (job.status !== 'pending') {
      return response.forbidden({ message: 'Only pending jobs can be edited' })
    }

    job.merge(payload)
    await job.save()

    return response.ok({ job })
  }

  async accept(ctx: HttpContext) {
    return this.transition(ctx, 'accepted')
  }

  async decline(ctx: HttpContext) {
    return this.transition(ctx, 'declined')
  }

  async start(ctx: HttpContext) {
    return this.transition(ctx, 'in_progress')
  }

  async complete(ctx: HttpContext) {
    return this.transition(ctx, 'completed')
  }

  async cancel({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const job =
      user.role === 'admin'
        ? await JobRequest.findOrFail(params.id)
        : await JobRequest.query()
            .where('id', params.id)
            .where('customer_id', user.id)
            .firstOrFail()

    if (user.role !== 'admin' && job.status === 'in_progress') {
      return response.forbidden({ message: 'Jobs cannot be cancelled once work has started' })
    }

    try {
      await job.transitionTo('cancelled')
      return response.ok({ job })
    } catch (error: any) {
      return response.badRequest({ message: error.message })
    }
  }

  async destroy({ response }: HttpContext) {
    return response.notImplemented({ message: 'Job requests are never deleted, only cancelled' })
  }

  private async transition({ auth, params, response }: HttpContext, status: TransitionStatus) {
    const user = auth.getUserOrFail()

    const job = await JobRequest.query()
      .where('id', params.id)
      .where('craftsman_id', user.id)
      .firstOrFail()

    try {
      await job.transitionTo(status)
      return response.ok({ job })
    } catch (error: any) {
      return response.badRequest({ message: error.message })
    }
  }
}
