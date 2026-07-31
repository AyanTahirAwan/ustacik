import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Search and pricing catalog.
 *
 * A price belongs to one craftsman (currently represented by users), one
 * sub-service, and one region. The category is intentionally reached through
 * the sub-service to keep this relationship normalized.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('categories', (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable()
      table.string('slug', 140).notNullable().unique()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('sub_services', (table) => {
      table.increments('id').notNullable()
      table
        .integer('category_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('CASCADE')
      table.string('name', 120).notNullable()
      table.string('slug', 140).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['category_id', 'slug'])
    })

    this.schema.createTable('regions', (table) => {
      table.increments('id').notNullable()
      table.string('name', 120).notNullable()
      table.string('slug', 140).notNullable().unique()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('service_price_catalogs', (table) => {
      table.increments('id').notNullable()
      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('RESTRICT')
      table
        .integer('sub_service_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('sub_services')
        .onDelete('CASCADE')
      table
        .integer('region_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('regions')
        .onDelete('RESTRICT')
      table.decimal('price', 12, 2).notNullable()
      table.string('currency', 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.check('price >= 0')
      table.unique(['craftsman_id', 'sub_service_id', 'region_id'])
      table.index(['sub_service_id', 'region_id', 'price'])
      table.index(['region_id', 'price'])
    })
  }

  async down() {
    this.schema.dropTable('service_price_catalogs')
    this.schema.dropTable('regions')
    this.schema.dropTable('sub_services')
    this.schema.dropTable('categories')
  }
}
