import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'
import VerificationLog from '#models/verification_log'

// Helper functions to create test data
async function createAdminUser() {
  const user = await User.create({
    email: 'admin_' + Date.now() + '@example.com',
    phoneNormalised: '+90555000' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    passwordHash: 'password',
    role: 'admin',
    status: 'active',
  })
  await Admin.create({ userId: user.id, fullName: 'Test Admin', clearanceLvl: 3 })
  return user
}

async function createCustomerUser() {
  const user = await User.create({
    email: 'customer_' + Date.now() + '@example.com',
    phoneNormalised: '+90555111' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    passwordHash: 'password',
    role: 'customer',
    status: 'active',
  })
  await Customer.create({ userId: user.id, fullName: 'Test Customer', language: 'en', smsOptIn: true })
  return user
}

async function createCraftsmanUser() {
  const user = await User.create({
    email: 'craftsman_' + Date.now() + '@example.com',
    phoneNormalised: '+90555222' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
    passwordHash: 'password',
    role: 'craftsman',
    status: 'active',
  })

  const category = await Category.firstOrCreate({ nameEn: 'Plumber' }, { nameEn: 'Plumber', nameTr: 'Tesisatçı' })
  await Region.firstOrCreate({ nameEn: 'Istanbul' }, { nameEn: 'Istanbul', nameTr: 'İstanbul' })

  const craftsman = await Craftsman.create({
    userId: user.id,
    businessName: 'Plumber Bob',
    categoryId: category.id,
    trustLevel: 1,
    verbalConsent: true,
    totalJobs: 0,
  })
  return { user, craftsman }
}

async function createVerificationLog(admin: InstanceType<typeof User>, craftsman: InstanceType<typeof Craftsman>) {
  return VerificationLog.create({
    craftsmanId: craftsman.userId,
    checkedById: admin.id,
    levelGranted: 'verified',
    idCardVerified: true,
    pastCustomer1Called: true,
    pastCustomer2Called: false,
    verbalConsentAudited: true,
    notes: 'Looks good',
  })
}

test.group('Verification Logs - CRUD Operations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Admin can list verification logs', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const response = await client.get('/verifications').loginAs(admin)

    response.assertStatus(200)
    assert.isArray(response.body())
  })

  test('Admin can create a verification log', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      craftsmanId: craftsman.userId,
      levelGranted: 'verified',
      idCardVerified: true,
      notes: 'Initial check passed',
    }

    const response = await client.post('/verifications').loginAs(admin).json(payload)

    response.assertStatus(201)
    response.assertBodyContains({
      craftsmanId: payload.craftsmanId,
      levelGranted: payload.levelGranted,
    })
  })

  test('Admin can view a specific log', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()
    const log = await createVerificationLog(admin, craftsman)

    const response = await client.get(`/verifications/${log.id}`).loginAs(admin)

    response.assertStatus(200)
    response.assertBodyContains({
      id: log.id,
      craftsmanId: log.craftsmanId,
    })
  })

  test('PATCH /verifications/:id - Returns 501 not implemented', async ({ client }) => {
    const admin = await createAdminUser()
    const response = await client.patch('/verifications/1').loginAs(admin).json({})

    response.assertStatus(501)
  })

  test('Admin can delete a verification log', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()
    const log = await createVerificationLog(admin, craftsman)

    const response = await client.delete(`/verifications/${log.id}`).loginAs(admin)

    response.assertStatus(204)
  })
})

test.group('Verification Logs - Authorization', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Customer cannot access verification logs', async ({ client }) => {
    const customer = await createCustomerUser()
    const response = await client.get('/verifications').loginAs(customer)

    response.assertStatus(403)
  })

  test('Craftsman cannot access verification logs', async ({ client }) => {
    const { user: craftsmanUser } = await createCraftsmanUser()
    const response = await client.get('/verifications').loginAs(craftsmanUser)

    response.assertStatus(403)
  })

  test('Customer cannot create verification logs', async ({ client }) => {
    const customer = await createCustomerUser()
    const payload = { craftsmanId: 1, levelGranted: 'verified' }
    const response = await client.post('/verifications').loginAs(customer).json(payload)

    response.assertStatus(403)
  })

  test('Craftsman cannot delete verification logs', async ({ client }) => {
    const { user: craftsmanUser } = await createCraftsmanUser()
    const response = await client.delete('/verifications/1').loginAs(craftsmanUser)

    response.assertStatus(403)
  })

  test('Unauthenticated user cannot access verifications', async ({ client }) => {
    const response = await client.get('/verifications')

    response.assertStatus(302)
  })
})

test.group('Verification Logs - Input Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Reject log with missing craftsmanId', async ({ client }) => {
    const admin = await createAdminUser()
    const payload = { levelGranted: 'verified' }
    const response = await client.post('/verifications').loginAs(admin).json(payload)

    response.assertStatus(422)
  })

  test('Reject log with invalid levelGranted', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      craftsmanId: craftsman.userId,
      levelGranted: 'mega_approved',
    }
    const response = await client.post('/verifications').loginAs(admin).json(payload)

    response.assertStatus(422)
  })

  test('Reject log with invalid bizRegDocUrl', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      craftsmanId: craftsman.userId,
      levelGranted: 'verified',
      bizRegDocUrl: 'not-a-url',
    }
    const response = await client.post('/verifications').loginAs(admin).json(payload)

    response.assertStatus(422)
  })
})

test.group('Verification Logs - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Return 404 for non-existent verification log ID', async ({ client }) => {
    const admin = await createAdminUser()
    const response = await client.get('/verifications/999999').loginAs(admin)

    response.assertStatus(404)
  })
})

test.group('Verification Logs - Response Body Verification', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Verify response body structure on creation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      craftsmanId: craftsman.userId,
      levelGranted: 'approved',
      idCardVerified: true,
      pastCustomer1Called: true,
      pastCustomer2Called: true,
      bizRegDocUrl: 'https://example.com/biz.pdf',
      guaranteeDocUrl: 'https://example.com/guarantee.pdf',
      verbalConsentAudited: true,
      notes: 'All good',
    }

    const response = await client.post('/verifications').loginAs(admin).json(payload)

    response.assertStatus(201)
    response.assertBodyContains({
      ...payload,
      checkedById: admin.id,
    })

    const body = response.body()
    assert.isDefined(body.id)
    assert.isDefined(body.verifiedAt)
  })
})
