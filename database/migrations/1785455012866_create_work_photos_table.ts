import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Stores work photos belonging to craftsman accounts.
 * A craftsman may have multiple work-photo records.
 */
export default class extends BaseSchema {
  protected tableName = 'work_photos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.integer('craftsman_id').unsigned().references('user_id').inTable('craftsmen')

      table.string('image_url')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
