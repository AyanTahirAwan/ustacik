import Admin from '#models/admin'
import User from '#models/user'
import {
  createCraftsmanFixture,
  createCustomerFixture,
  createRegionFixture,
} from '#tests/helpers/user_fixtures'
import testUtils from '@adonisjs/core/services/test_utils'
import hash from '@adonisjs/core/services/hash'
import { test } from '@japa/runner'

test.group('Account settings', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('redirects guests to login', async ({ client }) => {
    const response = await client.get('/account/settings').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('allows customers to open their settings', async ({ client }) => {
    const { user } = await createCustomerFixture('account-settings-customer')
    const response = await client.get('/account/settings').loginAs(user)
    const requestsResponse = await client.get('/customer/requests').loginAs(user)

    response.assertStatus(200)
    response.assertTextIncludes('Account Settings')
    response.assertTextIncludes(user.email)
    response.assertTextIncludes(user.phoneNormalised)
    response.assertTextIncludes('Default Region')
    response.assertTextIncludes('Preferred Language')
    response.assertTextIncludes('SMS Notifications')
    requestsResponse.assertStatus(200)
  })

  test('allows craftsmen to open their settings without exposing business fields', async ({
    client,
    assert,
  }) => {
    const { user, craftsman } = await createCraftsmanFixture('account-settings-craftsman')
    const response = await client.get('/account/settings').loginAs(user)

    response.assertStatus(200)
    response.assertTextIncludes('Account Settings')
    response.assertTextIncludes(user.email)
    response.assertTextIncludes(user.phoneNormalised)
    assert.notInclude(response.text(), craftsman.businessName)
    response.assertTextIncludes('Manage Business Profile')
  })

  test('excludes administrators from shared account settings', async ({ client }) => {
    const user = await User.create({
      email: 'account-settings-admin@example.test',
      phoneNormalised: '+905559999999',
      passwordHash: 'TestPassword123!',
      role: 'admin',
      status: 'active',
    })
    await Admin.create({
      userId: user.id,
      fullName: 'Account Settings Admin',
      department: 'Operations',
      clearanceLvl: 2,
    })

    const response = await client.get('/account/settings').loginAs(user).accept('json')
    const passwordResponse = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        currentPassword: 'TestPassword123!',
        newPassword: 'UpdatedPassword123!',
        newPasswordConfirmation: 'UpdatedPassword123!',
      })

    response.assertStatus(403)
    passwordResponse.assertStatus(403)
  })

  test('customer name update cannot mutate protected account fields', async ({
    client,
    assert,
  }) => {
    const { user, customer } = await createCustomerFixture('account-settings-protected')
    const region = await createRegionFixture('account-settings-region')
    const original = {
      email: user.email,
      phone: user.phoneNormalised,
      role: user.role,
      status: user.status,
    }

    const response = await client
      .patch('/api/customer/profile')
      .loginAs(user)
      .withCsrfToken()
      .json({
        fullName: 'Updated Account Name',
        defaultRegionId: region.id,
        language: 'tr',
        smsOptIn: false,
        email: 'attacker@example.test',
        phoneNormalised: '+900000000000',
        role: 'admin',
        status: 'suspended',
        userId: 999999,
      })

    response.assertStatus(200)
    await user.refresh()
    await customer.refresh()

    assert.equal(customer.fullName, 'Updated Account Name')
    assert.equal(customer.defaultRegionId, region.id)
    assert.equal(customer.language, 'tr')
    assert.isFalse(Boolean(customer.smsOptIn))
    assert.equal(user.email, original.email)
    assert.equal(user.phoneNormalised, original.phone)
    assert.equal(user.role, original.role)
    assert.equal(user.status, original.status)
  })

  test('rejects unauthenticated password changes', async ({ client }) => {
    const response = await client
      .patch('/api/account/password')
      .withCsrfToken()
      .accept('json')
      .json({
        currentPassword: 'TestPassword123!',
        newPassword: 'UpdatedPassword123!',
        newPasswordConfirmation: 'UpdatedPassword123!',
      })

    response.assertStatus(401)
  })

  test('rejects an incorrect current password', async ({ client, assert }) => {
    const { user } = await createCustomerFixture('password-wrong-current')
    const response = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .json({
        currentPassword: 'IncorrectPassword123!',
        newPassword: 'UpdatedPassword123!',
        newPasswordConfirmation: 'UpdatedPassword123!',
      })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ field: 'currentPassword', message: 'Current password is incorrect.' }],
    })
    await user.refresh()
    assert.isTrue(await hash.verify(user.passwordHash, 'TestPassword123!'))
  })

  test('rejects an invalid new password', async ({ client }) => {
    const { user } = await createCustomerFixture('password-validation')
    const invalid = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        currentPassword: 'TestPassword123!',
        newPassword: 'short',
        newPasswordConfirmation: 'short',
      })
    invalid.assertStatus(422)
  })

  test('rejects a mismatched new password confirmation', async ({ client }) => {
    const { user } = await createCustomerFixture('password-confirmation')
    const mismatch = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        currentPassword: 'TestPassword123!',
        newPassword: 'UpdatedPassword123!',
        newPasswordConfirmation: 'DifferentPassword123!',
      })

    mismatch.assertStatus(422)
  })

  test('rejects reuse of the current password', async ({ client }) => {
    const { user } = await createCustomerFixture('password-reuse')
    const response = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .accept('json')
      .json({
        currentPassword: 'TestPassword123!',
        newPassword: 'TestPassword123!',
        newPasswordConfirmation: 'TestPassword123!',
      })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [
        {
          field: 'newPassword',
          message: 'New password must be different from the current password.',
        },
      ],
    })
  })

  test('changes a customer password and updates login credentials', async ({ client, assert }) => {
    const { user } = await createCustomerFixture('password-success')
    const newPassword = 'UpdatedPassword123!'
    const response = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .json({
        currentPassword: 'TestPassword123!',
        newPassword,
        newPasswordConfirmation: newPassword,
      })

    response.assertStatus(200)
    response.assertBody({ message: 'Password updated successfully.' })
    await user.refresh()
    assert.isFalse(await hash.verify(user.passwordHash, 'TestPassword123!'))
    assert.isTrue(await hash.verify(user.passwordHash, newPassword))

    const oldLogin = await client.post('/login').withCsrfToken().accept('json').json({
      email: user.email,
      password: 'TestPassword123!',
    })
    const newLogin = await client.post('/login').withCsrfToken().redirects(0).json({
      email: user.email,
      password: newPassword,
    })

    oldLogin.assertStatus(400)
    newLogin.assertStatus(302)
  })

  test('allows a craftsman to change only their own password', async ({ client, assert }) => {
    const { user } = await createCraftsmanFixture('password-craftsman')
    const newPassword = 'CraftsmanUpdated123!'
    const response = await client
      .patch('/api/account/password')
      .loginAs(user)
      .withCsrfToken()
      .json({
        currentPassword: 'TestPassword123!',
        newPassword,
        newPasswordConfirmation: newPassword,
        userId: 999999,
        role: 'admin',
      })

    response.assertStatus(200)
    await user.refresh()
    assert.equal(user.role, 'craftsman')
    assert.isTrue(await hash.verify(user.passwordHash, newPassword))
  })
})
