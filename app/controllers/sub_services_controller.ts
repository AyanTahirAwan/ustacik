import SubService from '#models/sub_service'
import { createSubServiceValidator, updateSubServiceValidator } from '#validators/sub_service'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Admin management of category sub-services.
 *
 * Protected at the route level by the auth + admin role middleware.
 * Constraint conflicts (duplicate name in a category, price catalog entries
 * still linked to a sub-service) are surfaced as 409 responses.
 */
export default class SubServicesController {
  /**
   * List sub-services ordered by English name.
   *
   * Supports optional `?categoryId=` filtering.
   */
  async index({ request, response }: HttpContext) {
    const categoryId = request.input('categoryId')
    const query = SubService.query().orderBy('nameEn', 'asc')

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      query.where('category_id', categoryId)
    }

    const subServices = await query

    return response.ok({ subServices })
  }

  /**
   * Create a new sub-service.
   *
   * The database enforces a composite unique constraint on
   * (category_id, name_en); a duplicate pair surfaces as a 409 conflict.
   */
  async store({ request, response }: HttpContext) {
    const { nameEn, nameTr, categoryId } = await request.validateUsing(createSubServiceValidator)

    try {
      const subService = await SubService.create({ nameEn, nameTr, categoryId })

      return response.created({ subService })
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        return response.conflict({
          message: 'A sub-service with this English name already exists in the selected category.',
        })
      }
      throw error
    }
  }

  /**
   * Return a single sub-service with its category preloaded.
   */
  async show({ params, response }: HttpContext) {
    const subService = await SubService.query()
      .where('id', params.id)
      .preload('category')
      .firstOrFail()

    return response.ok({ subService })
  }

  /**
   * Update a sub-service's localized names and/or category.
   */
  async update({ params, request, response }: HttpContext) {
    const subService = await SubService.findOrFail(params.id)
    const { nameEn, nameTr, categoryId } = await request.validateUsing(updateSubServiceValidator)

    if (nameEn !== undefined) subService.nameEn = nameEn
    if (nameTr !== undefined) subService.nameTr = nameTr
    if (categoryId !== undefined) subService.categoryId = categoryId
    await subService.save()

    return response.ok({ subService })
  }

  /**
   * Delete a sub-service.
   *
   * Service price catalog entries reference sub-services with CASCADE,
   * so deleting a sub-service removes its linked prices. If the database
   * is configured with RESTRICT semantics or the driver enforces a FK
   * constraint, a linked price catalog entry surfaces as a 409 conflict.
   */
  async destroy({ params, response }: HttpContext) {
    const subService = await SubService.findOrFail(params.id)

    try {
      await subService.delete()
    } catch (error) {
      if (this.isForeignKeyConstraint(error)) {
        return response.conflict({
          message:
            'Cannot delete this sub-service because it is referenced by price catalog entries.',
        })
      }
      throw error
    }

    return response.noContent()
  }

  /**
   * Detect SQLite unique-constraint failures thrown by Lucid.
   */
  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('UNIQUE constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
    )
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
