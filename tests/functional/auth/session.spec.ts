// Verifies customer signup, login, suspension, and logout session behavior.
import Craftsman from '#models/craftsman'
import Customer from '#models/customer'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

let fixtureSequence = 0

// Generate unique credentials for each authentication scenario.
function nextIdentity(label: string) {
  fixtureSequence += 1

  const sequence = fixtureSequence.toString().padStart(7, '0')

  return {
    email: `${label}-${sequence}@example.test`,
    phone: `+90556${sequence}`,
  }
}

// Create real user and profile records with a configurable account status.
async function createCustomerFixture({
  label,
  password = 'KnownPassword123!',
  status = 'active',
}: {
  label: string
  password?: string
  status?: 'active' | 'suspended'
}) {
  const identity = nextIdentity(label)
  const user = await User.create({
    email: identity.email,
    phoneNormalised: identity.phone,
    passwordHash: password,
    role: 'customer',
    status,
  })
  const customer = await Customer.create({
    userId: user.id,
    fullName: `Customer ${label}`,
    defaultRegionId: null,
    language: 'en',
    smsOptIn: true,
  })

  return { user, customer, password }
}

test.group('Authentication', (group) => {
  // Roll back every test to keep authentication records isolated.
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // Authentication boundaries protect customer-only resources.
  test('rejects unauthenticated access to the customer profile', async ({ client }) => {
    const response = await client.get('/customer/profile').accept('json')

    response.assertStatus(401)
    response.assertBody({
      errors: [{ message: 'Unauthorized access' }],
    })
  })

  // Account creation verifies CSRF handling and persisted role records.
  test('signs up a customer and creates the matching profile', async ({ client, assert, db }) => {
    const identity = nextIdentity('signup-customer')
    const password = 'SignupPassword123!'
    const fullName = 'Signup Customer'

    const response = await client.post('/signup').withCsrfToken().redirects(0).json({
      email: identity.email,
      phone: identity.phone,
      password,
      passwordConfirmation: password,
      role: 'customer',
      fullName,
    })

    response.assertStatus(302)
    response.assertHeader('location', '/')

    const user = await User.findByOrFail('email', identity.email)
    const customer = await Customer.findOrFail(user.id)

    assert.equal(user.phoneNormalised, identity.phone)
    assert.equal(user.role, 'customer')
    assert.equal(user.status, 'active')
    assert.notEqual(user.passwordHash, password)
    assert.isTrue(await hash.verify(user.passwordHash, password))
    assert.equal(customer.fullName, fullName)

    await db.assertHas('users', {
      id: user.id,
      email: identity.email,
      phone_normalised: identity.phone,
      role: 'customer',
      status: 'active',
    })
    await db.assertHas('customers', {
      user_id: user.id,
      full_name: fullName,
    })
    await db.assertMissing('craftsmen', { user_id: user.id })
    assert.isNull(await Craftsman.find(user.id))
  })

  // Invalid signups must not leave partial user or profile records.
  test('rejects a customer signup with missing required fields', async ({ client, assert, db }) => {
    const response = await client
      .post('/signup')
      .withCsrfToken()
      .accept('json')
      .json({ fullName: 'Invalid Customer' })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    assert.sameMembers(
      response.body().errors.map((error: { field: string }) => error.field),
      ['email', 'phone', 'password', 'role']
    )
    await db.assertCount('users', 0)
    await db.assertCount('customers', 0)
  })

  test('rejects a duplicate customer signup without creating another profile', async ({
    client,
    assert,
    db,
  }) => {
    const { user, password } = await createCustomerFixture({ label: 'duplicate-signup' })

    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: user.email,
      phone: user.phoneNormalised,
      password,
      passwordConfirmation: password,
      role: 'customer',
      fullName: 'Duplicate Customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
    assert.sameMembers(
      response.body().errors.map((error: { field: string }) => error.field),
      ['email', 'phone']
    )
    await db.assertCount('users', 1)
    await db.assertCount('customers', 1)
    await db.assertCount('craftsmen', 0)
  })

  // Session lifecycle covers valid, invalid, suspended, and logout behavior.
  test('logs in an active customer with valid credentials', async ({ client }) => {
    const { user, password } = await createCustomerFixture({ label: 'successful-login' })

    const response = await client.post('/login').withCsrfToken().redirects(0).json({
      email: user.email,
      password,
    })

    response.assertStatus(302)
    response.assertHeader('location', '/')
    response.assertCookie('adonis-session')
    response.assertSession('auth_web', user.id)
  })

  test('rejects an invalid password', async ({ client }) => {
    const { user } = await createCustomerFixture({ label: 'invalid-login' })

    const response = await client.post('/login').withCsrfToken().accept('json').json({
      email: user.email,
      password: 'IncorrectPassword123!',
    })

    response.assertStatus(400)
    response.assertBody({
      errors: [{ message: 'Invalid user credentials' }],
    })
    response.assertSessionMissing('auth_web')
  })

  test('rejects a suspended customer with valid credentials', async ({ client }) => {
    const { user, password } = await createCustomerFixture({
      label: 'suspended-login',
      status: 'suspended',
    })

    const response = await client.post('/login').withCsrfToken().accept('json').json({
      email: user.email,
      password,
    })

    response.assertStatus(403)
    response.assertBody({
      message: 'Your account has been suspended',
    })
    response.assertSessionMissing('auth_web')
  })

  test('logs out an authenticated customer', async ({ client }) => {
    const { user } = await createCustomerFixture({ label: 'logout-customer' })

    const response = await client.post('/logout').loginAs(user).withCsrfToken().redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    response.assertSessionMissing('auth_web')
  })
})
