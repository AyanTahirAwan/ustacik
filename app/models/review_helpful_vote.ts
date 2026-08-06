import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Review from '#models/review'
import Customer from '#models/customer'

export default class ReviewHelpfulVote extends BaseModel {
  static table = 'review_helpful_votes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare reviewId: number

  @column()
  declare customerId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Review)
  declare review: BelongsTo<typeof Review>

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>
}
