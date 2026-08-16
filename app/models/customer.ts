import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import Region from '#models/region'
import CustomerAddress from '#models/customer_address'
import CustomerFavorite from '#models/customer_favorite'
import JobRequest from '#models/job_request'
import Review from '#models/review'

export default class Customer extends BaseModel {
  static table = 'customers'

  @column({ isPrimary: true, columnName: 'user_id' })
  declare userId: number

  @column()
  declare fullName: string

  @column()
  declare defaultRegionId: number | null

  @column()
  declare language: string

  @column()
  declare smsOptIn: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Region, { foreignKey: 'defaultRegionId' })
  declare defaultRegion: BelongsTo<typeof Region>

  @hasMany(() => CustomerAddress, { foreignKey: 'customerId', localKey: 'userId' })
  declare addresses: HasMany<typeof CustomerAddress>

  @hasMany(() => CustomerFavorite, { foreignKey: 'customerId', localKey: 'userId' })
  declare favorites: HasMany<typeof CustomerFavorite>

  @hasMany(() => JobRequest, { foreignKey: 'customerId', localKey: 'userId' })
  declare jobRequests: HasMany<typeof JobRequest>

  @hasMany(() => Review, { foreignKey: 'customerId', localKey: 'userId' })
  declare reviews: HasMany<typeof Review>
}
