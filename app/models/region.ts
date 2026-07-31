import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ServicePriceCatalog from '#models/service_price_catalog'

/**
 * A geographical area where craftsmen can publish service prices.
 */
export default class Region extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare slug: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => ServicePriceCatalog)
  declare servicePriceCatalogs: HasMany<typeof ServicePriceCatalog>
}
