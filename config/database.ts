import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const rawDbUrl = env.get('DATABASE_URL') ?? ''

let dbConfig

// If running in production, prevent sqlite usage.
const nodeEnv = env.get('NODE_ENV')
if (nodeEnv === 'production' && rawDbUrl.startsWith('sqlite')) {
  throw new Error('Refusing to use sqlite in production. Set DATABASE_URL to Postgres for production environments')
}

if (rawDbUrl.startsWith('sqlite')) {
  const filename = rawDbUrl.replace(/^sqlite:\/\//, '')
  dbConfig = defineConfig({
    connection: 'sqlite',

    prettyPrintDebugQueries: true,

    connections: {
      sqlite: {
        client: 'sqlite3',
        connection: {
          filename,
        },
        useNullAsDefault: true,
        migrations: {
          naturalSort: true,
          paths: ['database/migrations'],
        },
        debug: false,
      },
    },
  })
} else {
  dbConfig = defineConfig({
    connection: 'postgres',

    prettyPrintDebugQueries: true,

    connections: {
      postgres: {
        client: 'pg',

        connection: {
          connectionString: rawDbUrl,
        },

        migrations: {
          naturalSort: true,
          paths: ['database/migrations'],
        },

        debug: false,
      },
    },
  })
}

export default dbConfig
