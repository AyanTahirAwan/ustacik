import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores saved addresses belonging to customer accounts.
 * A customer may have multiple address records.
 */
export default class extends BaseSchema {
  protected tableName = 'customer_addresses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('customer').unsigned().references('user_id').inTable('customers')

      table.integer('region').unsigned().references('id').inTable('regions')

      table.string('label')
      table.string('street')
      table.string('landmark')
      table.boolean('is_def')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
