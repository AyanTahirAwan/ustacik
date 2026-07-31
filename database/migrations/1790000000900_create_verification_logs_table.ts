import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {

    this.schema.createTable('verification_logs', (table) => {
      table.increments('id').notNullable()

      table
        .integer('target_user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table
        .integer('checked_by_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('admins')
        .onDelete('RESTRICT')

      table.string('status', 50).notNullable()
      table.timestamp('verified_at').notNullable()

      table.index(['target_user_id', 'verified_at'])
    })

    this.schema.createTable('craftsman_verification_logs', (table) => {
      table
        .integer('log_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('verification_logs')
        .onDelete('CASCADE')

      table.boolean('id_card_verified').notNullable().defaultTo(false)
      table.boolean('past_customer_1_called').notNullable().defaultTo(false)
      table.boolean('past_customer_2_called').notNullable().defaultTo(false)
      table.string('biz_reg_doc_url', 500).nullable()
      table.string('guarantee_doc_url', 500).nullable()
      table.boolean('verbal_consent_audited').notNullable().defaultTo(false)
      table.integer('trust_tier_granted').notNullable().defaultTo(1)

      table.check('trust_tier_granted >= 1 AND trust_tier_granted <= 3', [], 'craftsman_trust_tier_range')
    })

    this.schema.createTable('customer_verification_logs', (table) => {
      table
        .integer('log_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('verification_logs')
        .onDelete('CASCADE')

      table.boolean('phone_otp_verified').notNullable().defaultTo(false)
      table.boolean('whatsapp_reachable').notNullable().defaultTo(false)
      table.boolean('email_verified').notNullable().defaultTo(false)
      table.string('ip_address', 45).nullable()
    })

    this.schema.createTable('admin_verification_logs', (table) => {
      table
        .integer('log_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('verification_logs')
        .onDelete('CASCADE')

      table
        .integer('supervisor_id')
        .unsigned()
        .nullable()
        .references('user_id')
        .inTable('admins')
        .onDelete('SET NULL')

      table.string('department_code', 64).nullable()
      table.integer('clearance_level_granted').notNullable().defaultTo(1)
      table.text('background_check_notes').nullable()
    })
  }

  async down() {
    this.schema.dropTable('admin_verification_logs')
    this.schema.dropTable('customer_verification_logs')
    this.schema.dropTable('craftsman_verification_logs')
    this.schema.dropTable('verification_logs')
  }
}