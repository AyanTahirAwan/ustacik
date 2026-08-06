import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Craftsman from '#models/craftsman'

export default class Subscription extends BaseModel {
  static table = 'subscriptions'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare craftsmanId: number

  @column()
  declare planType: 'free' | 'paid'

  @column()
  declare status: 'active' | 'cancelled' | 'past_due'

  @column.date()
  declare periodStart: DateTime

  @column.date()
  declare periodEnd: DateTime | null

  @column()
  declare monthlyFee: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>
}
