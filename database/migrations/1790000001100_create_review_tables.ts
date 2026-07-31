import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('reviews', (table) => {
      table.increments('id').notNullable()

      table
        .integer('job_id')
        .unsigned()
        .notNullable()
        .unique()
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

      table.integer('punctuality').notNullable()
      table.integer('workmanship').notNullable()
      table.integer('price_honesty').notNullable()
      table.integer('communication').notNullable()

      table.text('comment').nullable()
      table.text('craftsman_reply').nullable()

      table.timestamp('created_at').notNullable()

      table.check('punctuality BETWEEN 1 AND 5', [], 'reviews_punctuality_range')
      table.check('workmanship BETWEEN 1 AND 5', [], 'reviews_workmanship_range')
      table.check('price_honesty BETWEEN 1 AND 5', [], 'reviews_price_honesty_range')
      table.check('communication BETWEEN 1 AND 5', [], 'reviews_communication_range')
      table.index(['craftsman_id'])
    })

    this.schema.createTable('review_helpful_votes', (table) => {
      table.increments('id').notNullable()

      table
        .integer('review_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('reviews')
        .onDelete('CASCADE')

      table
        .integer('customer_id')
        .unsigned()
        .notNullable()
        .references('user_id')
        .inTable('customers')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()

      table.unique(['review_id', 'customer_id'])
    })
  }

  async down() {
    this.schema.dropTable('review_helpful_votes')
    this.schema.dropTable('reviews')
  }
}
