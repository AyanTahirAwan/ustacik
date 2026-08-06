import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'
import JobRequest from '#models/job_request'

async function createTestUsers() {
  const customer = await User.create({ email: 'customer@test.com', phoneNormalised: '+1000000001', passwordHash: 'password123', role: 'customer', status: 'active' })
  await Customer.create({ userId: customer.id, fullName: 'Test Customer', language: 'en', smsOptIn: true })

  const craftsman = await User.create({ email: 'craftsman@test.com', phoneNormalised: '+1000000002', passwordHash: 'password123', role: 'craftsman', status: 'active' })
  const category = await Category.create({ nameEn: 'Plumbing', nameTr: 'Tesisatçı' })
  const region = await Region.create({ nameEn: 'Istanbul', nameTr: 'İstanbul' })
  await Craftsman.create({ userId: craftsman.id, businessName: 'Test Craftsman', categoryId: category.id, trustLevel: 1, verbalConsent: true, totalJobs: 0 })

  const admin = await User.create({ email: 'admin@test.com', phoneNormalised: '+1000000003', passwordHash: 'password123', role: 'admin', status: 'active' })
  await Admin.create({ userId: admin.id, fullName: 'Test Admin', clearanceLvl: 3 })

  return { customer, craftsman, admin, category, region }
}

test.group('Job Requests - CRUD Operations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /api/jobs - Admin can list all job requests', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.get('/api/jobs').loginAs(admin)
    response.assertStatus(200)
    response.assertBodyContains({ jobs: [] })
  })

  test('GET /api/jobs - Customer only sees their own jobs', async ({ client, assert }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const customer2 = await User.create({ email: 'customer2@test.com', phoneNormalised: '+1000000004', passwordHash: 'password123', role: 'customer', status: 'active' })
    await Customer.create({ userId: customer2.id, fullName: 'Test Customer 2', language: 'en', smsOptIn: true })

    await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Test 1', status: 'pending' })
    await JobRequest.create({ requestId: 'REQ-2', customerId: customer2.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Test 2', status: 'pending' })

    const response = await client.get('/api/jobs').loginAs(customer)
    response.assertStatus(200)
    assert.lengthOf(response.body().jobs, 1)
    assert.equal(response.body().jobs[0].description, 'Test 1')
  })

  test('GET /api/jobs - Craftsman only sees assigned jobs', async ({ client }) => {
    const { craftsman } = await createTestUsers()
    const response = await client.get('/api/jobs').loginAs(craftsman)
    response.assertStatus(200)
  })

  test('POST /api/jobs - Customer can create a job request', async ({ client }) => {
    const { customer, craftsman, region } = await createTestUsers()
    const payload = {
      requestId: 'REQ-CREATE-1',
      craftsmanId: craftsman.id,
      regionId: region.id,
      description: 'Need a plumber for my sink',
    }

    const response = await client.post('/api/jobs').json(payload).loginAs(customer)
    response.assertStatus(201)
    response.assertBodyContains({
      job: { status: 'pending', description: 'Need a plumber for my sink' },
    })
  })

  test('POST /api/jobs - Resubmitting the same requestId returns the existing job', async ({ client, assert }) => {
    const { customer, craftsman, region } = await createTestUsers()
    const payload = {
      requestId: 'REQ-IDEMPOTENT-1',
      craftsmanId: craftsman.id,
      regionId: region.id,
      description: 'Need a plumber for my sink',
    }

    const first = await client.post('/api/jobs').json(payload).loginAs(customer)
    const second = await client.post('/api/jobs').json(payload).loginAs(customer)

    first.assertStatus(201)
    second.assertStatus(201)
    assert.equal(first.body().job.id, second.body().job.id)
  })

  test('GET /api/jobs/:id - Can retrieve a specific job', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Need a plumber', status: 'pending' })

    const response = await client.get(`/api/jobs/${job.id}`).loginAs(customer)
    response.assertStatus(200)
    response.assertBodyContains({ job: { description: 'Need a plumber' } })
  })

  test('PATCH /api/jobs/:id/accept - Craftsman can accept a job', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Need a plumber', status: 'pending' })

    const response = await client.patch(`/api/jobs/${job.id}/accept`).loginAs(craftsman)
    response.assertStatus(200)
    response.assertBodyContains({ job: { status: 'accepted' } })
  })

  test('DELETE /api/jobs/:id - Returns 501 not implemented', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.delete('/api/jobs/1').loginAs(admin)
    response.assertStatus(501)
  })
})

test.group('Job Requests - Authorization & Ownership', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Unauthenticated user cannot access jobs', async ({ client }) => {
    const response = await client.get('/api/jobs')
    response.assertRedirectsTo('/login')
  })

  test('Craftsman cannot create job requests', async ({ client }) => {
    const { craftsman, region } = await createTestUsers()
    const payload = {
      requestId: 'REQ-FORBIDDEN-1',
      craftsmanId: craftsman.id,
      regionId: region.id,
      description: 'Testing creation',
    }

    const response = await client.post('/api/jobs').json(payload).loginAs(craftsman)
    response.assertStatus(403)
  })

  test('Customer A cannot view Customer B\'s job', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const customerB = await User.create({ email: 'customerb@test.com', phoneNormalised: '+1000000004', passwordHash: 'password123', role: 'customer', status: 'active' })
    await Customer.create({ userId: customerB.id, fullName: 'Test Customer B', language: 'en', smsOptIn: true })

    const jobB = await JobRequest.create({ requestId: 'REQ-B', customerId: customerB.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job B', status: 'pending' })

    const response = await client.get(`/api/jobs/${jobB.id}`).loginAs(customer)
    response.assertStatus(403)
  })

  test('Craftsman B cannot accept Craftsman A\'s job', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const craftsmanB = await User.create({ email: 'craftsmanb@test.com', phoneNormalised: '+1000000005', passwordHash: 'password123', role: 'craftsman', status: 'active' })
    await Craftsman.create({ userId: craftsmanB.id, businessName: 'Craftsman B', categoryId: category.id, trustLevel: 1, verbalConsent: true, totalJobs: 0 })

    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'pending' })

    const response = await client.patch(`/api/jobs/${job.id}/accept`).loginAs(craftsmanB)
    response.assertStatus(404)
  })

  test('Customer cannot cancel a job once it is in progress', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'in_progress' })

    const response = await client.patch(`/api/jobs/${job.id}/cancel`).loginAs(customer)
    response.assertStatus(403)
  })

  test('Admin can cancel a job even once it is in progress', async ({ client }) => {
    const { customer, craftsman, admin, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'in_progress' })

    const response = await client.patch(`/api/jobs/${job.id}/cancel`).loginAs(admin)
    response.assertStatus(200)
    response.assertBodyContains({ job: { status: 'cancelled' } })
  })
})

test.group('Job Requests - Input Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Reject job with missing required fields', async ({ client }) => {
    const { customer } = await createTestUsers()
    const response = await client.post('/api/jobs').json({}).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject job with description too short', async ({ client }) => {
    const { customer, craftsman, region } = await createTestUsers()
    const payload = {
      requestId: 'REQ-SHORT-DESC',
      craftsmanId: craftsman.id,
      regionId: region.id,
      description: 'abc',
    }

    const response = await client.post('/api/jobs').json(payload).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject job pointed at a non-existent craftsman', async ({ client }) => {
    const { customer, region } = await createTestUsers()
    const payload = {
      requestId: 'REQ-BAD-CRAFTSMAN',
      craftsmanId: 999999,
      regionId: region.id,
      description: 'Need a plumber for my sink',
    }

    const response = await client.post('/api/jobs').json(payload).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject accepting a job that is not pending', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'declined' })

    const response = await client.patch(`/api/jobs/${job.id}/accept`).loginAs(craftsman)
    response.assertStatus(400)
  })
})

test.group('Job Requests - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Return 404 for non-existent job ID', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.get('/api/jobs/999999').loginAs(admin)
    response.assertStatus(404)
  })

  test('Return 404 when accepting a non-existent job', async ({ client }) => {
    const { craftsman } = await createTestUsers()
    const response = await client.patch('/api/jobs/999999/accept').loginAs(craftsman)
    response.assertStatus(404)
  })
})
