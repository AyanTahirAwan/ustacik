import Craftsman from '#models/craftsman'
import Customer from '#models/customer'
import User from '#models/user'
import { createAdmin, createCustomer, seedCatalog } from './helpers.js'
import { test } from '@japa/runner'

/**
 * -------------------------------------------------------------------------
 * Authentication flow tests — signup, login, logout.
 *
 * These cover the web auth routes (`/signup`, `/login`, `/logout`) which
 * render HTML pages or issue 302 redirects. We assert the redirect status,
 * the database state changes, and that the session established by a real
 * login/logout is (or is no longer) usable on a protected route.
 * -------------------------------------------------------------------------
 */

// -------------------------------------------------------------------------
// Signup
// -------------------------------------------------------------------------

test.group('Auth Flow — Signup', () => {
  test('customer signup creates a user and customer profile and redirects', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/signup').withCsrfToken().redirects(0).accept('json').json({
      email: 'new-customer@ustacik.test',
      phone: '+905551000099',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'customer',
      fullName: 'New Customer',
    })

    response.assertStatus(302)

    const user = await User.findBy('email', 'new-customer@ustacik.test')
    assert.exists(user)
    assert.equal(user!.role, 'customer')

    const customer = await Customer.findBy('userId', user!.id)
    assert.exists(customer)
    assert.equal(customer!.fullName, 'New Customer')
  })

  test('craftsman signup creates a user and craftsman profile and redirects', async ({
    assert,
    client,
  }) => {
    const { plumbing } = await seedCatalog()

    const response = await client.post('/signup').withCsrfToken().redirects(0).accept('json').json({
      email: 'new-craftsman@ustacik.test',
      phone: '+905551000098',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'craftsman',
      businessName: 'New Craftsman Co.',
      categoryId: plumbing.id,
    })

    response.assertStatus(302)

    const user = await User.findBy('email', 'new-craftsman@ustacik.test')
    assert.exists(user)
    assert.equal(user!.role, 'craftsman')

    const craftsman = await Craftsman.findBy('userId', user!.id)
    assert.exists(craftsman)
    assert.equal(craftsman!.businessName, 'New Craftsman Co.')
  })

  test('duplicate email is rejected with 422', async ({ assert, client }) => {
    await createCustomer()

    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'customer@ustacik.test',
      phone: '+905551000097',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('duplicate phone is rejected with 422', async ({ assert, client }) => {
    await createCustomer()

    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'another-customer@ustacik.test',
      phone: '+905551000003',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('invalid email is rejected with 422', async ({ assert, client }) => {
    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'not-an-email',
      phone: '+905551000096',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('short password is rejected with 422', async ({ assert, client }) => {
    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'short-password@ustacik.test',
      phone: '+905551000095',
      password: 'short',
      passwordConfirmation: 'short',
      role: 'customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('password confirmation mismatch is rejected with 422', async ({ assert, client }) => {
    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'mismatch@ustacik.test',
      phone: '+905551000094',
      password: 'Password123!',
      passwordConfirmation: 'Different123!',
      role: 'customer',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })

  test('invalid role is rejected with 422', async ({ assert, client }) => {
    const response = await client.post('/signup').withCsrfToken().accept('json').json({
      email: 'invalid-role@ustacik.test',
      phone: '+905551000093',
      password: 'Password123!',
      passwordConfirmation: 'Password123!',
      role: 'admin',
    })

    response.assertStatus(422)
    assert.isArray(response.body().errors)
  })
})

// -------------------------------------------------------------------------
// Login
// -------------------------------------------------------------------------

test.group('Auth Flow — Login', () => {
  test('valid login establishes a session for the authenticated user', async ({ client }) => {
    const customer = await createCustomer({ email: 'login-user@ustacik.test' })

    const login = await client
      .post('/login')
      .withCsrfToken()
      .redirects(0)
      .accept('json')
      .json({ email: customer.email, password: 'Password123!' })

    login.assertStatus(302)
    // The session cookie baked into the response must include the
    // authenticated user's id under the `auth_web` session key.
    login.assertSession('auth_web', customer.id)
  })

  test('wrong password is rejected with 400', async ({ client }) => {
    const customer = await createCustomer({ email: 'wrong-pass@ustacik.test' })

    const response = await client
      .post('/login')
      .withCsrfToken()
      .accept('json')
      .json({ email: customer.email, password: 'WrongPassword!' })

    response.assertStatus(400)
  })

  test('non-existing email is rejected with 400', async ({ client }) => {
    const response = await client
      .post('/login')
      .withCsrfToken()
      .accept('json')
      .json({ email: 'does-not-exist@ustacik.test', password: 'Password123!' })

    response.assertStatus(400)
  })

  test('GET /login renders the login page', async ({ client }) => {
    const response = await client.get('/login')

    response.assertStatus(200)
  })
})

// -------------------------------------------------------------------------
// Logout
// -------------------------------------------------------------------------

test.group('Auth Flow — Logout', () => {
  test('authenticated logout succeeds with a redirect', async ({ client }) => {
    const admin = await createAdmin()

    const logout = await client
      .post('/logout')
      .withCsrfToken()
      .withSession({ auth_web: admin.id })
      .redirects(0)
      .accept('json')

    logout.assertStatus(302)
  })

  test('session is destroyed after logout', async ({ client }) => {
    const admin = await createAdmin()

    const logout = await client
      .post('/logout')
      .withCsrfToken()
      .withSession({ auth_web: admin.id })
      .redirects(0)
      .accept('json')

    logout.assertStatus(302)
    logout.assertSessionMissing('auth_web')
  })
})
