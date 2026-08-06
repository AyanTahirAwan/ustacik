import Region from '#models/region'
import { createRegionValidator, updateRegionValidator } from '#validators/region'
import type { HttpContext } from '@adonisjs/core/http'

export default class RegionsController {
  async index({ response }: HttpContext) {
    const regions = await Region.query().orderBy('nameEn', 'asc')

    return response.ok({ regions })
  }

  async store({ request, response }: HttpContext) {
    const { nameEn, nameTr } = await request.validateUsing(createRegionValidator)
    const region = await Region.create({ nameEn, nameTr })

    return response.created({ region })
  }

  async show({ params, response }: HttpContext) {
    const region = await Region.findOrFail(params.id)

    return response.ok({ region })
  }

  async update({ params, request, response }: HttpContext) {
    const region = await Region.findOrFail(params.id)
    const { nameEn, nameTr } = await request.validateUsing(updateRegionValidator)

    if (nameEn !== undefined) region.nameEn = nameEn
    if (nameTr !== undefined) region.nameTr = nameTr
    await region.save()

    return response.ok({ region })
  }

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

  private isForeignKeyConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('FOREIGN KEY constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY')
    )
  }
}
