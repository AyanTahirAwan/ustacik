import Category from '#models/category'
import { createCategoryValidator, updateCategoryValidator } from '#validators/category'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Admin management of service categories.
 *
 * Protected at the route level by the auth + admin role middleware.
 * Constraint conflicts (sub-services still linked to a category) are
 * surfaced as 409 responses instead of silently cascading deletes.
 */
export default class CategoriesController {
  /**
   * List all categories ordered by English name.
   *
   * Includes the number of sub-services per category via `withCount`.
   */
  async index({ response }: HttpContext) {
    const categories = await Category.query().withCount('subServices').orderBy('nameEn', 'asc')

    return response.ok({ categories })
  }

  /**
   * Create a new category.
   */
  async store({ request, response }: HttpContext) {
    const { nameEn, nameTr } = await request.validateUsing(createCategoryValidator)
    const category = await Category.create({ nameEn, nameTr })

    return response.created({ category })
  }

  /**
   * Return a single category with its sub-services preloaded.
   */
  async show({ params, response }: HttpContext) {
    const category = await Category.query().where('id', params.id).preload('subServices').firstOrFail()

    return response.ok({ category })
  }

  /**
   * Update a category's localized names.
   */
  async update({ params, request, response }: HttpContext) {
    const category = await Category.findOrFail(params.id)
    const { nameEn, nameTr } = await request.validateUsing(updateCategoryValidator)

    if (nameEn !== undefined) category.nameEn = nameEn
    if (nameTr !== undefined) category.nameTr = nameTr
    await category.save()

    return response.ok({ category })
  }

  /**
   * Delete a category.
   *
   * Sub-services reference categories with RESTRICT, so deletion fails
   * with a foreign key error when sub-services still exist. We surface
   * that as a 409 conflict instead of silently deleting related data.
   */
  async destroy({ params, response }: HttpContext) {
    const category = await Category.findOrFail(params.id)

    try {
      await category.delete()
    } catch (error) {
      if (this.isForeignKeyConstraint(error)) {
        return response.conflict({
          message: 'Cannot delete this category because it still has sub-services.',
        })
      }
      throw error
    }

    return response.noContent()
  }

  /**
   * Detect SQLite foreign-key constraint failures thrown by Lucid.
   */
  private isForeignKeyConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('FOREIGN KEY constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY')
    )
  }
}

