import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export default class PasswordRecoveryRequest extends BaseModel {
  static table = 'password_recovery_requests'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare shortcode: string

  @column.dateTime()
  declare recoveredAt: DateTime | null

  @column.dateTime()
  declare expiryDate: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  get isUsable() {
    return this.recoveredAt === null && this.expiryDate > DateTime.now()
  }
}
