import CustomerAddress from '#models/customer_address'
import {
  createCustomerAddressValidator,
  updateCustomerAddressValidator,
} from '#validators/customer_address'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class CustomerAddressesController {
  /**
   * List the authenticated customer's own addresses.
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const addresses = await CustomerAddress.query()
      .where('customer_id', user.id)
      .preload('region')
      .orderBy('is_default', 'desc')
      .orderBy('id', 'asc')

    return response.ok({ addresses })
  }

  /**
   * Create an address for the authenticated customer.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createCustomerAddressValidator)

    const address = await db.transaction(async (trx) => {
      if (payload.isDefault === true) {
        await trx
          .from('customer_addresses')
          .where('customer_id', user.id)
          .update({ is_default: false })
      }

      return CustomerAddress.create(
        {
          customerId: user.id,
          regionId: payload.regionId,
          label: payload.label,
          street: payload.street,
          landmark: payload.landmark ?? null,
          isDefault: payload.isDefault ?? false,
        },
        { client: trx }
      )
    })

    await address.load('region')

    return response.created({ address })
  }

  /**
   * Update one of the authenticated customer's own addresses.
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(updateCustomerAddressValidator)

    const address = await db.transaction(async (trx) => {
      const customerAddress = await CustomerAddress.query({ client: trx })
        .where('id', params.id)
        .where('customer_id', user.id)
        .firstOrFail()

      if (payload.isDefault === true) {
        await trx
          .from('customer_addresses')
          .where('customer_id', user.id)
          .whereNot('id', customerAddress.id)
          .update({ is_default: false })
      }

      customerAddress.merge(payload)
      await customerAddress.save()

      return customerAddress
    })

    await address.load('region')

    return response.ok({ address })
  }

  /**
   * Delete one of the authenticated customer's own addresses.
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()

    const address = await CustomerAddress.query()
      .where('id', params.id)
      .where('customer_id', user.id)
      .firstOrFail()

    await address.delete()

    return response.noContent()
  }
}
