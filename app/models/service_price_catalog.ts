import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Craftsman from '#models/craftsman'
import Region from '#models/region'
import SubService from '#models/sub_service'


export default class ServicePriceCatalog extends BaseModel {
  static table = 'service_price_catalogs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare craftsmanId: number

  @column()
  declare subServiceId: number

  @column()
  declare regionId: number

  @column()
  declare minPrice: number

  @column()
  declare maxPrice: number

  @column()
  declare currency: 'TRY' | 'GBP' | 'EUR' | 'USD'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>

  @belongsTo(() => SubService)
  declare subService: BelongsTo<typeof SubService>

  @belongsTo(() => Region)
  declare region: BelongsTo<typeof Region>
}
