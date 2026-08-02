import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'
import JobRequest from '#models/job_request'
import type { JobStatus } from '#models/job_request'
import JobDispute from '#models/job_dispute'

const createUser = async (role: 'customer' | 'craftsman' | 'admin') => {
  const email = `${Date.now()}_${role}_${Math.random()}@example.com`
  return await User.create({
    email,
    phoneNormalised: `+90555${Math.floor(1000000 + Math.random() * 9000000)}`,
    passwordHash: 'password',
    role,
    status: 'active',
  })
}

const createCustomer = async () => {
  const user = await createUser('customer')
  await Customer.create({ userId: user.id, fullName: 'Test Customer', language: 'en', smsOptIn: true })
  return user
}

const createCraftsman = async () => {
  const user = await createUser('craftsman')
  await Region.firstOrCreate({ nameEn: 'Test Region' }, { nameEn: 'Test Region', nameTr: 'Test Bölge' })
  const category = await Category.firstOrCreate({ nameEn: 'Test Category' }, { nameEn: 'Test Category', nameTr: 'Test Kategori' })
  await Craftsman.create({
    userId: user.id,
    businessName: 'Test Craftsman',
    categoryId: category.id,
    trustLevel: 1,
    verbalConsent: true,
    totalJobs: 0,
  })
  return user
}

const createAdmin = async () => {
  const user = await createUser('admin')
  await Admin.create({ userId: user.id, fullName: 'Test Admin', clearanceLvl: 3 })
  return user
}

const createJobRequest = async (customerId: number, status: JobStatus = 'in_progress', craftsmanId?: number) => {
  const region = await Region.firstOrCreate({ nameEn: 'Test Region' }, { nameEn: 'Test Region', nameTr: 'Test Bölge' })
  const category = await Category.firstOrCreate({ nameEn: 'Test Category' }, { nameEn: 'Test Category', nameTr: 'Test Kategori' })
  return await JobRequest.create({
    requestId: `REQ-${Date.now()}-${Math.random()}`,
    customerId,
    craftsmanId: craftsmanId,
    categoryId: category.id,
    regionId: region.id,
    description: 'Job description for testing',
    status,
  })
}

test.group('Job Disputes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // Group 1: Disputes - CRUD Operations
  test('GET /disputes - Customer sees their disputes', async ({ client, assert }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.get('/disputes').loginAs(customer)
    response.assertStatus(200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 1)
  })

  test('GET /disputes - Admin sees all disputes', async ({ client, assert }) => {
    const admin = await createAdmin()
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.get('/disputes').loginAs(admin)
    response.assertStatus(200)
    assert.isArray(response.body())
    assert.isAtLeast(response.body().length, 1)
  })

  test('POST /disputes - Customer can open a dispute', async ({ client, assert }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)

    const response = await client.post('/disputes').loginAs(customer).json({
      jobId: job.id,
      reasonCategory: 'workmanship',
      customerNotes: 'The work was not done well.',
    })

    response.assertStatus(201)
    assert.equal(response.body().status, 'OPEN')
    assert.equal(response.body().reasonCategory, 'workmanship')
  })

  test('GET /disputes/:id - Can fetch a single dispute', async ({ client, assert }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.get(`/disputes/${dispute.id}`).loginAs(customer)
    response.assertStatus(200)
    assert.equal(response.body().id, dispute.id)
  })

  test('PATCH /disputes/:id - Admin can resolve a dispute', async ({ client, assert }) => {
    const admin = await createAdmin()
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.patch(`/disputes/${dispute.id}`).loginAs(admin).json({
      adminResolutionNotes: 'Resolved favorably',
      finalJobStatus: 'cancelled',
    })

    response.assertStatus(200)
    assert.equal(response.body().status, 'CLOSED')
    assert.equal(response.body().adminResolutionNotes, 'Resolved favorably')
  })

  test('DELETE /disputes/:id - Returns 501 not implemented', async ({ client }) => {
    const admin = await createAdmin()
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.delete(`/disputes/${dispute.id}`).loginAs(admin)
    response.assertStatus(501)
  })

  // Group 2: Disputes - Authorization & Ownership
  test('Craftsman cannot open disputes', async ({ client }) => {
    const craftsman = await createCraftsman()
    const customer = await createCustomer()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)

    const response = await client.post('/disputes').loginAs(craftsman).json({
      jobId: job.id,
      reasonCategory: 'price',
      customerNotes: 'I am a craftsman trying to dispute',
    })

    response.assertStatus(403)
  })

  test('Customer cannot resolve disputes', async ({ client }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.patch(`/disputes/${dispute.id}`).loginAs(customer).json({
      adminResolutionNotes: 'Customer try',
      finalJobStatus: 'cancelled',
    })

    response.assertStatus(403)
  })

  test("Customer cannot dispute another customer's job", async ({ client }) => {
    const customerA = await createCustomer()
    const customerB = await createCustomer()
    const craftsman = await createCraftsman()
    const jobA = await createJobRequest(customerA.id, 'in_progress', craftsman.id)

    const response = await client.post('/disputes').loginAs(customerB).json({
      jobId: jobA.id,
      reasonCategory: 'price',
      customerNotes: 'Trying to dispute someone else job',
    })

    response.assertStatus(403)
  })

  // Group 3: Disputes - Input Validation
  test('Reject dispute with missing jobId', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client.post('/disputes').loginAs(customer).json({
      reasonCategory: 'price',
      customerNotes: 'Some notes here that are long enough',
    })

    response.assertStatus(422)
  })

  test('Reject dispute with invalid reason category', async ({ client }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)

    const response = await client.post('/disputes').loginAs(customer).json({
      jobId: job.id,
      reasonCategory: 'invalid',
      customerNotes: 'Some notes here that are long enough',
    })

    response.assertStatus(422)
  })

  test('Reject dispute with customerNotes too short', async ({ client }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)

    const response = await client.post('/disputes').loginAs(customer).json({
      jobId: job.id,
      reasonCategory: 'price',
      customerNotes: 'ab',
    })

    response.assertStatus(422)
  })

  test('Reject admin resolution without notes', async ({ client }) => {
    const admin = await createAdmin()
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.patch(`/disputes/${dispute.id}`).loginAs(admin).json({
      finalJobStatus: 'cancelled',
    })

    response.assertStatus(400)
  })

  test('Reject admin resolution with invalid finalJobStatus', async ({ client }) => {
    const admin = await createAdmin()
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'in_progress', craftsman.id)
    const dispute = await JobDispute.create({
      jobId: job.id,
      customerId: customer.id,
      craftsmanId: craftsman.id,
      reasonCategory: 'price',
      customerNotes: 'Test dispute notes here',
      status: 'OPEN',
    })

    const response = await client.patch(`/disputes/${dispute.id}`).loginAs(admin).json({
      adminResolutionNotes: 'Resolved',
      finalJobStatus: 'pending',
    })

    response.assertStatus(400)
  })

  // Group 4: Disputes - Edge Cases
  test('Return 404 for non-existent dispute ID', async ({ client }) => {
    const customer = await createCustomer()

    const response = await client.get('/disputes/999999').loginAs(customer)

    response.assertStatus(404)
  })

  test('Cannot dispute a pending job', async ({ client }) => {
    const customer = await createCustomer()
    const craftsman = await createCraftsman()
    const job = await createJobRequest(customer.id, 'pending', craftsman.id)

    const response = await client.post('/disputes').loginAs(customer).json({
      jobId: job.id,
      reasonCategory: 'price',
      customerNotes: 'Disputing pending job here',
    })

    response.assertStatus(400)
  })
})
