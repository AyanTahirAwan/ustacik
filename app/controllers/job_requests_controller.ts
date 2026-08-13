import JobRequest from '#models/job_request'
import Craftsman from '#models/craftsman'
import UserNotification, { type NotificationType } from '#models/user_notification'
import { createJobRequestValidator, updateJobRequestValidator } from '#validators/job_request'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

type TransitionStatus = 'accepted' | 'declined' | 'in_progress' | 'completed'

const transitionNotifications: Record<
  TransitionStatus,
  { type: NotificationType; title: string; messageBody: string }
> = {
  accepted: {
    type: 'job_accepted',
    title: 'Request accepted',
    messageBody: 'Your service request was accepted.',
  },
  declined: {
    type: 'job_declined',
    title: 'Request declined',
    messageBody: 'Your service request was declined.',
  },
  in_progress: {
    type: 'system',
    title: 'Work started',
    messageBody: 'Work on your service request has started.',
  },
  completed: {
    type: 'job_completed',
    title: 'Work completed',
    messageBody: 'Your service request has been completed.',
  },
}

const contactEligibleStatuses = new Set(['accepted', 'in_progress', 'completed'])
const whatsappMessage = 'Hello, I found your service through Ustacik regarding my service request.'

function whatsappNumber(phone: string) {
  const compact = phone.trim().replace(/[\s().-]/g, '')
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) return null
  return compact.slice(1)
}

export default class JobRequestsController {
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createJobRequestValidator)

    const craftsman = await Craftsman.findOrFail(payload.craftsmanId)
    let job: JobRequest
    try {
      job = await db.transaction(async (trx) => {
        const existingJob = await JobRequest.query({ client: trx })
          .where('request_id', payload.requestId)
          .first()
        const submittedJob = await JobRequest.submit(
          {
            requestId: payload.requestId,
            customerId: user.id,
            craftsmanId: craftsman.userId,
            categoryId: craftsman.categoryId,
            regionId: payload.regionId,
            description: payload.description,
          },
          trx
        )

        if (!existingJob) {
          await UserNotification.firstOrCreate(
            {
              userId: submittedJob.craftsmanId,
              type: 'job_request_received',
              relatedJobId: submittedJob.id,
            },
            {
              title: 'New service request',
              messageBody: 'You have a new service request.',
              isRead: false,
              sentAt: DateTime.now(),
            },
            { client: trx }
          )
        }

        return submittedJob
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'REQUEST_ID_OWNERSHIP_CONFLICT') {
        return response.conflict({ message: 'Unable to reuse this request identifier.' })
      }
      throw error
    }

    return response.created({ job })
  }

  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const query = JobRequest.query()
      .preload('customer', (customers) => customers.select(['userId', 'fullName']))
      .preload('craftsman', (craftsmen) => craftsmen.select(['userId', 'businessName']))
      .preload('category')
      .preload('region')
      .preload('review')
      .orderBy('created_at', 'desc')

    if (user.role === 'customer') {
      query.where('customer_id', user.id)
    } else if (user.role === 'craftsman') {
      query.where('craftsman_id', user.id)
    }

    const jobs = await query

    if (user.role === 'customer') {
      return response.ok({
        jobs: jobs.map((job) => ({
          id: job.id,
          craftsman: { businessName: job.craftsman.businessName },
          category: { nameEn: job.category.nameEn, nameTr: job.category.nameTr },
          region: { nameEn: job.region.nameEn, nameTr: job.region.nameTr },
          description: job.description,
          status: job.status,
          reviewed: Boolean(job.review),
          createdAt: job.createdAt,
        })),
      })
    }

    if (user.role === 'craftsman') {
      return response.ok({
        jobs: jobs.map((job) => ({
          id: job.id,
          customer: { fullName: job.customer.fullName },
          category: { nameEn: job.category.nameEn, nameTr: job.category.nameTr },
          region: { nameEn: job.region.nameEn, nameTr: job.region.nameTr },
          description: job.description,
          status: job.status,
          createdAt: job.createdAt,
        })),
      })
    }

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

  async contact({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const job = await JobRequest.query()
      .where('id', params.id)
      .where('customer_id', user.id)
      .preload('craftsman', (craftsmen) =>
        craftsmen
          .select(['userId', 'businessName'])
          .preload('user', (users) => users.select(['id', 'phoneNormalised']))
      )
      .firstOrFail()

    if (!contactEligibleStatuses.has(job.status)) {
      return response.forbidden({
        message: 'Craftsman contact is available after the request is accepted.',
      })
    }

    const number = whatsappNumber(job.craftsman.user.phoneNormalised)
    if (!number) {
      return response.unprocessableEntity({
        message: 'Craftsman contact is currently unavailable.',
      })
    }

    return response.ok({
      craftsmanName: job.craftsman.businessName,
      phone: job.craftsman.user.phoneNormalised,
      whatsappUrl: `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`,
    })
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
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  async destroy({ response }: HttpContext) {
    return response.notImplemented({ message: 'Job requests are never deleted, only cancelled' })
  }

  private async transition({ auth, params, response }: HttpContext, status: TransitionStatus) {
    const user = auth.getUserOrFail()

    try {
      const job = await db.transaction(async (trx) => {
        const transitioningJob = await JobRequest.query({ client: trx })
          .where('id', params.id)
          .where('craftsman_id', user.id)
          .firstOrFail()
        await transitioningJob.transitionTo(status)
        const notification = transitionNotifications[status]
        await UserNotification.firstOrCreate(
          {
            userId: transitioningJob.customerId,
            type: notification.type,
            relatedJobId: transitioningJob.id,
          },
          {
            title: notification.title,
            messageBody: notification.messageBody,
            isRead: false,
            sentAt: DateTime.now(),
          },
          { client: trx }
        )
        return transitioningJob
      })
      return response.ok({ job })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }
}
