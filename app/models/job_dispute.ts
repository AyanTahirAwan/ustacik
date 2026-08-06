import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import JobRequest from '#models/job_request'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'

export type DisputeReason = 'price' | 'workmanship' | 'punctuality' | 'communication' | 'other'
export type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'CLOSED'

export default class JobDispute extends BaseModel {
  static table = 'job_disputes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare jobId: number

  @column()
  declare customerId: number

  @column()
  declare craftsmanId: number

  @column()
  declare reasonCategory: DisputeReason

  @column()
  declare customerNotes: string

  @column()
  declare adminResolutionNotes: string | null

  @column()
  declare status: DisputeStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime()
  declare resolvedAt: DateTime | null

  @belongsTo(() => JobRequest, { foreignKey: 'jobId' })
  declare job: BelongsTo<typeof JobRequest>

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>
}
