import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores password recovery requests created for user accounts.
 * A user may have multiple password recovery requests.
 */
export default class extends BaseSchema {
  protected tableName = 'password_recovery_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('user_id').unsigned().references('id').inTable('users')

      table.string('shortcode').unique()
      table.timestamp('recovered_at')
      table.timestamp('expiry_date')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
