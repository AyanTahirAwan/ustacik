import { BaseSchema } from '@adonisjs/lucid/schema'


export default class extends BaseSchema {
  protected tableName = 'user_notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table
        .enum(
          'type',
          [
            'job_request_received',
            'job_accepted',
            'job_declined',
            'job_completed',
            'review_received',
            'verification_approved',
            'dispute_opened',
            'system',
          ],
          { useNative: false }
        )
        .notNullable()

      table.string('title', 160).notNullable()
      table.text('message_body').notNullable()
      table.boolean('is_read').notNullable().defaultTo(false)
      table.timestamp('sent_at').notNullable()

      table.index(['user_id', 'is_read'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
