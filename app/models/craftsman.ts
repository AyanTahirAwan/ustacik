import { BaseModel, column, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'
import Category from '#models/category'
import ServicePriceCatalog from '#models/service_price_catalog'
import VerificationLog from '#models/verification_log'
import Subscription from '#models/subscription'
import WorkPhoto from '#models/work_photo'
import JobRequest from '#models/job_request'
import Review from '#models/review'

export const TRUST_LEVEL_LABELS = ['unverified', 'registered', 'verified', 'approved'] as const

export default class Craftsman extends BaseModel {
  static table = 'craftsmen'

  @column({ isPrimary: true, columnName: 'user_id' })
  declare userId: number

  @column()
  declare businessName: string

  @column()
  declare categoryId: number

  @column()
  declare bio: string | null

 
  @column()
  declare trustLevel: number

  @column()
  declare bizRegNo: string | null

  @column()
  declare verbalConsent: boolean

  @column()
  declare totalJobs: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Category, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof Category>

  @hasMany(() => ServicePriceCatalog, { foreignKey: 'craftsmanId' })
  declare servicePriceCatalogs: HasMany<typeof ServicePriceCatalog>

  @hasMany(() => VerificationLog, { foreignKey: 'craftsmanId' })
  declare verificationLogs: HasMany<typeof VerificationLog>

  @hasOne(() => Subscription, { foreignKey: 'craftsmanId' })
  declare subscription: HasOne<typeof Subscription>

  @hasMany(() => WorkPhoto, { foreignKey: 'craftsmanId' })
  declare workPhotos: HasMany<typeof WorkPhoto>

  @hasMany(() => JobRequest, { foreignKey: 'craftsmanId' })
  declare jobRequests: HasMany<typeof JobRequest>

  @hasMany(() => Review, { foreignKey: 'craftsmanId' })
  declare reviews: HasMany<typeof Review>

  get trustLevelLabel() {
    return TRUST_LEVEL_LABELS[this.trustLevel] ?? 'unverified'
  }

 
  static async recomputeTrustLevel(craftsmanId: number) {
    const craftsman = await Craftsman.findOrFail(craftsmanId)
    const logs = await VerificationLog.query().where('craftsman_id', craftsmanId)

    const granted = new Set(logs.map((log) => log.levelGranted))
    let level = 0
    if (granted.has('registered')) level = 1
    if (granted.has('verified')) level = 2
    if (granted.has('approved')) level = 3

    craftsman.trustLevel = level
    await craftsman.save()
    return craftsman
  }
}
