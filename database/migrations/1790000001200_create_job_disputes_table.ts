import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'job_disputes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('job_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('job_requests')
        .onDelete('RESTRICT')

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
        .enum(
          'reason_category',
          ['price', 'workmanship', 'punctuality', 'communication', 'other'],
          { useNative: false, enumName: 'job_dispute_reason_category' }
        )
        .notNullable()

      table.text('customer_notes').notNullable()
      table.text('admin_resolution_notes').nullable()

      table
        .enum('status', ['OPEN', 'INVESTIGATING', 'CLOSED'], {
          useNative: false,
          enumName: 'job_dispute_status',
        })
        .notNullable()
        .defaultTo('OPEN')

      table.timestamp('created_at').notNullable()
      table.timestamp('resolved_at').nullable()

      table.index(['job_id'])
      table.index(['status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
