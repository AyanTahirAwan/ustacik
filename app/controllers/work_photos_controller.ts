import WorkPhoto from '#models/work_photo'
import { createWorkPhotoValidator } from '#validators/work_photo'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs/promises'
import { join } from 'node:path'

export default class WorkPhotosController {
  async index({ auth, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      console.log('Fetching work photos for craftsman:', user.id)

      const workPhotos = await WorkPhoto.query().where('craftsman_id', user.id).orderBy('id', 'desc')
      console.log('Work photos found:', workPhotos.length)

      return response.ok({
        workPhotos: workPhotos.map((photo) => photo.toJSON()),
      })
    } catch (error) {
      console.error('Error in work photos index:', error)
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to load work photos',
      })
    }
  }

  async store({ auth, request, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()
      const payload = await request.validateUsing(createWorkPhotoValidator)

      // Generate a unique filename using random bytes
      const randomName = randomBytes(16).toString('hex')
      const extname = payload.image.extname || 'jpg'
      const filename = `${randomName}.${extname}`
      const uploadDir = `work-photos/${user.id}`
      const uploadPath = join(app.publicPath(), 'uploads', uploadDir)

      console.log('Starting upload:', { filename, uploadPath, tempPath: payload.image.tmpPath })

      // Ensure the upload directory exists
      await fs.mkdir(uploadPath, { recursive: true })
      console.log('Directory created:', uploadPath)

      // Read the temp file
      const tempPath = payload.image.tmpPath
      if (!tempPath) {
        throw new Error('Temp file path not available')
      }

      const fileBuffer = await fs.readFile(tempPath)
      const finalPath = join(uploadPath, filename)
      
      // Write to final destination
      await fs.writeFile(finalPath, fileBuffer)
      console.log('File written to:', finalPath)

      // Verify file exists
      const stats = await fs.stat(finalPath)
      console.log('File verified:', { path: finalPath, size: stats.size })

      const imageUrl = `/uploads/${uploadDir}/${filename}`
      console.log('Image URL:', imageUrl)

      const workPhoto = await WorkPhoto.create({
        craftsmanId: user.id,
        imageUrl: imageUrl,
      })

      console.log('Work photo created:', { id: workPhoto.id, imageUrl })

      return response.created({
        workPhoto: workPhoto.toJSON(),
      })
    } catch (error) {
      console.error('Error in work photos store:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload work photo'
      console.error('Full error:', error)
      return response.internalServerError({
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      })
    }
  }

  async destroy({ auth, params, response }: HttpContext) {
    try {
      const user = auth.getUserOrFail()

      const workPhoto = await WorkPhoto.query()
        .where('id', params.id)
        .where('craftsman_id', user.id)
        .firstOrFail()

      // Optionally delete the physical file
      try {
        const urlPath = workPhoto.imageUrl.replace(/^\/uploads\//, '')
        const filePath = join(app.publicPath('uploads'), urlPath)
        await fs.unlink(filePath)
        console.log('Physical file deleted:', filePath)
      } catch (fileError) {
        console.warn('Could not delete physical file:', fileError)
      }

      await workPhoto.delete()
      return response.noContent()
    } catch (error) {
      console.error('Error in work photos destroy:', error)
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to delete work photo',
      })
    }
  }
}
