import Region from '#models/region'
import { createRegionValidator, updateRegionValidator } from '#validators/region'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Admin management of service regions.
 *
 * Protected at the route level by the auth + admin role middleware.
 * Constraint conflicts (price catalog entries still referencing a region)
 * are surfaced as 409 responses instead of silently cascading deletes.
 */
export default class RegionsController {
  /**
   * List all regions ordered by English name.
   */
  async index({ response }: HttpContext) {
    const regions = await Region.query().orderBy('nameEn', 'asc')

    return response.ok({ regions })
  }

  /**
   * Create a new region.
   */
  async store({ request, response }: HttpContext) {
    const { nameEn, nameTr } = await request.validateUsing(createRegionValidator)
    const region = await Region.create({ nameEn, nameTr })

    return response.created({ region })
  }

  /**
   * Return a single region.
   */
  async show({ params, response }: HttpContext) {
    const region = await Region.findOrFail(params.id)

    return response.ok({ region })
  }

  /**
   * Update a region's localized names.
   */
  async update({ params, request, response }: HttpContext) {
    const region = await Region.findOrFail(params.id)
    const { nameEn, nameTr } = await request.validateUsing(updateRegionValidator)

    if (nameEn !== undefined) region.nameEn = nameEn
    if (nameTr !== undefined) region.nameTr = nameTr
    await region.save()

    return response.ok({ region })
  }

  /**
   * Delete a region.
   *
   * Service price catalog entries reference regions with RESTRICT, so
   * deletion fails with a foreign key error when prices still exist.
   * We surface that as a 409 conflict instead of silently deleting data.
   */
  async destroy({ params, response }: HttpContext) {
    const region = await Region.findOrFail(params.id)

    try {
      await region.delete()
    } catch (error) {
      if (this.isForeignKeyConstraint(error)) {
        return response.conflict({
          message: 'Cannot delete this region because it is referenced by price catalog entries.',
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

