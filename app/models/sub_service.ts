import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Category from '#models/category'
import ServicePriceCatalog from '#models/service_price_catalog'

export default class SubService extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare categoryId: number

  @column()
  declare nameEn: string

  @column()
  declare nameTr: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @hasMany(() => ServicePriceCatalog)
  declare servicePriceCatalogs: HasMany<typeof ServicePriceCatalog>

  name(locale: 'en' | 'tr') {
    return locale === 'tr' ? this.nameTr : this.nameEn
  }
}
