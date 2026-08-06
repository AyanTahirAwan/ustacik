import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Customer from '#models/customer'
import Region from '#models/region'

export default class CustomerAddress extends BaseModel {
  static table = 'customer_addresses'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare customerId: number

  @column()
  declare regionId: number

  @column()
  declare label: string

  @column()
  declare street: string

  @column()
  declare landmark: string | null

  @column()
  declare isDefault: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Region, { foreignKey: 'regionId' })
  declare region: BelongsTo<typeof Region>
}
