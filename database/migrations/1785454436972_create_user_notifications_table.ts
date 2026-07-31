import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores notifications sent to user accounts.
 * A user may have multiple notification records.
 */
export default class extends BaseSchema {
  protected tableName = 'user_notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('user_id').unsigned().references('id').inTable('users')

      /**
       * The ERD defines this field as an enum but does not provide
       * the allowed values. It remains a string until they are confirmed.
       */
      table.string('type')

      table.string('title')
      table.text('message_body')
      table.boolean('is_read')
      table.timestamp('sent_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
