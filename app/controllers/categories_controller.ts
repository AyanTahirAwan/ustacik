import Category from '#models/category'
import { updateCategoryValidator } from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

export default class CategoriesController {
  async index({ response }: HttpContext) {
    const categories = await Category.query().withCount('subServices').orderBy('nameEn', 'asc')

    return response.ok({ categories })
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
}
