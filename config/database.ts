import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',

  prettyPrintDebugQueries: true,

  connections: {
    postgres: {
      client: 'pg',

      connection: {
        connectionString: env.get('DATABASE_URL'),
      },

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },

      debug: false,
    },
  },
})

export default dbConfig