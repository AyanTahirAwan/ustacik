import { BaseModel, column, hasOne, hasMany } from '@adonisjs/lucid/orm'
import type { HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DateTime } from 'luxon'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import RefreshToken from '#models/refresh_token'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  
  passwordColumnName: 'passwordHash',
})


export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column()
  declare phoneNormalised: string

  @column({ serializeAs: null })
  declare passwordHash: string

  @column()
  declare role: 'customer' | 'craftsman' | 'admin'

  @column()
  declare status: 'active' | 'suspended'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasOne(() => Customer, { foreignKey: 'userId' })
  declare customer: HasOne<typeof Customer>

  @hasOne(() => Craftsman, { foreignKey: 'userId' })
  declare craftsman: HasOne<typeof Craftsman>

  @hasOne(() => Admin, { foreignKey: 'userId' })
  declare admin: HasOne<typeof Admin>

  @hasMany(() => RefreshToken)
  declare refreshTokens: HasMany<typeof RefreshToken>

  get isActive() {
    return this.status === 'active'
  }

  
  get initials() {
    return this.email.slice(0, 2).toUpperCase()
  }
}
