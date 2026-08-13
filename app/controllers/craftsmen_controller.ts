import Craftsman from '#models/craftsman'
import JobRequest from '#models/job_request'
import Review from '#models/review'
import { updateCraftsmanValidator } from '#validators/craftsman'
import type { HttpContext } from '@adonisjs/core/http'
import ServicePriceCatalog from '#models/service_price_catalog'

export default class CraftsmenController {
  async index({ request, response }: HttpContext) {
    const search = request.input('search')
    const categoryId = request.input('categoryId')

    const query = Craftsman.query()
      .preload('category')
      .preload('workPhotos')
      .orderBy('business_name', 'asc')

    if (search) {
      query.where((builder) => {
        builder.whereLike('business_name', `%${search}%`).orWhereLike('bio', `%${search}%`)
      })
    }

    if (categoryId) {
      query.where('category_id', categoryId)
    }

    const craftsmen = await query

    const result = await Promise.all(
      craftsmen.map(async (craftsman) => {
        const prices = await ServicePriceCatalog.query()
          .where('craftsman_id', craftsman.userId)
          .where('is_active', true)
          .orderBy('min_price', 'asc')

        return {
          userId: craftsman.userId,
          businessName: craftsman.businessName,
          category: craftsman.category,
          bio: craftsman.bio,
          trustLevel: craftsman.trustLevel,
          trustLevelLabel: craftsman.trustLevelLabel,
          totalJobs: craftsman.totalJobs,
          workPhotos: craftsman.workPhotos,
          prices: prices.map((price) => ({
            minPrice: price.minPrice,
            maxPrice: price.maxPrice,
            currency: price.currency,
          })),
        }
      })
    )

    return response.ok({
      craftsmen: result,
    })
  }

  async showOwn({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const craftsman = await Craftsman.query()
      .where('user_id', user.id)
      .preload('category')
      .preload('workPhotos')
      .firstOrFail()

    return response.ok({ craftsman })
  }

  async updateOwn({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateCraftsmanValidator)

    const craftsman = await Craftsman.findOrFail(user.id)

    craftsman.merge(payload)
    await craftsman.save()
    await craftsman.load('category')

    return response.ok({ craftsman })
  }

  async showPublic({ params, response }: HttpContext) {
    const craftsman = await Craftsman.query()
      .where('user_id', params.id)
      .preload('category')
      .preload('workPhotos')
      .preload('user')
      .firstOrFail()

    return response.ok({
      craftsman: {
        userId: craftsman.userId,
        businessName: craftsman.businessName,
        category: craftsman.category,
        bio: craftsman.bio,
        trustLevel: craftsman.trustLevel,
        trustLevelLabel: craftsman.trustLevelLabel,
        totalJobs: craftsman.totalJobs,
        phoneNormalised: craftsman.user.phoneNormalised,
        workPhotos: craftsman.workPhotos,
      },
    })
  }

  async dashboard({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const craftsman = await Craftsman.query()
      .where('user_id', user.id)
      .preload('category')
      .preload('workPhotos')
      .preload('servicePriceCatalogs', (query) =>
        query.preload('subService').preload('region').orderBy('id', 'asc')
      )
      .firstOrFail()

    const jobs = await JobRequest.query()
      .where('craftsman_id', user.id)
      .preload('customer', (customers) => customers.select(['userId', 'fullName']))
      .preload('category')
      .preload('region')
      .orderBy('created_at', 'desc')
      .limit(20)

    const reviews = await Review.query().where('craftsman_id', user.id)
    const pendingJobs = await JobRequest.query()
      .where('craftsman_id', user.id)
      .where('status', 'pending')
      .count('* as total')
      .firstOrFail()

    const stats = {
      pending: Number(pendingJobs.$extras.total),
      completed: jobs.filter((job) => job.status === 'completed').length,
      active: jobs.filter((job) => ['accepted', 'in_progress'].includes(job.status)).length,
      disputed: jobs.filter((job) => job.status === 'disputed').length,
    }

    return response.ok({
      craftsman: {
        userId: craftsman.userId,
        businessName: craftsman.businessName,
        category: craftsman.category,
        bio: craftsman.bio,
        trustLevel: craftsman.trustLevel,
        trustLevelLabel: craftsman.trustLevelLabel,
        totalJobs: craftsman.totalJobs,
        workPhotos: craftsman.workPhotos,
        servicePriceCatalogs: craftsman.servicePriceCatalogs,
        phone: user.phoneNormalised,
      },
      jobs: jobs.map((job) => ({
        status: job.status,
        createdAt: job.createdAt,
        customer: { fullName: job.customer.fullName },
        category: { nameEn: job.category.nameEn, nameTr: job.category.nameTr },
        region: { nameEn: job.region.nameEn, nameTr: job.region.nameTr },
      })),
      reviews,
      stats,
    })
  }
}
