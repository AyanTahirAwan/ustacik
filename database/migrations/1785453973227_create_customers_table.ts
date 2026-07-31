import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores profile information specific to customer accounts.
 * Each customer profile belongs to exactly one user account.
 */
export default class extends BaseSchema {
  protected tableName = 'customers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id').unsigned().primary().references('id').inTable('users')

      table.string('full_name')
      table.integer('default_reg').unsigned().references('id').inTable('regions')

      table.string('language')
      table.boolean('sms_opt_in')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
