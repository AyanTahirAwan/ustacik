import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'verification_codes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Existing deployments may have a six-character code column. Keep it
      // redacted and store only a digest in the new column.
      table.string('code_hash', 64).nullable().index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => table.dropColumn('code_hash'))
  }
}
