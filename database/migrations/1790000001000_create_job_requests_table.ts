import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_requests'

  async up() {
    this.schema.createTable(this.tableName, (table) => {

      table.increments('id').notNullable()

      table.string('request_id', 255).notNullable().unique()

      table
        .integer('customer_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('customers')
        .onDelete('RESTRICT')

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('RESTRICT')

      table
        .integer('category_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('RESTRICT')

      table
        .integer('region_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('regions')
        .onDelete('RESTRICT')

      table.text('description').notNullable()

      table
        .enum(
          'status',
          [
            'pending',
            'accepted',
            'declined',
            'in_progress',
            'completed',
            'disputed', 
            'cancelled',
            'expired',
          ],
          { useNative: false }
        )
        .notNullable()
        .defaultTo('pending')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['craftsman_id', 'status'])
      table.index(['customer_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
