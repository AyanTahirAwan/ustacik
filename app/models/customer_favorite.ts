import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'

export default class CustomerFavorite extends BaseModel {
  static table = 'customer_favorites'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare customerId: number

  @column()
  declare craftsmanId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>
}
