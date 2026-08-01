import type { HttpContext } from '@adonisjs/core/http'
import JobRequest from '#models/job_request'
import { createJobRequestValidator } from '#validators/create_job_request'
import { updateJobRequestValidator } from '#validators/update_job_request'

export default class JobRequestsController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    
    if (user.role === 'admin') {
      const jobs = await JobRequest.query().orderBy('created_at', 'desc')
      return response.json(jobs)
    }
    
    if (user.role === 'customer') {
      const jobs = await JobRequest.query().where('customer_id', user.id).orderBy('created_at', 'desc')
      return response.json(jobs)
    }
    
    if (user.role === 'craftsman') {
      const jobs = await JobRequest.query().where('craftsman_id', user.id).orderBy('created_at', 'desc')
      return response.json(jobs)
    }
    
    return response.forbidden('Invalid user role')
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    
    if (user.role !== 'customer') {
      return response.forbidden('Only customers can create job requests')
    }

    const payload = await request.validateUsing(createJobRequestValidator)
    const job = await JobRequest.submit({
      ...payload,
      customerId: user.id,
    })

    return response.created(job)
  }

  async show({ params, response, auth }: HttpContext) {
    const job = await JobRequest.findOrFail(params.id)
    const user = auth.user!

    if (user.role === 'admin') {
      return response.json(job)
    }
    if (user.role === 'customer' && job.customerId === user.id) {
      return response.json(job)
    }
    if (user.role === 'craftsman' && job.craftsmanId === user.id) {
      return response.json(job)
    }

    return response.forbidden('You do not have permission to view this job request')
  }

  async update({ params, request, response, auth }: HttpContext) {
    const job = await JobRequest.findOrFail(params.id)
    const user = auth.user!
    const payload = await request.validateUsing(updateJobRequestValidator)
    const nextStatus = payload.status

    if (user.role === 'admin') {
      await job.transitionTo(nextStatus)
      return response.json(job)
    }

    if (user.role === 'customer' && job.customerId === user.id) {
      if (nextStatus !== 'cancelled' && nextStatus !== 'disputed') {
        return response.forbidden('Customers can only cancel or dispute a job request')
      }
      await job.transitionTo(nextStatus)
      return response.json(job)
    }

    if (user.role === 'craftsman' && job.craftsmanId === user.id) {
      if (['accepted', 'declined', 'in_progress', 'completed'].includes(nextStatus)) {
        await job.transitionTo(nextStatus)
        return response.json(job)
      }
      return response.forbidden('Craftsmen cannot transition to this status')
    }

    return response.forbidden('Unauthorized')
  }

  async destroy({ response }: HttpContext) {
    return response.notImplemented('Deleting job requests is not allowed')
  }
}