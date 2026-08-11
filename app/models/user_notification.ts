import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export type NotificationType =
  | 'job_request_received'
  | 'job_accepted'
  | 'job_declined'
  | 'job_completed'
  | 'review_received'
  | 'verification_approved'
  | 'dispute_opened'
  | 'system'

export default class UserNotification extends BaseModel {
  static table = 'user_notifications'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare type: NotificationType

  @column()
  declare title: string

  @column()
  declare messageBody: string

  @column()
  declare relatedJobId: number | null

  @column()
  declare isRead: boolean

  @column.dateTime()
  declare sentAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
