import SubService from '#models/sub_service'
import { createSubServiceValidator, updateSubServiceValidator } from '#validators/sub_service'
import type { HttpContext } from '@adonisjs/core/http'

export default class SubServicesController {
  async index({ request, response }: HttpContext) {
    const categoryId = request.input('categoryId')
    const query = SubService.query().orderBy('nameEn', 'asc')

    if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
      query.where('category_id', categoryId)
    }

    const subServices = await query

    return response.ok({ subServices })
  }

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

  async show({ params, response }: HttpContext) {
    const subService = await SubService.query()
      .where('id', params.id)
      .preload('category')
      .firstOrFail()

    return response.ok({ subService })
  }

  async update({ params, request, response }: HttpContext) {
    const subService = await SubService.findOrFail(params.id)
    const { nameEn, nameTr, categoryId } = await request.validateUsing(updateSubServiceValidator)

    if (nameEn !== undefined) subService.nameEn = nameEn
    if (nameTr !== undefined) subService.nameTr = nameTr
    if (categoryId !== undefined) subService.categoryId = categoryId
    await subService.save()

    return response.ok({ subService })
  }

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

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('UNIQUE constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
    )
  }

  private isForeignKeyConstraint(error: unknown) {
    return (
      error instanceof Error &&
      (error.message.includes('FOREIGN KEY constraint failed') ||
        (error as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_FOREIGNKEY')
    )
  }
}
