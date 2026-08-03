import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'

export type TrustLevelGrant = 'registered' | 'verified' | 'approved'

export default class VerificationLog extends BaseModel {
  static table = 'verification_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare craftsmanId: number

  @column()
  declare checkedById: number

  @column()
  declare levelGranted: TrustLevelGrant

  @column()
  declare idCardVerified: boolean | null

  @column()
  declare pastCustomer1Called: boolean | null

  @column()
  declare pastCustomer2Called: boolean | null

  @column()
  declare bizRegDocUrl: string | null

  @column()
  declare guaranteeDocUrl: string | null

  @column()
  declare verbalConsentAudited: boolean | null

  @column()
  declare notes: string | null

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
      ...data,
      verifiedAt: DateTime.now(),
    })
    await Craftsman.recomputeTrustLevel(data.craftsmanId)
    return log
  }
}
