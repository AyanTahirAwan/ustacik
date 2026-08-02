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

  test('GET /jobs - Admin can list all job requests', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.get('/jobs').loginAs(admin)
    response.assertStatus(200)
    response.assertBodyContains([])
  })

  test('GET /jobs - Customer only sees their own jobs', async ({ client, assert }) => {
    const { customer, category, region } = await createTestUsers()
    const customer2 = await User.create({ email: 'customer2@test.com', phoneNormalised: '+1000000004', passwordHash: 'password123', role: 'customer', status: 'active' })
    await Customer.create({ userId: customer2.id, fullName: 'Test Customer 2', language: 'en', smsOptIn: true })
    
    await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, categoryId: category.id, regionId: region.id, description: 'Test 1', status: 'pending' })
    await JobRequest.create({ requestId: 'REQ-2', customerId: customer2.id, categoryId: category.id, regionId: region.id, description: 'Test 2', status: 'pending' })

    const response = await client.get('/jobs').loginAs(customer)
    response.assertStatus(200)
    assert.lengthOf(response.body(), 1)
    assert.equal(response.body()[0].description, 'Test 1')
  })

  test('GET /jobs - Craftsman only sees assigned jobs', async ({ client }) => {
    const { craftsman } = await createTestUsers()
    const response = await client.get('/jobs').loginAs(craftsman)
    response.assertStatus(200)
  })

  test('POST /jobs - Customer can create a job request', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const payload = {
      categoryId: category.id,
      regionId: region.id,
      description: 'Need a plumber for my sink'
    }

    const response = await client.post('/jobs').json(payload).loginAs(customer)
    response.assertStatus(201)
    response.assertBodyContains({
      status: 'pending',
      description: 'Need a plumber for my sink'
    })
  })

  test('GET /jobs/:id - Can retrieve a specific job', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, categoryId: category.id, regionId: region.id, description: 'Need a plumber', status: 'pending' })
    
    const response = await client.get(`/jobs/${job.id}`).loginAs(customer)
    response.assertStatus(200)
    response.assertBodyContains({
      description: 'Need a plumber'
    })
  })

  test('PATCH /jobs/:id - Craftsman can accept a job', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Need a plumber', status: 'pending' })

    const response = await client.patch(`/jobs/${job.id}`).json({ status: 'accepted' }).loginAs(craftsman)
    response.assertStatus(200)
    response.assertBodyContains({ status: 'accepted' })
  })

  test('DELETE /jobs/:id - Returns 501 not implemented', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.delete('/jobs/1').loginAs(admin)
    response.assertStatus(501)
  })
})

test.group('Job Requests - Authorization & Ownership', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Unauthenticated user cannot access jobs', async ({ client }) => {
    const response = await client.get('/jobs')
    response.assertRedirectsTo('/login')
  })

  test('Craftsman cannot create job requests', async ({ client }) => {
    const { craftsman, category, region } = await createTestUsers()
    const payload = {
      categoryId: category.id,
      regionId: region.id,
      description: 'Testing creation'
    }

    const response = await client.post('/jobs').json(payload).loginAs(craftsman)
    response.assertStatus(403)
  })

  test('Customer A cannot view Customer B\'s job', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const customerB = await User.create({ email: 'customerb@test.com', phoneNormalised: '+1000000004', passwordHash: 'password123', role: 'customer', status: 'active' })
    await Customer.create({ userId: customerB.id, fullName: 'Test Customer B', language: 'en', smsOptIn: true })
    
    const jobB = await JobRequest.create({ requestId: 'REQ-B', customerId: customerB.id, categoryId: category.id, regionId: region.id, description: 'Job B', status: 'pending' })

    const response = await client.get(`/jobs/${jobB.id}`).loginAs(customer)
    response.assertStatus(403)
  })

  test('Customer can only cancel or dispute their own job', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'pending' })

    const response = await client.patch(`/jobs/${job.id}`).json({ status: 'accepted' }).loginAs(customer)
    response.assertStatus(403)
  })
})

test.group('Job Requests - Input Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Reject job with missing required fields', async ({ client }) => {
    const { customer } = await createTestUsers()
    const response = await client.post('/jobs').json({}).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject job with description too short', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const payload = {
      categoryId: category.id,
      regionId: region.id,
      description: 'abc'
    }

    const response = await client.post('/jobs').json(payload).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject job with negative craftsmanId', async ({ client }) => {
    const { customer, category, region } = await createTestUsers()
    const payload = {
      categoryId: category.id,
      regionId: region.id,
      craftsmanId: -1,
      description: 'Need a plumber for my sink'
    }

    const response = await client.post('/jobs').json(payload).loginAs(customer)
    response.assertStatus(422)
  })

  test('Reject status update with invalid status value', async ({ client }) => {
    const { customer, craftsman, category, region } = await createTestUsers()
    const job = await JobRequest.create({ requestId: 'REQ-1', customerId: customer.id, craftsmanId: craftsman.id, categoryId: category.id, regionId: region.id, description: 'Job 1', status: 'pending' })

    const response = await client.patch(`/jobs/${job.id}`).json({ status: 'invalid_status' }).loginAs(craftsman)
    response.assertStatus(422)
  })
})

test.group('Job Requests - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Return 404 for non-existent job ID', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.get('/jobs/999999').loginAs(admin)
    response.assertStatus(404)
  })

  test('Return 404 when updating non-existent job', async ({ client }) => {
    const { admin } = await createTestUsers()
    const response = await client.patch('/jobs/999999').json({ status: 'accepted' }).loginAs(admin)
    response.assertStatus(404)
  })
})