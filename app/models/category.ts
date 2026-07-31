import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
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

  name(locale: 'en' | 'tr') {
    return locale === 'tr' ? this.nameTr : this.nameEn
  }
}
