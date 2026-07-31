import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Region from '#models/region'
import SubService from '#models/sub_service'
import User from '#models/user'

/**
 * A craftsman's price for one sub-service in one region.
 */
export default class ServicePriceCatalog extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare craftsmanId: number

  @column()
  declare subServiceId: number

  @column()
  declare regionId: number

  @column()
  declare price: number

  @column()
  declare currency: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof User>

  @belongsTo(() => SubService)
  declare subService: BelongsTo<typeof SubService>

  @belongsTo(() => Region)
  declare region: BelongsTo<typeof Region>
}
