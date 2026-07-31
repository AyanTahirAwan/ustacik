import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('customers', (table) => {
      table
        .integer('user_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('full_name', 160).notNullable()
      table
        .integer('default_region_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('regions')
        .onDelete('SET NULL')

      table.string('language', 8).notNullable().defaultTo('en')
      table.boolean('sms_opt_in').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('craftsmen', (table) => {
      table
        .integer('user_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')

      table.string('business_name', 160).notNullable()
      table
        .integer('category_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('RESTRICT')

      table.text('bio').nullable()

      table.integer('trust_level').notNullable().defaultTo(0)
      table.check('trust_level >= 0 AND trust_level <= 3', [], 'craftsmen_trust_level_range')

      table.string('biz_reg_no', 64).nullable()
      table.boolean('verbal_consent').notNullable().defaultTo(false)
      table.integer('total_jobs').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('admins', (table) => {
      table
        .integer('user_id')
        .unsigned()
        .primary()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')

      table.string('full_name', 160).notNullable()
      table.string('department', 120).nullable()
      table.integer('clearance_lvl').notNullable().defaultTo(1)
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('admins')
    this.schema.dropTable('craftsmen')
    this.schema.dropTable('customers')
  }
}
