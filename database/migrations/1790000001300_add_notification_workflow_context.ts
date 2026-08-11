import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_notifications'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('related_job_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('job_requests')
        .onDelete('CASCADE')
      table.unique(['user_id', 'type', 'related_job_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['user_id', 'type', 'related_job_id'])
      table.dropColumn('related_job_id')
    })
  }
}
