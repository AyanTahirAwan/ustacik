import Review from '#models/review'
import ReviewHelpfulVote from '#models/review_helpful_vote'
import { createReviewValidator, replyReviewValidator } from '#validators/review'
import type { HttpContext } from '@adonisjs/core/http'

export default class ReviewsController {
  async forCraftsman({ params, response }: HttpContext) {
    const reviews = await Review.query()
      .where('craftsman_id', params.craftsmanId)
      .preload('customer')
      .orderBy('created_at', 'desc')

    const average =
      reviews.length >= 3
        ? reviews.reduce((sum, review) => sum + review.average, 0) / reviews.length
        : null

    return response.ok({ reviews, average, count: reviews.length })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createReviewValidator)

    try {
      const review = await Review.submit({
        jobId: payload.jobId,
        customerId: user.id,
        punctuality: payload.punctuality,
        workmanship: payload.workmanship,
        priceHonesty: payload.priceHonesty,
        communication: payload.communication,
        comment: payload.comment,
      })

      return response.created({ review })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
  }

  async reply({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(replyReviewValidator)
    const review = await Review.findOrFail(params.id)

    try {
      await review.reply(user.id, payload.message)
      return response.ok({ review })
    } catch (error) {
      return response.badRequest({ message: error.message })
    }
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
