import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('refresh_tokens', (table) => {
      table.increments('id').notNullable()

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('token_hash', 255).notNullable().unique()
      table.timestamp('expires_at').notNullable()
      table.boolean('revoked').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()

      table.index(['user_id', 'revoked'])
    })

    this.schema.createTable('password_recovery_requests', (table) => {
      table.increments('id').notNullable()

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('shortcode', 64).notNullable().unique()
      table.timestamp('recovered_at').nullable()
      table.timestamp('expiry_date').notNullable()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('user_consent_logs', (table) => {
      table.increments('id').notNullable()

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')

      table.string('terms_version', 32).notNullable()
      table.enum('agreement_type', ['TOS', 'WAIVER']).notNullable()
      table.string('ip', 45).notNullable()
      table.timestamp('accepted_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('user_consent_logs')
    this.schema.dropTable('password_recovery_requests')
    this.schema.dropTable('refresh_tokens')
  }
}
