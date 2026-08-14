import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { DateTime } from 'luxon'
import VerificationCode from '#models/verification_code'
import type User from '#models/user'
import type { VerificationType } from '#models/verification_code'

export class VerificationService {
  /**
   * Generate a 6-digit verification code
   */
  static generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0')
  }

  private static hashCode(code: string) {
    return createHash('sha256').update(code).digest('hex')
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerification(user: User, email: string) {
    const code = this.generateCode()
    const expiresAt = DateTime.now().plus({ minutes: 10 })

    // Delete any existing email verification code for this user
    await VerificationCode.query().where('user_id', user.id).where('type', 'email').delete()

    // Create new verification code
    const verification = await VerificationCode.create({
      userId: user.id,
      type: 'email',
      code: 'REDACT',
      codeHash: this.hashCode(code),
      target: email,
      isVerified: false,
      attempts: 0,
      expiresAt,
      verifiedAt: null,
    })

    return { verification, code }
  }

  /**
   * Send phone verification code
   */
  static async sendPhoneVerification(user: User, phone: string) {
    const code = this.generateCode()
    const expiresAt = DateTime.now().plus({ minutes: 10 })

    // Delete any existing phone verification code for this user
    await VerificationCode.query().where('user_id', user.id).where('type', 'phone').delete()

    // Create new verification code
    const verification = await VerificationCode.create({
      userId: user.id,
      type: 'phone',
      code: 'REDACT',
      codeHash: this.hashCode(code),
      target: phone,
      isVerified: false,
      attempts: 0,
      expiresAt,
      verifiedAt: null,
    })

    // Delivery is deliberately delegated to a configured SMS provider.
    return { verification, code }
  }

  /**
   * Verify a code
   */
  static async verifyCode(user: User, type: VerificationType, code: string) {
    const verification = await VerificationCode.query()
      .where('user_id', user.id)
      .where('type', type)
      .firstOrFail()

    // Check if code is expired
    if (DateTime.now() > verification.expiresAt) {
      throw new Error('Verification code has expired')
    }

    // Check if already verified
    if (verification.isVerified) {
      throw new Error('Verification code has already been used')
    }

    // Check attempts limit (max 5 attempts)
    if (verification.attempts >= 5) {
      throw new Error('Too many failed attempts. Please request a new code')
    }

    // Check code
    if (!verification.codeHash) {
      throw new Error('Verification code is invalid. Please request a new code')
    }

    const expectedHash = Buffer.from(verification.codeHash, 'hex')
    const suppliedHash = Buffer.from(this.hashCode(code), 'hex')
    if (
      expectedHash.length !== suppliedHash.length ||
      !timingSafeEqual(expectedHash, suppliedHash)
    ) {
      verification.attempts += 1
      await verification.save()
      throw new Error('Invalid verification code')
    }

    // Mark as verified
    verification.isVerified = true
    verification.verifiedAt = DateTime.now()
    await verification.save()

    if (type === 'email') {
      user.emailVerifiedAt = verification.verifiedAt
    } else {
      user.phoneVerifiedAt = verification.verifiedAt
    }
    await user.save()

    return verification
  }

  /**
   * Get active verification code for user and type
   */
  static async getActiveCode(user: User, type: VerificationType) {
    const verification = await VerificationCode.query()
      .where('user_id', user.id)
      .where('type', type)
      .where('is_verified', false)
      .whereNull('verified_at')
      .first()

    if (!verification) {
      throw new Error(`No active ${type} verification code found`)
    }

    if (DateTime.now() > verification.expiresAt) {
      throw new Error('Verification code has expired')
    }

    return verification
  }
}
