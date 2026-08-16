import Category from '#models/category'
import SubService from '#models/sub_service'
import { createCategoryValidator, updateCategoryValidator } from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

export default class CategoriesController {
  async index({ response }: HttpContext) {
    const categories = await Category.query().withCount('subServices').orderBy('nameEn', 'asc')

    return response.ok({ categories })
  }

  async store({ request, response }: HttpContext) {
    const { nameEn, nameTr } = await request.validateUsing(createCategoryValidator)
    const category = await Category.create({ nameEn, nameTr })

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

    try {
      // Clean up child sub-services if not referenced by price catalogs
      await SubService.query().where('categoryId', category.id).delete()
      await category.delete()
    } catch (error) {
      if (this.isForeignKeyConstraint(error)) {
        return response.conflict({
          message: 'Cannot delete this category because it is referenced by existing craftsmen or jobs.',
        })
      }
      throw error
    }

    return response.noContent()
  }

  private isForeignKeyConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('FOREIGN KEY constraint failed') ||
        error.message.includes('foreign key constraint') ||
        error.message.includes('violates foreign key constraint') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        (error as Error & { code?: string }).code === '23503')
    )
  }
}
