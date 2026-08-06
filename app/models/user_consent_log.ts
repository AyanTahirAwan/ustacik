import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export default class UserConsentLog extends BaseModel {
  static table = 'user_consent_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare termsVersion: string

  @column()
  declare agreementType: 'TOS' | 'WAIVER'

  @column()
  declare ip: string

  @column.dateTime()
  declare acceptedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
