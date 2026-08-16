import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'
import VerificationLog from '#models/verification_log'

async function createAdminUser() {
  const user = await User.create({
    email: 'admin_' + Date.now() + Math.random() + '@example.com',
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
    email: 'customer_' + Date.now() + Math.random() + '@example.com',
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
    email: 'craftsman_' + Date.now() + Math.random() + '@example.com',
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
  return VerificationLog.record({
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

  test('Admin can list a craftsman\'s verification logs', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()
    await createVerificationLog(admin, craftsman)

    const response = await client
      .get(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)

    response.assertStatus(200)
    assert.lengthOf(response.body().logs, 1)
  })

  test('Craftsman can list their own verification logs', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { user: craftsmanUser, craftsman } = await createCraftsmanUser()
    await createVerificationLog(admin, craftsman)

    const response = await client.get('/api/craftsman/verification-logs').loginAs(craftsmanUser)

    response.assertStatus(200)
    assert.lengthOf(response.body().logs, 1)
  })

  test('Admin can create a verification log', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      levelGranted: 'verified',
      idCardVerified: true,
      notes: 'Initial check passed',
    }

    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json(payload)

    response.assertStatus(201)
    response.assertBodyContains({
      log: { craftsmanId: craftsman.userId, levelGranted: payload.levelGranted },
    })
  })

  test('Creating a verification log recomputes the craftsman\'s trust level', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json({ levelGranted: 'approved', idCardVerified: true })

    await craftsman.refresh()
    assert.equal(craftsman.trustLevel, 3)
  })
})

test.group('Verification Logs - Authorization', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Customer cannot access verification logs', async ({ client }) => {
    const customer = await createCustomerUser()
    const { craftsman } = await createCraftsmanUser()

    const response = await client
      .get(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(customer)

    response.assertStatus(403)
  })

  test('Craftsman cannot view another craftsman\'s verification logs', async ({ client }) => {
    const { user: craftsmanUser } = await createCraftsmanUser()
    const { craftsman: otherCraftsman } = await createCraftsmanUser()

    const response = await client
      .get(`/api/admin/craftsmen/${otherCraftsman.userId}/verification-logs`)
      .loginAs(craftsmanUser)

    response.assertStatus(403)
  })

  test('Customer cannot create verification logs', async ({ client }) => {
    const customer = await createCustomerUser()
    const { craftsman } = await createCraftsmanUser()
    const payload = { levelGranted: 'verified' }

    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(customer)
      .json(payload)

    response.assertStatus(403)
  })

  test('Craftsman cannot create verification logs, even for themselves', async ({ client }) => {
    const { user: craftsmanUser, craftsman } = await createCraftsmanUser()

    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(craftsmanUser)
      .json({ levelGranted: 'approved' })

    response.assertStatus(403)
  })

  test('Unauthenticated user cannot access verification logs', async ({ client }) => {
    const { craftsman } = await createCraftsmanUser()
    const response = await client.get(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)

    response.assertRedirectsTo('/login')
  })

  test('There is no route to delete a verification log', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()
    const log = await createVerificationLog(admin, craftsman)

    const response = await client
      .delete(`/api/admin/craftsmen/${craftsman.userId}/verification-logs/${log.id}`)
      .loginAs(admin)

    response.assertStatus(404)
  })
})

test.group('Verification Logs - Input Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Reject log with missing levelGranted', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json({})

    response.assertStatus(422)
  })

  test('Reject log with invalid levelGranted', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = { levelGranted: 'mega_approved' }
    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json(payload)

    response.assertStatus(422)
  })

  test('Reject log with invalid bizRegDocUrl', async ({ client }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      levelGranted: 'verified',
      bizRegDocUrl: 'not-a-url',
    }
    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json(payload)

    response.assertStatus(422)
  })
})

test.group('Verification Logs - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Return 404 when verifying a non-existent craftsman', async ({ client }) => {
    const admin = await createAdminUser()

    const response = await client
      .post('/api/admin/craftsmen/999999/verification-logs')
      .loginAs(admin)
      .json({ levelGranted: 'registered' })

    response.assertStatus(404)
  })
})

test.group('Verification Logs - Response Body Verification', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Verify response body structure on creation', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const { craftsman } = await createCraftsmanUser()

    const payload = {
      levelGranted: 'approved',
      idCardVerified: true,
      pastCustomer1Called: true,
      pastCustomer2Called: true,
      bizRegDocUrl: 'https://example.com/biz.pdf',
      guaranteeDocUrl: 'https://example.com/guarantee.pdf',
      verbalConsentAudited: true,
      notes: 'All good',
    }

    const response = await client
      .post(`/api/admin/craftsmen/${craftsman.userId}/verification-logs`)
      .loginAs(admin)
      .json(payload)

    response.assertStatus(201)
    response.assertBodyContains({
      log: { ...payload, craftsmanId: craftsman.userId, checkedById: admin.id },
    })

    const log = response.body().log
    assert.isDefined(log.id)
    assert.isDefined(log.verifiedAt)
  })
})
