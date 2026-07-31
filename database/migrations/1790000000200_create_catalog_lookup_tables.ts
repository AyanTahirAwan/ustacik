import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('categories', (table) => {
      table.increments('id').notNullable()
      table.string('name_en', 120).notNullable().unique()
      table.string('name_tr', 120).notNullable().unique()
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('sub_services', (table) => {
      table.increments('id').notNullable()
      table
        .integer('category_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('RESTRICT')
      table.string('name_en', 120).notNullable()
      table.string('name_tr', 120).notNullable()
      table.timestamp('created_at').notNullable()

      table.unique(['category_id', 'name_en'])
    })

    this.schema.createTable('regions', (table) => {
      table.increments('id').notNullable()
      table.string('name_en', 120).notNullable().unique()
      table.string('name_tr', 120).notNullable().unique()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('regions')
    this.schema.dropTable('sub_services')
    this.schema.dropTable('categories')
  }
}
