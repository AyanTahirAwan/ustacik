import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import type { Config } from '@japa/runner/types'
import { apiClient } from '@japa/api-client'
import { browserClient } from '@japa/browser-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { dbAssertions } from '@adonisjs/lucid/plugins/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'
import { sessionApiClient } from '@adonisjs/session/plugins/api_client'
import { shieldApiClient } from '@adonisjs/shield/plugins/api_client'
import { authBrowserClient } from '@adonisjs/auth/plugins/browser_client'
import { sessionBrowserClient } from '@adonisjs/session/plugins/browser_client'

/**
 * This file is used to configure the test runner. You can register plugins, setup and teardown functions, and configure test suites.
 */

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  authApiClient(app),
  sessionApiClient(app),
  shieldApiClient(),
  pluginAdonisJS(app),
  dbAssertions(app),
  browserClient({ runInSuites: ['browser'] }),
  sessionBrowserClient(app),
  authBrowserClient(app),
]

/**
 * Configure lifecycle function to run before and after all the
 * tests.
 *
 * The setup functions are executed before all the tests
 * The teardown functions are executed after all the tests
 */
export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [() => testUtils.db().migrate()],
  teardown: [],
}

/**
 * Configure suites by tapping into the test suite instance.
 */
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => testUtils.httpServer().start())
  }

  if (suite.name === 'functional') {
    // Truncate the database before every test. This must be applied at the
    // GROUP level (not suite.onTest) because suite.onTest only runs for
    // top-level tests and does NOT execute for tests registered inside a
    // test.group(). Group.each.setup runs the truncate before each test
    // within every group, guaranteeing isolated test data and preventing
    // UNIQUE / FOREIGN KEY constraint leaks between tests.
    suite.onGroup((group) => {
      group.each.setup(() => testUtils.db().truncate())
    })
  }
}
