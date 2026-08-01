import type { HttpContext } from '@adonisjs/core/http'
import Review from '#models/review'
import { submitReviewValidator } from '#validators/submit_review'

export default class ReviewsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    if (user.role === 'admin') {
      const reviews = await Review.query().orderBy('created_at', 'desc')
      return response.json(reviews)
    }

    if (user.role === 'customer') {
      const reviews = await Review.query().where('customer_id', user.id).orderBy('created_at', 'desc')
      return response.json(reviews)
    }

    if (user.role === 'craftsman') {
      const reviews = await Review.query().where('craftsman_id', user.id).orderBy('created_at', 'desc')
      return response.json(reviews)
    }

    return response.forbidden('Invalid user role')
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'customer') {
      return response.forbidden('Only customers can write reviews')
    }

    const payload = await request.validateUsing(submitReviewValidator)
    try {
      const review = await Review.submit({
        ...payload,
        customerId: user.id,
      })
      return response.created(review)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      return response.badRequest({ message })
    }
  }

  async show({ params, response }: HttpContext) {
    const review = await Review.findOrFail(params.id)
    return response.json(review)
  }

  async update({ params, request, response, auth }: HttpContext) {
    const review = await Review.findOrFail(params.id)
    const user = auth.user!

    if (user.role !== 'craftsman' || review.craftsmanId !== user.id) {
      return response.forbidden('Only the reviewed craftsman can reply to this review')
    }

    const replyMessage = request.input('reply')
    if (!replyMessage) {
      return response.badRequest('Reply message is required')
    }

    try {
      await review.reply(user.id, replyMessage)
      return response.json(review)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred'
      return response.badRequest({ message })
    }
  }

  async destroy({ params, response, auth }: HttpContext) {
    const user = auth.user!

    if (user.role !== 'admin') {
      return response.forbidden('Only admins can delete reviews')
    }

    const review = await Review.findOrFail(params.id)
    await review.delete()
    return response.noContent()
  }
}