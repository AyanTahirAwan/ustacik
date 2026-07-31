import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'verification_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('RESTRICT')

      table
        .integer('checked_by_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('admins')
        .onDelete('RESTRICT')

      table
        .enum('level_granted', ['registered', 'verified', 'approved'], { useNative: false })
        .notNullable()

      // Craftsman-tier checklist. Nullable because a 'registered'-level
      // entry (phone verified) won't have ID/reference checks filled in yet.
      table.boolean('id_card_verified').nullable()
      table.boolean('past_customer_1_called').nullable()
      table.boolean('past_customer_2_called').nullable()
      table.string('biz_reg_doc_url', 500).nullable()
      table.string('guarantee_doc_url', 500).nullable()
      table.boolean('verbal_consent_audited').nullable()

      table.text('notes').nullable()
      table.timestamp('verified_at').notNullable()

      table.index(['craftsman_id', 'verified_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
