import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Subscription from '#models/subscription'
import { signupValidator } from '#validators/user'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { HttpContext } from '@adonisjs/core/http'
import { VerificationService } from '#services/verification_service'
import { EmailDeliveryService } from '#services/email_delivery_service'

export default class NewAccountController {
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(signupValidator)

    const newUser = await db.transaction(async (trx) => {
      const createdUser = await User.create(
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
            userId: createdUser.id,
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
            userId: createdUser.id,
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
            craftsmanId: createdUser.id,
            planType: 'free',
            status: 'active',
            periodStart: DateTime.now(),
          },
          { client: trx }
        )
      }

      return createdUser
    })

    // A failed third-party delivery must not roll back a valid account.
    const { code } = await VerificationService.sendEmailVerification(newUser, newUser.email)
    try {
      await EmailDeliveryService.send({
        to: newUser.email,
        subject: 'Verify your Ustacik email address',
        text: `Your Ustacik email verification code is ${code}. It expires in 10 minutes.`,
      })
    } catch {
      // The code is retained for a later authenticated resend attempt.
    }

    session.flash('success', 'Account created successfully. You can now log in.')
    response.redirect().toRoute('session.create')
  }
}
