import { BaseModel, column, belongsTo, hasOne, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Category from '#models/category'
import Region from '#models/region'
import Review from '#models/review'
import JobDispute from '#models/job_dispute'

export type JobStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed'

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['accepted', 'declined', 'cancelled', 'expired'],
  accepted: ['in_progress', 'cancelled', 'disputed'],
  in_progress: ['completed', 'cancelled', 'disputed'],
  completed: ['disputed'],
  declined: [],
  cancelled: [],
  expired: [],
  disputed: ['completed', 'cancelled'],
}

export default class JobRequest extends BaseModel {
  static table = 'job_requests'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare requestId: string

  @column()
  declare customerId: number

  @column()
  declare craftsmanId: number

  @column()
  declare categoryId: number

  @column()
  declare regionId: number

  @column()
  declare description: string

  @column()
  declare status: JobStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @belongsTo(() => Region)
  declare region: BelongsTo<typeof Region>

  @hasOne(() => Review, { foreignKey: 'jobId' })
  declare review: HasOne<typeof Review>

  @hasMany(() => JobDispute, { foreignKey: 'jobId' })
  declare disputes: HasMany<typeof JobDispute>

  
  static async submit(data: {
    requestId: string
    customerId: number
    craftsmanId: number
    categoryId: number
    regionId: number
    description: string
  }) {
    const existing = await JobRequest.findBy('request_id', data.requestId)
    if (existing) return existing

    return JobRequest.create({ ...data, status: 'pending' })
  }

  canTransitionTo(next: JobStatus) {
    return ALLOWED_TRANSITIONS[this.status].includes(next)
  }

  async transitionTo(next: JobStatus) {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Cannot move job ${this.id} from ${this.status} to ${next}`)
    }
    this.status = next
    await this.save()

    if (next === 'completed') {
      const craftsman = await this.related('craftsman').query().firstOrFail()
      craftsman.totalJobs += 1
      await craftsman.save()
    }

    return this
  }
}
