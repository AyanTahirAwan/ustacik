import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('service_price_catalogs', (table) => {
      table.increments('id').notNullable()

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('CASCADE')

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

      table.decimal('min_price', 12, 2).notNullable()
      table.decimal('max_price', 12, 2).notNullable()
      table
        .enum('currency', ['TRY', 'GBP', 'EUR', 'USD'], { useNative: false, enumName: 'catalog_currency' })
        .notNullable()
        .defaultTo('TRY')

      
        table.boolean('is_active').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.check('min_price >= 0', [], 'service_price_catalogs_min_price_non_negative')
      table.check('max_price >= min_price', [], 'service_price_catalogs_max_gte_min')
      table.unique(['craftsman_id', 'sub_service_id', 'region_id'])
      table.index(['sub_service_id', 'region_id', 'min_price'])
      table.index(['region_id', 'min_price'])
    })
  }

  async down() {
    this.schema.dropTable('service_price_catalogs')
  }
}
