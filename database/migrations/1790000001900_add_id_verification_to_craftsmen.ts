import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'craftsmen'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('id_card_image_url', 500).nullable()
      table.string('verification_status', 32).notNullable().defaultTo('pending')
    })

    if (this.db.dialect.name === 'postgres') {
      await this.db.rawQuery(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;`)
      await this.db.rawQuery(`ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended', 'pending'));`)
    }
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('verification_status')
      table.dropColumn('id_card_image_url')
    })
  }
}
