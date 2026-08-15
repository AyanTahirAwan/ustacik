/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

// Create the Env service but keep several keys optional so local/dev workflows
// (where .env may be temporary) don't crash during startup. Do strict checks
// below to enforce production-only requirements.
const envService = await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number.optional(),
  HOST: Env.schema.string.optional(),
  LOG_LEVEL: Env.schema.string.optional(),

  // App
  APP_KEY: Env.schema.secret.optional(),
  APP_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  RESEND_API_KEY: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),
  SMS_DELIVERY_WEBHOOK_URL: Env.schema.string.optional(),
  SMS_DELIVERY_WEBHOOK_TOKEN: Env.schema.string.optional(),

  DATABASE_URL: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.string.optional(),
})

// Validate session driver if present
const sessionDriver = envService.get('SESSION_DRIVER')
if (sessionDriver && !['cookie', 'memory', 'database'].includes(sessionDriver)) {
  throw new Error('Invalid SESSION_DRIVER. Allowed values: cookie, memory, database')
}

// Provide sensible defaults for local development so missing variables don't
// cause crashes when running locally (but still enforce production rules).
const nodeEnv = envService.get('NODE_ENV') ?? 'development'
const port = envService.get('PORT') ?? 3333
const host = envService.get('HOST') ?? (nodeEnv === 'production' ? '0.0.0.0' : 'localhost')
const logLevel = envService.get('LOG_LEVEL') ?? 'info'

// Make values available on process.env for other code that uses process.env directly
process.env.NODE_ENV = nodeEnv
process.env.PORT = String(port)
process.env.HOST = host
process.env.LOG_LEVEL = logLevel

// Enforce production-only requirements with clear errors
if (nodeEnv === 'production') {
  const dbUrl = envService.get('DATABASE_URL')
  if (!dbUrl) {
    throw new Error('Missing required environment variable DATABASE_URL for production')
  }
  if (dbUrl.startsWith('sqlite')) {
    throw new Error('SQLite is not supported in production. Set DATABASE_URL to a Postgres connection string')
  }

  const appKey = envService.get('APP_KEY')
  if (!appKey) {
    throw new Error('Missing required environment variable APP_KEY for production')
  }
}

export default envService
