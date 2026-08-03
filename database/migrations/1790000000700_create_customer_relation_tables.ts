import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('customer_addresses', (table) => {
      table.increments('id').notNullable()

      table
        .integer('customer_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('customers')
        .onDelete('CASCADE')

      table
        .integer('region_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('regions')
        .onDelete('RESTRICT')

      table.string('label', 80).notNullable()
      table.string('street', 200).notNullable()
      table.string('landmark', 200).nullable()
      table.boolean('is_default').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('customer_favorites', (table) => {
      table.increments('id').notNullable()

      table
        .integer('customer_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('customers')
        .onDelete('CASCADE')

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()

      table.unique(['customer_id', 'craftsman_id'])
    })
  }

  async down() {
    this.schema.dropTable('customer_favorites')
    this.schema.dropTable('customer_addresses')
  }
}
