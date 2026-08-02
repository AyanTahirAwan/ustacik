import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'
import Customer from '#models/customer'
import Craftsman from '#models/craftsman'
import Admin from '#models/admin'
import Category from '#models/category'
import Region from '#models/region'
import JobRequest from '#models/job_request'
import Review from '#models/review'

async function createTestData() {
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

async function createCompletedJob(customerId: number, craftsmanId: number, categoryId: number, regionId: number) {
  return JobRequest.create({ requestId: `REQ-${Date.now()}`, customerId, craftsmanId, categoryId, regionId, description: 'Test completed job', status: 'completed' })
}

test.group('Group 1: Reviews - CRUD Operations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /reviews - Customer sees their reviews', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.get('/reviews').loginAs(data.customer)
    response.assertStatus(200)
    response.assertBodyContains([{ jobId: job.id }])
  })

  test('GET /reviews - Craftsman sees reviews about them', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.get('/reviews').loginAs(data.craftsman)
    response.assertStatus(200)
    response.assertBodyContains([{ jobId: job.id }])
  })

  test('GET /reviews - Admin sees all reviews', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.get('/reviews').loginAs(data.admin)
    response.assertStatus(200)
    response.assertBodyContains([{ jobId: job.id }])
  })

  test('POST /reviews - Customer can submit a review for a completed job', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)

    const response = await client.post('/reviews').json({
      jobId: job.id,
      punctuality: 5,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(201)
    response.assertBodyContains({ punctuality: 5, workmanship: 4 })
  })

  test('GET /reviews/:id - Can fetch a single review', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.get(`/reviews/${review.id}`).loginAs(data.customer)
    response.assertStatus(200)
    response.assertBodyContains({ id: review.id })
  })

  test('PATCH /reviews/:id - Craftsman can reply to their review', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.patch(`/reviews/${review.id}`).json({ reply: 'Thank you' }).loginAs(data.craftsman)
    response.assertStatus(200)
    response.assertBodyContains({ craftsmanReply: 'Thank you' })
  })

  test('DELETE /reviews/:id - Admin can delete a review', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.delete(`/reviews/${review.id}`).loginAs(data.admin)
    response.assertStatus(204)
  })
})

test.group('Group 2: Reviews - Authorization & Ownership', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Craftsman cannot submit reviews', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)

    const response = await client.post('/reviews').json({
      jobId: job.id,
      punctuality: 5,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.craftsman)

    response.assertStatus(403)
  })

  test('Customer cannot reply to a review', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.patch(`/reviews/${review.id}`).json({ reply: 'Nope' }).loginAs(data.customer)
    response.assertStatus(403)
  })

  test('Wrong craftsman cannot reply to review', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const otherCraftsman = await User.create({ email: 'other@test.com', phoneNormalised: '+1000000004', passwordHash: 'password123', role: 'craftsman', status: 'active' })

    const response = await client.patch(`/reviews/${review.id}`).json({ reply: 'Fake' }).loginAs(otherCraftsman)
    response.assertStatus(403)
  })

  test('Non-admin cannot delete reviews', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.delete(`/reviews/${review.id}`).loginAs(data.customer)
    response.assertStatus(403)
  })
})

test.group('Group 3: Reviews - Input Validation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Reject review with missing jobId', async ({ client }) => {
    const data = await createTestData()
    
    const response = await client.post('/reviews').json({
      punctuality: 5,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(422)
  })

  test('Reject review with rating out of range (punctuality: 10)', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)

    const response = await client.post('/reviews').json({
      jobId: job.id,
      punctuality: 10,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(422)
  })

  test('Reject review with rating of 0', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)

    const response = await client.post('/reviews').json({
      jobId: job.id,
      punctuality: 0,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(422)
  })

  test('Reject review on non-completed job', async ({ client }) => {
    const data = await createTestData()
    const pendingJob = await JobRequest.create({ requestId: `REQ-${Date.now()}`, customerId: data.customer.id, craftsmanId: data.craftsman.id, categoryId: data.category.id, regionId: data.region.id, description: 'Pending job', status: 'pending' })

    const response = await client.post('/reviews').json({
      jobId: pendingJob.id,
      punctuality: 5,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(400)
  })

  test('Reject duplicate review for same job', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great' })

    const response = await client.post('/reviews').json({
      jobId: job.id,
      punctuality: 5,
      workmanship: 4,
      priceHonesty: 5,
      communication: 4,
      comment: 'Nice job'
    }).loginAs(data.customer)

    response.assertStatus(400)
  })
})

test.group('Group 4: Reviews - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Return 404 for non-existent review ID', async ({ client }) => {
    const data = await createTestData()
    const response = await client.get('/reviews/999999').loginAs(data.customer)
    response.assertStatus(404)
  })

  test('Craftsman cannot reply twice', async ({ client }) => {
    const data = await createTestData()
    const job = await createCompletedJob(data.customer.id, data.craftsman.id, data.category.id, data.region.id)
    const review = await Review.create({ jobId: job.id, customerId: data.customer.id, craftsmanId: data.craftsman.id, punctuality: 5, workmanship: 5, priceHonesty: 5, communication: 5, comment: 'Great', craftsmanReply: 'First reply' })

    const response = await client.patch(`/reviews/${review.id}`).json({ reply: 'Second reply' }).loginAs(data.craftsman)
    response.assertStatus(400)
  })
})
