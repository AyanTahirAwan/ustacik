import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores profile information specific to administrator accounts.
 * Each administrator profile belongs to exactly one user account.
 */
export default class extends BaseSchema {
  protected tableName = 'admins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('user_id').unsigned().primary().references('id').inTable('users')

      table.string('full_name')
      table.string('department')
      table.integer('clearance_lvl')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
