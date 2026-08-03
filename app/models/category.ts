import { BaseModel, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import SubService from '#models/sub_service'

export default class Category extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nameEn: string

  @column()
  declare nameTr: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @hasMany(() => SubService)
  declare subServices: HasMany<typeof SubService>

  /**
   * Number of sub-services for this category, populated by the
   * `withCount('subServices')` query in the admin index controller.
   * Exposed as a computed property so it appears in JSON responses.
   */
  @computed()
  get subServicesCount() {
    return this.$extras.subServices_count
  }

  name(locale: 'en' | 'tr') {
    return locale === 'tr' ? this.nameTr : this.nameEn
  }
}
