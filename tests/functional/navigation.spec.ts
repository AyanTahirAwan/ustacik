import { createCraftsmanFixture, createCustomerFixture } from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

test.group('Role-aware navigation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('keeps guest navigation public and account-safe', async ({ client, assert }) => {
    const response = await client.get('/')

    response.assertStatus(200)
    for (const label of ['Categories', 'Craftsmen', 'Regions', 'Search', 'Signup', 'Login']) {
      response.assertTextIncludes(label)
    }
    assert.include(response.text(), '<nav class="public-nav"')
    for (const route of ['/categories', '/craftsmen', '/regions', '/search']) {
      assert.include(response.text(), `href="${route}"`)
    }
    assert.notInclude(response.text(), 'Notifications')
    assert.notInclude(response.text(), 'My Requests')
  })

  test('renders customer requests, notifications, and a restricted user menu', async ({
    client,
    assert,
  }) => {
    const { user } = await createCustomerFixture('customer-navigation')
    const response = await client.get('/customer/requests').loginAs(user)

    response.assertStatus(200)
    response.assertTextIncludes('My Requests')
    response.assertTextIncludes('Notifications')
    response.assertTextIncludes('Account Settings')
    response.assertTextIncludes('Logout')
    for (const route of ['/categories', '/craftsmen', '/regions', '/search']) {
      assert.include(response.text(), `href="${route}"`)
    }
    assert.include(response.text(), '<nav class="public-nav"')
    assert.notInclude(response.text(), 'Browse Marketplace')
    assert.notInclude(response.text(), 'My Service Prices')
    assert.notInclude(response.text(), 'Craftsman Workspace')
  })

  test('renders craftsman primary actions, user menu, and active workspace navigation', async ({
    client,
    assert,
  }) => {
    const { user } = await createCraftsmanFixture('craftsman-navigation')
    const response = await client.get('/craftsman/jobs').loginAs(user)

    response.assertStatus(200)
    for (const label of [
      'Dashboard',
      'Notifications',
      'Browse Marketplace',
      'Craftsman Workspace',
      'Profile',
      'Jobs',
      'Prices',
      'Work Photos',
      'Account Settings',
      'Logout',
    ]) {
      response.assertTextIncludes(label)
    }

    const body = response.text()
    assert.lengthOf(body.match(/class="dropdown-chevron"/g) ?? [], 3)
    assert.match(body, /class="dropdown-chevron"[^>]*aria-hidden="true"/)
    assert.match(
      body,
      /<summary aria-expanded="true">[\s\S]*?Craftsman Workspace[\s\S]*?focusable="false"/
    )
    assert.match(body, /<a[^>]*href="\/craftsman\/jobs"[^>]*aria-current="page"/)
    assert.notInclude(body, 'href="/account/settings" class="current"')
    assert.notInclude(body, '<nav class="public-nav"')
    for (const route of ['/categories', '/craftsmen', '/regions', '/search']) {
      assert.match(body, new RegExp(`<a[^>]*role="menuitem"[^>]*href="${route}"`))
    }
  })

  test('keeps the correct workspace item active across craftsman routes', async ({
    client,
    assert,
  }) => {
    const { user } = await createCraftsmanFixture('craftsman-active-workspace')
    const routes = [
      ['/craftsman', '/craftsman'],
      ['/craftsman/jobs', '/craftsman/jobs'],
      ['/craftsman/service-prices', '/craftsman/service-prices'],
      ['/craftsman/service-prices/create', '/craftsman/service-prices'],
      ['/craftsman/service-prices/1/edit', '/craftsman/service-prices'],
      ['/craftsman/work-photos', '/craftsman/work-photos'],
      ['/craftsman/profile', '/craftsman/profile'],
    ]

    for (const [route, activeHref] of routes) {
      const response = await client.get(route).loginAs(user)
      response.assertStatus(200)
      assert.match(
        response.text(),
        new RegExp(`<a[^>]*href="${activeHref}"[^>]*class="current"[^>]*aria-current="page"`)
      )
    }
  })

  test('keeps marketplace routes secondary and active for a craftsman', async ({
    client,
    assert,
  }) => {
    const { user } = await createCraftsmanFixture('craftsman-marketplace-navigation')

    for (const route of ['/categories', '/craftsmen', '/regions', '/search']) {
      const response = await client.get(route).loginAs(user)
      response.assertStatus(200)
      const body = response.text()
      assert.match(body, /class="user-menu marketplace-menu current"/)
      assert.match(
        body,
        new RegExp(`<a[^>]*role="menuitem"[^>]*href="${route}"[^>]*class="current"`)
      )
      assert.include(body, 'href="/craftsman"')
    }

    const typo = await client.get('/craftssman').loginAs(user).accept('json')
    typo.assertStatus(404)
  })
})
