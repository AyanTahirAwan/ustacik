import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores profile and business information specific to craftsman accounts.
 * Each craftsman profile belongs to exactly one user account.
 */
export default class extends BaseSchema {
  protected tableName = 'craftsmen'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id').unsigned().primary().references('id').inTable('users')

      table.string('business_name')

      table.integer('category_id').unsigned().references('id').inTable('categories')

      table.text('bio')
      table.integer('trust_level')
      table.string('biz_reg_no')
      table.boolean('verbal_consent')
      table.integer('total_jobs')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
