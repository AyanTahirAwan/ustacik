import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Craftsman from '#models/craftsman'

export default class WorkPhoto extends BaseModel {
  static table = 'work_photos'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare craftsmanId: number

  @column()
  declare imageUrl: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>
}
