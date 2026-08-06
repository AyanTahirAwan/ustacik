import WorkPhoto from '#models/work_photo'
import { createWorkPhotoValidator } from '#validators/work_photo'
import type { HttpContext } from '@adonisjs/core/http'

export default class WorkPhotosController {
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const workPhotos = await WorkPhoto.query().where('craftsman_id', user.id).orderBy('id', 'desc')

    return response.ok({ workPhotos })
  }

  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createWorkPhotoValidator)

    const workPhoto = await WorkPhoto.create({
      craftsmanId: user.id,
      imageUrl: payload.imageUrl,
    })

    return response.created({ workPhoto })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const workPhoto = await WorkPhoto.query()
      .where('id', params.id)
      .where('craftsman_id', user.id)
      .firstOrFail()

    await workPhoto.delete()

    return response.noContent()
  }
}
