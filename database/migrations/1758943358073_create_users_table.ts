import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores the common account and authentication information
 * shared by customers, craftsmen, and administrators.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('email', 254).notNullable().unique()
      table.string('phone_normalised', 32).notNullable().unique()
      table.string('password_hash', 255).notNullable()

      table.enum('role', ['CUSTOMER', 'CRAFTSMAN', 'ADMIN']).notNullable()

      table.string('status', 32).notNullable()
      table.timestamp('created_at').notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
