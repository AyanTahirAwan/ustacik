import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import VerificationLog from '#models/verification_log'

export default class Admin extends BaseModel {
  static table = 'admins'

  @column({ isPrimary: true, columnName: 'user_id' })
  declare userId: number

  @column()
  declare fullName: string

  @column()
  declare department: string | null

  @column()
  declare clearanceLvl: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => VerificationLog, { foreignKey: 'checkedById' })
  declare verificationsPerformed: HasMany<typeof VerificationLog>
}
