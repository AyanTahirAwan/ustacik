import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores the current subscription information for craftsman accounts.
 * Each craftsman may have at most one subscription record.
 */
export default class extends BaseSchema {
  protected tableName = 'subscriptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('craftsman_id').unsigned().unique().references('user_id').inTable('craftsmen')

      table.string('plan_type')
      table.string('status')
      table.date('period_start')
      table.date('period_end')
      table.decimal('monthly_fee', 10, 2)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
