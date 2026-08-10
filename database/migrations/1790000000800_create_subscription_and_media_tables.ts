import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('subscriptions', (table) => {
      table.increments('id').notNullable()

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('CASCADE')

      table
        .enum('plan_type', ['free', 'paid'], { useNative: false, enumName: 'plan_type_enum' })
        .notNullable()
        .defaultTo('free')

      table
        .enum('status', ['active', 'cancelled', 'past_due'], { useNative: false, enumName: 'sub_status_enum' })
        .notNullable()
        .defaultTo('active')

      table.date('period_start').notNullable()
      table.date('period_end').nullable()
      table.decimal('monthly_fee', 10, 2).notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
    })

    this.schema.createTable('work_photos', (table) => {
      table.increments('id').notNullable()

      table
        .integer('craftsman_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('craftsmen')
        .onDelete('CASCADE')

      table.string('image_url', 500).notNullable()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('work_photos')
    this.schema.dropTable('subscriptions')
  }
}
