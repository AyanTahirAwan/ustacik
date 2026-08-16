import Review from '#models/review'
import ReviewHelpfulVote from '#models/review_helpful_vote'
import JobRequest from '#models/job_request'
import UserNotification from '#models/user_notification'
import { createReviewValidator, replyReviewValidator } from '#validators/review'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

export default class ReviewsController {
  async create({ auth, params, response, view }: HttpContext) {
    const user = auth.getUserOrFail()
    const job = await JobRequest.query()
      .where('id', params.jobId)
      .where('customer_id', user.id)
      .preload('review')
      .firstOrFail()

    if (job.status !== 'completed') {
      return response.redirect('/customer/requests?reviewError=not-completed')
    }
    if (job.review) {
      return response.redirect('/customer/requests?reviewed=1')
    }

    return view.render('pages/customer/review', { jobId: job.id })
  }

  async forCraftsman({ params, response }: HttpContext) {
    const reviews = await Review.query()
      .where('craftsman_id', params.craftsmanId)
      .orderBy('created_at', 'desc')

    const average =
      reviews.length >= 3
        ? reviews.reduce((sum, review) => sum + review.average, 0) / reviews.length
        : null

    return response.ok({
      reviews: reviews.map((review) => ({
        id: review.id,
        punctuality: review.punctuality,
        workmanship: review.workmanship,
        priceHonesty: review.priceHonesty,
        communication: review.communication,
        average: review.average,
        comment: review.comment,
        craftsmanReply: review.craftsmanReply,
        createdAt: review.createdAt,
      })),
      average,
      count: reviews.length,
    })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createReviewValidator)

    try {
      const review = await db.transaction(async (trx) => {
        const submittedReview = await Review.submit(
          {
            jobId: payload.jobId,
            customerId: user.id,
            punctuality: payload.punctuality,
            workmanship: payload.workmanship,
            priceHonesty: payload.priceHonesty,
            communication: payload.communication,
            comment: payload.comment,
          },
          trx
        )

        await UserNotification.firstOrCreate(
          {
            userId: submittedReview.craftsmanId,
            type: 'review_received',
            relatedJobId: submittedReview.jobId,
          },
          {
            title: 'New customer review',
            messageBody: 'You received a new customer review.',
            isRead: false,
            sentAt: DateTime.now(),
          },
          { client: trx }
        )
        return submittedReview
      })

      return response.created({ review })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Review could not be submitted'
      if (message === 'Only the customer on this job can review it') {
        return response.forbidden({ message })
      }
      if (message === 'Reviews can only be left on completed jobs') {
        return response.unprocessableEntity({ message })
      }
      if (message === 'This job has already been reviewed') {
        return response.conflict({ message })
      }
      return response.badRequest({ message })
    }
  }

  async reply({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(replyReviewValidator)
    const review = await Review.findOrFail(params.id)

    if (review.craftsmanId !== user.id) {
      return response.forbidden({ message: 'Only the reviewed craftsman can reply to this review.' })
    }

    if (review.craftsmanReply !== null && review.craftsmanReply.trim() !== '') {
      return response.badRequest({ message: 'You have already replied to this review. Replies cannot be edited.' })
    }

    try {
      await review.reply(user.id, payload.message.trim())
      return response.ok({ review })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Review reply could not be saved'
      return response.badRequest({ message })
    }
  }

  async replyDirect({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const reviewId = request.input('reviewId') || request.input('review_id') || request.input('id')
    const message = request.input('message')

    if (reviewId && message && typeof message === 'string' && message.trim() !== '') {
      const review = await Review.find(reviewId)
      if (review && review.craftsmanId === user.id) {
        if (review.craftsmanReply === null || review.craftsmanReply.trim() === '') {
          await review.reply(user.id, message.trim())
        }
      }
    }

    if (request.header('accept')?.includes('application/json')) {
      return response.ok({ success: true })
    }
    return response.redirect('/craftsman')
  }

  async markHelpful({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const existing = await ReviewHelpfulVote.query()
      .where('review_id', params.id)
      .where('customer_id', user.id)
      .first()

    if (existing) {
      return response.conflict({ message: 'You already marked this review as helpful' })
    }

    const vote = await ReviewHelpfulVote.create({
      reviewId: Number(params.id),
      customerId: user.id,
    })

    return response.created({ vote })
  }

  async destroy({ params, response }: HttpContext) {
    const review = await Review.findOrFail(params.id)
    await review.delete()

    return response.noContent()
  }
}
