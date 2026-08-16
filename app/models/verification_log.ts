import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'

export type TrustLevelGrant = 'registered' | 'verified' | 'approved'

export default class VerificationLog extends BaseModel {
  static table = 'verification_logs'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'target_user_id' })
  declare craftsmanId: number

  @column({ columnName: 'checked_by_id' })
  declare checkedById: number

  @column({ columnName: 'status' })
  declare levelGranted: TrustLevelGrant

  @column.dateTime()
  declare verifiedAt: DateTime

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>

  @belongsTo(() => Admin, { foreignKey: 'checkedById' })
  declare checkedBy: BelongsTo<typeof Admin>

  static async record(data: {
    craftsmanId: number
    checkedById: number
    levelGranted: TrustLevelGrant
    idCardVerified?: boolean
    pastCustomer1Called?: boolean
    pastCustomer2Called?: boolean
    bizRegDocUrl?: string
    guaranteeDocUrl?: string
    verbalConsentAudited?: boolean
    notes?: string
  }) {
    const log = await VerificationLog.create({
      craftsmanId: data.craftsmanId,
      checkedById: data.checkedById,
      levelGranted: data.levelGranted,
      verifiedAt: DateTime.now(),
    })

    const trustTier = data.levelGranted === 'approved' ? 3 : data.levelGranted === 'verified' ? 2 : 1

    await db.table('craftsman_verification_logs').insert({
      log_id: log.id,
      id_card_verified: Boolean(data.idCardVerified),
      past_customer_1_called: Boolean(data.pastCustomer1Called),
      past_customer_2_called: Boolean(data.pastCustomer2Called),
      biz_reg_doc_url: data.bizRegDocUrl ?? null,
      guarantee_doc_url: data.guaranteeDocUrl ?? null,
      verbal_consent_audited: Boolean(data.verbalConsentAudited),
      trust_tier_granted: trustTier,
    })

    await Craftsman.recomputeTrustLevel(data.craftsmanId)
    return log
  }
}
