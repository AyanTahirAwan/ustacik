import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Subscription from '#models/subscription'
import { signupValidator } from '#validators/user'
import db from '@adonisjs/lucid/services/db'
import app from '@adonisjs/core/services/app'
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

    let idPhotoUrl: string | null = null
    const idPhotoFile = request.file('idPhoto', {
      size: '5mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    if (idPhotoFile && idPhotoFile.isValid) {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${idPhotoFile.extname || 'jpg'}`
      await idPhotoFile.move(app.makePath('public/uploads/id-verifications'), {
        name: fileName,
        overwrite: true,
      })
      idPhotoUrl = `/uploads/id-verifications/${fileName}`
    }

    const isCraftsman = payload.role === 'craftsman'
    const initialStatus = isCraftsman ? 'pending' : 'active'

    const newUser = await db.transaction(async (trx) => {
      const createdUser = await User.create(
        {
          email: payload.email,
          phoneNormalised: payload.phone,
          passwordHash: payload.password,
          role: payload.role,
          status: initialStatus,
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
            idCardImageUrl: idPhotoUrl,
            verificationStatus: 'pending',
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

    if (isCraftsman) {
      session.flash(
        'success',
        session.get('lang') === 'tr'
          ? 'Hesabınız başarıyla oluşturuldu! Kimlik doğrulama belgeleriniz yönetici onayına gönderildi. Hesabınız onaylandıktan sonra giriş yapabileceksiniz.'
          : 'Account created successfully! Your ID verification documents have been submitted for administrator review. You will be able to log in once approved.'
      )
    } else {
      session.flash(
        'success',
        session.get('lang') === 'tr'
          ? 'Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.'
          : 'Account created successfully. You can now log in.'
      )
    }

    response.redirect().toRoute('session.create')
  }
}
