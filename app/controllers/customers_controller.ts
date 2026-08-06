import Customer from '#models/customer'
import { updateCustomerValidator } from '#validators/customer'
import type { HttpContext } from '@adonisjs/core/http'

export default class CustomersController {
  async show({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const customer = await Customer.query()
      .where('user_id', user.id)
      .preload('user')
      .preload('defaultRegion')
      .firstOrFail()

    return response.ok({ customer })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateCustomerValidator)

    const customer = await Customer.findOrFail(user.id)

    customer.merge(payload)
    await customer.save()

    await customer.load('user')
    await customer.load('defaultRegion')

    return response.ok({ customer })
  }
}
