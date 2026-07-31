import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores hashed refresh tokens issued to user accounts.
 * A user may have multiple refresh-token records.
 */
export default class extends BaseSchema {
  protected tableName = 'refresh_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('user_id').unsigned().references('id').inTable('users')

      table.string('token_hash')
      table.timestamp('expires_at')
      table.boolean('revoked')
      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
