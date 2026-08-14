import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'verification_codes'

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

      table.enum('type', ['email', 'phone']).notNullable()
      // Stores a SHA-256 digest, never the one-time code itself.
      table.string('code', 64).notNullable()
      table.string('target', 255).notNullable() // email or phone number
      table.boolean('is_verified').notNullable().defaultTo(false)
      table.integer('attempts').notNullable().defaultTo(0)
      table.dateTime('expires_at').notNullable()
      table.dateTime('verified_at').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['user_id'])
      table.index(['type'])
      table.index(['expires_at'])
      table.unique(['user_id', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
