import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import JobRequest from '#models/job_request'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import ReviewHelpfulVote from '#models/review_helpful_vote'

export default class Review extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare jobId: number

  @column()
  declare customerId: number

  @column()
  declare craftsmanId: number

  @column()
  declare punctuality: number

  @column()
  declare workmanship: number

  @column()
  declare priceHonesty: number

  @column()
  declare communication: number

  @column()
  declare comment: string | null

  @column()
  declare craftsmanReply: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => JobRequest, { foreignKey: 'jobId' })
  declare job: BelongsTo<typeof JobRequest>

  @belongsTo(() => Customer, { foreignKey: 'customerId' })
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Craftsman, { foreignKey: 'craftsmanId' })
  declare craftsman: BelongsTo<typeof Craftsman>

  @hasMany(() => ReviewHelpfulVote)
  declare helpfulVotes: HasMany<typeof ReviewHelpfulVote>

  get average() {
    return (this.punctuality + this.workmanship + this.priceHonesty + this.communication) / 4
  }

  static async submit(data: {
    jobId: number
    customerId: number
    punctuality: number
    workmanship: number
    priceHonesty: number
    communication: number
    comment?: string
  }) {
    const job = await JobRequest.findOrFail(data.jobId)

    if (job.status !== 'completed') {
      throw new Error('Reviews can only be left on completed jobs')
    }
    if (job.customerId !== data.customerId) {
      throw new Error('Only the customer on this job can review it')
    }

    const existing = await Review.findBy('job_id', data.jobId)
    if (existing) {
      throw new Error('This job has already been reviewed')
    }

    return Review.create({
      jobId: job.id,
      customerId: job.customerId,
      craftsmanId: job.craftsmanId,
      punctuality: data.punctuality,
      workmanship: data.workmanship,
      priceHonesty: data.priceHonesty,
      communication: data.communication,
      comment: data.comment ?? null,
    })
  }

  async reply(craftsmanId: number, message: string) {
    if (this.craftsmanId !== craftsmanId) {
      throw new Error('Only the reviewed craftsman can reply to this review')
    }
    if (this.craftsmanReply !== null) {
      throw new Error('This review already has a reply')
    }
    this.craftsmanReply = message
    await this.save()
    return this
  }
}
