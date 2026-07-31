import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores craftsmen saved as favorites by customer accounts.
 * A customer may have multiple favorite craftsmen.
 *
 * The foreign-key column names were inferred because they are
 * truncated in the provided ERD text.
 */
export default class extends BaseSchema {
  protected tableName = 'customer_favorites'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('customer_id').unsigned().references('user_id').inTable('customers')

      table.integer('craftsman_id').unsigned().references('user_id').inTable('craftsmen')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
