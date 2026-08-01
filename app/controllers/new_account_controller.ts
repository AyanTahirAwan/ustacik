import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Subscription from '#models/subscription'
import { signupValidator } from '#validators/user'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async store({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)

    const user = await db.transaction(async (trx) => {
      const newUser = await User.create(
        {
          email: payload.email,
          phoneNormalised: payload.phone,
          passwordHash: payload.password,
          role: payload.role,
          status: 'active',
        },
        { client: trx }
      )

      if (payload.role === 'customer') {
        await Customer.create(
          {
            userId: newUser.id,
            fullName: payload.fullName ?? payload.email,
            language: 'en',
            smsOptIn: true,
          },
          { client: trx }
        )
      } else {
        if (!payload.businessName || !payload.categoryId) {
          throw new Error('businessName and categoryId are required for craftsman signup')
        }

        await Craftsman.create(
          {
            userId: newUser.id,
            businessName: payload.businessName,
            categoryId: payload.categoryId,
            trustLevel: 0,
            verbalConsent: false,
            totalJobs: 0,
          },
          { client: trx }
        )

        await Subscription.create(
          {
            craftsmanId: newUser.id,
            planType: 'free',
            status: 'active',
            periodStart: DateTime.now(),
          },
          { client: trx }
        )
      }

      return newUser
    })

    await auth.use('web').login(user)
    response.redirect().toRoute('home')
  }
}