import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('verification_logs', (table) => {
      table.increments('id').notNullable()

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('CASCADE')

      table
        .integer('checked_by_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('admins')
        .onDelete('RESTRICT')

      table.string('level_granted', 50).notNullable()
      table.boolean('id_card_verified').nullable().defaultTo(false)
      table.boolean('past_customer_1_called').nullable().defaultTo(false)
      table.boolean('past_customer_2_called').nullable().defaultTo(false)
      table.string('biz_reg_doc_url', 500).nullable()
      table.string('guarantee_doc_url', 500).nullable()
      table.boolean('verbal_consent_audited').nullable().defaultTo(false)
      table.text('notes').nullable()
      table.timestamp('verified_at').notNullable()

      table.index(['craftsman_id', 'verified_at'])
    })
  }

  async down() {
    this.schema.dropTable('verification_logs')
  }
}