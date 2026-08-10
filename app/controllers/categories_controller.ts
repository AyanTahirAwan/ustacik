import Category from '#models/category'
import { createCategoryValidator, updateCategoryValidator } from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

export default class CategoriesController {
  async index({ response }: HttpContext) {
    const categories = await Category.query().withCount('subServices').orderBy('nameEn', 'asc')

    return response.ok({ categories })
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createCategoryValidator)
    const category = await Category.create(payload)

    return response.created({ category })
  }

  async show({ params, response }: HttpContext) {
    const category = await Category.query()
      .where('id', params.id)
      .preload('subServices')
      .firstOrFail()

    return response.ok({ category })
  }

  async update({ params, request, response }: HttpContext) {
    const category = await Category.findOrFail(params.id)
    const { nameEn, nameTr } = await request.validateUsing(updateCategoryValidator)

    if (nameEn !== undefined) category.nameEn = nameEn
    if (nameTr !== undefined) category.nameTr = nameTr
    await category.save()

    return response.ok({ category })
  }

  async destroy({ params, response }: HttpContext) {
    const category = await Category.findOrFail(params.id)
    await category.loadCount('subServices')

    if (Number(category.$extras.subServices_count) > 0) {
      return response.conflict({
        message: 'Cannot delete this category because it still has sub-services.',
      })
    }

    await category.delete()
    return response.noContent()
  }
}
